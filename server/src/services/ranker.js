/**
 * Ranks publications from a pool of 50-300 down to top N
 * Scoring factors: relevance (keyword match), recency, citation count
 */
export function rankPublications(publications, query, disease, topN = 8) {
  const queryTerms = tokenize(`${query} ${disease}`);
  const currentYear = new Date().getFullYear();

  const scored = publications.map(pub => {
    let score = 0;

    // 1. Relevance — keyword match in title + abstract
    const text = tokenize(`${pub.title} ${pub.abstract}`);
    const matchCount = queryTerms.filter(t => text.includes(t)).length;
    score += (matchCount / queryTerms.length) * 50; // max 50 pts

    // 2. Recency — newer = better (max 30 pts)
    if (pub.year) {
      const age = currentYear - pub.year;
      score += Math.max(0, 30 - age * 3);
    }

    // 3. Citation count — credibility signal (max 20 pts)
    if (pub.citationCount > 0) {
      score += Math.min(20, Math.log10(pub.citationCount + 1) * 7);
    }

    // 4. Title match bonus — exact disease/query in title
    const titleLower = pub.title.toLowerCase();
    if (disease && titleLower.includes(disease.toLowerCase())) score += 10;
    if (query && titleLower.includes(query.toLowerCase().split(' ')[0])) score += 5;

    return { ...pub, _score: Math.round(score) };
  });

  // Sort descending, deduplicate by title similarity, take top N
  return scored
    .sort((a, b) => b._score - a._score)
    .filter(deduplicateByTitle)
    .slice(0, topN);
}

export function rankClinicalTrials(trials, disease, topN = 6) {
  const scored = trials.map(trial => {
    let score = 0;

    // Recruiting trials rank higher
    if (trial.status === 'RECRUITING') score += 40;
    else if (trial.status === 'COMPLETED') score += 20;

    // Phase 3/4 > Phase 2 > Phase 1
    if (trial.phase === 'PHASE3' || trial.phase === 'PHASE4') score += 30;
    else if (trial.phase === 'PHASE2') score += 20;
    else if (trial.phase === 'PHASE1') score += 10;

    // Has contact info = more actionable
    if (trial.contact?.email || trial.contact?.phone) score += 15;

    // Has location info
    if (trial.location && trial.location !== 'Not specified') score += 10;

    // Disease match in title
    if (disease && trial.title.toLowerCase().includes(disease.toLowerCase())) score += 20;

    return { ...trial, _score: score };
  });

  return scored
    .sort((a, b) => b._score - a._score)
    .slice(0, topN);
}

// ---- Helpers ----

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
}

const seen = new Set();
function deduplicateByTitle(pub) {
  const key = pub.title.toLowerCase().slice(0, 60);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

const STOPWORDS = new Set([
  'with', 'that', 'this', 'from', 'have', 'been', 'were', 'they',
  'their', 'than', 'more', 'also', 'when', 'after', 'study', 'using',
  'based', 'results', 'patients', 'between', 'analysis', 'effects'
]);