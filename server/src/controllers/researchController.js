import { expandQuery } from '../services/queryExpander.js';
import { getPubMedResults } from '../services/pubmed.js';
import { getOpenAlexResults } from '../services/openAlex.js';
import { getClinicalTrials } from '../services/clinicalTrials.js';
import { rankPublications, rankClinicalTrials } from '../services/ranker.js';

export async function searchResearch(req, res) {
  try {
    const { query, disease = '', location = '' } = req.query;
    if (!query) return res.status(400).json({ error: 'query is required' });

    const { expanded, base } = expandQuery(query, disease, location);
    console.log(` Expanded query: "${expanded}"`);

    // Fetch all 3 sources in parallel
    const [pubmedRaw, openAlexRaw, trialsRaw] = await Promise.all([
      getPubMedResults(expanded, 80),
      getOpenAlexResults(expanded, 100),
      getClinicalTrials(disease || query, query, 40),
    ]);

    console.log(` Raw pool — PubMed: ${pubmedRaw.length}, OpenAlex: ${openAlexRaw.length}, Trials: ${trialsRaw.length}`);

    // Merge publications + rank
    const allPublications = [...pubmedRaw, ...openAlexRaw];
    const topPublications = rankPublications(allPublications, query, disease, 8)
  .map(({ _score, ...pub }) => ({   // _score frontend ko nahi chahiye
    ...pub,
    abstract: pub.abstract?.slice(0, 300) // 800 → 300 chars
  }));
    const topTrials = rankClinicalTrials(trialsRaw, disease || query, 6)
  .map(({ _score, ...trial }) => ({
    ...trial,
    eligibilityCriteria: trial.eligibilityCriteria?.slice(0, 200)
  }));

    console.log(` Final — Publications: ${topPublications.length}, Trials: ${topTrials.length}`);

    res.json({
      query: expanded,
      disease,
      location,
      totalPool: allPublications.length,
      publications: topPublications,
      clinicalTrials: topTrials,
    });

  } catch (err) {
    console.error('Research search error:', err);
    res.status(500).json({ error: 'Research fetch failed', details: err.message });
  }
}