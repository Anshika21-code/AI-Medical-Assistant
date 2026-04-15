import axios from 'axios';

const BASE = 'https://api.openalex.org/works';
const EMAIL = process.env.PUBMED_EMAIL || 'curalink@demo.com'; // polite pool

export async function getOpenAlexResults(query, perPage = 100) {
  try {
    const currentYear = new Date().getFullYear();
    const fromYear = currentYear - 5; // last 5 years for recency

    const [relevanceResults, recentResults] = await Promise.all([
      // Pool 1 — by relevance
      axios.get(BASE, {
        params: {
          search: query,
          'per-page': Math.floor(perPage / 2),
          page: 1,
          sort: 'relevance_score:desc',
          filter: `from_publication_date:${fromYear}-01-01`,
          mailto: EMAIL,
        }
      }),
      // Pool 2 — by recency
      axios.get(BASE, {
        params: {
          search: query,
          'per-page': Math.floor(perPage / 2),
          page: 1,
          sort: 'publication_date:desc',
          filter: `from_publication_date:${fromYear}-01-01`,
          mailto: EMAIL,
        }
      })
    ]);

    const combined = [
      ...(relevanceResults.data?.results || []),
      ...(recentResults.data?.results || [])
    ];

    // Deduplicate by ID
    const seen = new Set();
    const unique = combined.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    return unique.map(work => {
      const authors = (work.authorships || [])
        .slice(0, 5)
        .map(a => a?.author?.display_name)
        .filter(Boolean);

      const abstract = work.abstract_inverted_index
        ? reconstructAbstract(work.abstract_inverted_index)
        : '';

      return {
        id: `openalex_${work.id}`,
        title: work.display_name || work.title || 'No title',
        abstract: abstract.slice(0, 800),
        authors,
        year: work.publication_year || null,
        source: 'OpenAlex',
        url: work.primary_location?.landing_page_url || work.id,
        citationCount: work.cited_by_count || 0,
      };
    }).filter(p => p.title && p.abstract);

  } catch (err) {
    console.error('OpenAlex error:', err.message);
    return [];
  }
}

// OpenAlex stores abstracts as inverted index — reconstruct it
function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return '';
  const words = {};
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) words[pos] = word;
  }
  return Object.keys(words)
    .sort((a, b) => a - b)
    .map(k => words[k])
    .join(' ');
}