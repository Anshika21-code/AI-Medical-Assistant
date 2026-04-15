import { expandQuery } from "../services/queryExpander.js";
import { fetchPubMed } from "../services/pubmed.js";
import { fetchOpenAlex } from "../services/openAlex.js";
import { fetchClinicalTrials } from "../services/clinicalTrials.js";
import { rankPublications, rankClinicalTrials } from "../services/ranker.js";

export const getResearchDataInternal = async (query, disease) => {
  const expandedQuery = expandQuery(query, disease);

  const [pubmedRaw, openAlexRaw, trialsRaw] = await Promise.all([
    fetchPubMed(expandedQuery, 50),
    fetchOpenAlex(expandedQuery, 50),
    fetchClinicalTrials(disease || query, 50),
  ]);

  const allPublications = [...pubmedRaw, ...openAlexRaw];

  const topPublications = rankPublications(allPublications, query, disease, 8)
    .map(({ _score, ...pub }) => pub);

  const topTrials = rankClinicalTrials(trialsRaw, disease || query, 6)
    .map(({ _score, ...trial }) => trial);

  return {
    publications: topPublications,
    trials: topTrials,
  };
};