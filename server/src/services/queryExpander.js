/**
 * Expands a raw user query into a rich search string
 * combining disease context + intent keywords
 */
export function expandQuery(query, disease = '', location = '') {
  const intentKeywords = extractIntent(query);
  
  // Merge disease + query intelligently, avoid duplication
  const base = disease && !query.toLowerCase().includes(disease.toLowerCase())
    ? `${disease} ${query}`
    : query;

  const expanded = [base, ...intentKeywords].join(' ').trim();

  return {
    expanded,          // e.g. "Parkinson's disease deep brain stimulation treatment"
    base,              // e.g. "Parkinson's disease deep brain stimulation"
    disease: disease || extractDisease(query),
    location,
  };
}

function extractIntent(query) {
  const q = query.toLowerCase();
  const intents = [];

  if (q.includes('treatment') || q.includes('therapy')) intents.push('treatment outcomes');
  if (q.includes('clinical trial')) intents.push('randomized controlled trial');
  if (q.includes('latest') || q.includes('recent') || q.includes('new')) intents.push('2023 2024 2025');
  if (q.includes('researcher') || q.includes('expert')) intents.push('research findings');
  if (q.includes('drug') || q.includes('medication')) intents.push('pharmacological intervention');
  if (q.includes('surgery') || q.includes('surgical')) intents.push('surgical procedure outcomes');

  return intents;
}

function extractDisease(query) {
  // Simple extraction — Phase 3 LLM will do this smarter
  const diseases = [
    'cancer', 'diabetes', 'alzheimer', 'parkinson', 'heart disease',
    'lung cancer', 'breast cancer', 'covid', 'hypertension', 'stroke'
  ];
  const q = query.toLowerCase();
  return diseases.find(d => q.includes(d)) || '';
}