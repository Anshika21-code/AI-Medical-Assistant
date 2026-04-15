/**
 * Builds structured prompts for the LLM
 * Takes ranked research data + user context → clean prompt
 */

export function buildSystemPrompt() {
  return `You are Curalink, an AI-powered medical research assistant. 
Your job is to analyze peer-reviewed publications and clinical trials and provide structured, accurate, research-backed answers.

STRICT RULES:
- Never hallucinate or invent medical facts
- Always base answers on the provided research context
- If research context is insufficient, say so clearly
- Do not give personal medical advice
- Always recommend consulting a healthcare professional

OUTPUT FORMAT (always follow this JSON structure):
{
  "conditionOverview": "Brief overview of the condition and query (2-3 sentences)",
  "keyFindings": [
    {
      "insight": "Key finding from research",
      "source": "Paper title or trial name",
      "year": 2024
    }
  ],
  "researchSummary": "Detailed synthesis of research findings (3-4 paragraphs)",
  "clinicalTrialsInsight": "Summary of relevant clinical trials and what they mean for patients",
  "recommendations": [
    "Evidence-based recommendation 1",
    "Evidence-based recommendation 2"
  ],
  "disclaimer": "Always include: This information is for research purposes only. Consult a qualified healthcare professional before making any medical decisions.",
  "confidence": "high | medium | low based on quality of available research"
}`;
}

export function buildUserPrompt(query, disease, publications, clinicalTrials, conversationHistory = []) {
  // Format publications for context
  const pubContext = publications.map((pub, i) => `
[Publication ${i + 1}]
Title: ${pub.title}
Authors: ${pub.authors?.join(', ') || 'Unknown'}
Year: ${pub.year || 'Unknown'}
Source: ${pub.source}
Abstract: ${pub.abstract}
URL: ${pub.url}
`).join('\n---\n');

  // Format clinical trials for context
  const trialContext = clinicalTrials.map((trial, i) => `
[Clinical Trial ${i + 1}]
Title: ${trial.title}
Status: ${trial.status}
Phase: ${trial.phase || 'Not specified'}
Location: ${trial.location}
Eligibility: ${trial.eligibilityCriteria?.slice(0, 300) || 'Not specified'}
URL: ${trial.url}
`).join('\n---\n');

  // Format conversation history for context awareness
  const historyContext = conversationHistory.length > 0
    ? `\nPREVIOUS CONVERSATION:\n${conversationHistory.slice(-4).map(m =>
        `${m.role.toUpperCase()}: ${m.content}`
      ).join('\n')}\n`
    : '';

  return `${historyContext}
CURRENT USER QUERY: "${query}"
DISEASE/CONDITION: ${disease || 'General medical query'}

RESEARCH CONTEXT:
=== PUBLICATIONS (${publications.length} papers) ===
${pubContext || 'No publications found'}

=== CLINICAL TRIALS (${clinicalTrials.length} trials) ===
${trialContext || 'No clinical trials found'}

Based on this research context, provide a comprehensive, structured response in the exact JSON format specified. 
Focus on: what the research says, key findings, clinical trial opportunities, and evidence-based insights.
Do NOT add information beyond what the research context provides.`;
}