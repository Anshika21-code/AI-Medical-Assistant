import { expandQuery } from '../services/queryExpander.js';
import { getPubMedResults } from '../services/pubmed.js';
import { getOpenAlexResults } from '../services/openAlex.js';
import { getClinicalTrials } from '../services/clinicalTrials.js';
import { rankPublications, rankClinicalTrials } from '../services/ranker.js';
import { generateResearchResponse } from '../services/llm.js';

export async function searchResearch(req, res) {
  try {
    const { query, disease = '', location = '', sessionId = null } = req.query;
    if (!query) return res.status(400).json({ error: 'query is required' });

    const { expanded } = expandQuery(query, disease, location);
    console.log(`🔍 Expanded query: "${expanded}"`);

    // Step 1 — Fetch all sources in parallel
    const [pubmedRaw, openAlexRaw, trialsRaw] = await Promise.all([
      getPubMedResults(expanded, 80),
      getOpenAlexResults(expanded, 100),
      getClinicalTrials(disease || query, query, 40),
    ]);

    console.log(` Raw pool — PubMed: ${pubmedRaw.length}, OpenAlex: ${openAlexRaw.length}, Trials: ${trialsRaw.length}`);

    // Step 2 — Rank and filter
    const allPublications = [...pubmedRaw, ...openAlexRaw];
    const topPublications = rankPublications(allPublications, query, disease, 8)
      .map(({ _score, ...pub }) => ({
        ...pub,
        abstract: pub.abstract?.slice(0, 400),
      }));

    const topTrials = rankClinicalTrials(trialsRaw, disease || query, 6)
      .map(({ _score, ...trial }) => ({
        ...trial,
        eligibilityCriteria: trial.eligibilityCriteria?.slice(0, 300),
      }));

    console.log(` Ranked — Publications: ${topPublications.length}, Trials: ${topTrials.length}`);

    // Step 3 — LLM reasoning
    const llmResult = await generateResearchResponse({
      query,
      disease,
      publications: topPublications,
      clinicalTrials: topTrials,
      conversationHistory: [], // Phase 4 mein fill hoga
    });

    // Step 4 — Send structured response
    res.json({
      query: expanded,
      disease,
      location,
      totalPool: allPublications.length,
      publications: topPublications,
      clinicalTrials: topTrials,
      aiResponse: llmResult.response,
      model: llmResult.model,
      success: llmResult.success,
    });

  } catch (err) {
    console.error('Research search error:', err);
    res.status(500).json({ error: 'Research fetch failed', details: err.message });
  }
}