import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL = 'curalink';
const EMAIL = process.env.PUBMED_EMAIL || 'curalink@demo.com';

// Step 1 — Search: get IDs
async function searchPubMed(query, retmax = 80) {
  const url = `${BASE}/esearch.fcgi`;
  const { data } = await axios.get(url, {
    params: {
      db: 'pubmed',
      term: query,
      retmax,
      sort: 'pub date',
      retmode: 'json',
      tool: TOOL,
      email: EMAIL,
    }
  });
  return data.esearchresult?.idlist || [];
}

// Step 2 — Fetch: get full details by IDs
async function fetchPubMedDetails(ids) {
  if (!ids.length) return [];

  const url = `${BASE}/efetch.fcgi`;
  const { data } = await axios.get(url, {
    params: {
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'xml',
      tool: TOOL,
      email: EMAIL,
    }
  });

  const parsed = await parseStringPromise(data, { explicitArray: false });
  const articles = parsed?.PubmedArticleSet?.PubmedArticle;
  if (!articles) return [];

  const list = Array.isArray(articles) ? articles : [articles];

  return list.map(article => {
    const med = article?.MedlineCitation;
    const art = med?.Article;
    const pmid = med?.PMID?._ || med?.PMID || '';
    const title = art?.ArticleTitle?._ || art?.ArticleTitle || 'No title';

    // Abstract
    const abstractRaw = art?.Abstract?.AbstractText;
    let abstract = '';
    if (typeof abstractRaw === 'string') abstract = abstractRaw;
    else if (Array.isArray(abstractRaw)) abstract = abstractRaw.map(a => a?._ || a).join(' ');
    else if (abstractRaw?._) abstract = abstractRaw._;

    // Authors
    const authorList = art?.AuthorList?.Author;
    const authors = authorList
      ? (Array.isArray(authorList) ? authorList : [authorList])
          .map(a => `${a.ForeName || ''} ${a.LastName || ''}`.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];

    // Year
    const year = med?.Article?.Journal?.JournalIssue?.PubDate?.Year
      || med?.DateCompleted?.Year
      || null;

    return {
      id: `pubmed_${pmid}`,
      title,
      abstract: abstract.slice(0, 800),
      authors,
      year: year ? parseInt(year) : null,
      source: 'PubMed',
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      citationCount: 0, // PubMed doesn't return this
    };
  }).filter(p => p.title && p.abstract);
}

export async function getPubMedResults(query, retmax = 80) {
  try {
    const ids = await searchPubMed(query, retmax);
    if (!ids.length) return [];
    // Fetch in batches of 20 to avoid URL length issues
    const batches = [];
    for (let i = 0; i < ids.length; i += 20) {
      batches.push(ids.slice(i, i + 20));
    }
    const results = await Promise.all(batches.map(batch => fetchPubMedDetails(batch)));
    return results.flat();
  } catch (err) {
    console.error('PubMed error:', err.message);
    return [];
  }
}