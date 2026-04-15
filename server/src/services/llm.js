import groq from './groq.js';
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder.js';

const MODEL = 'llama3-70b-8192';

export async function generateResearchResponse({
  query,
  disease,
  publications,
  clinicalTrials,
  conversationHistory = [],
}) {
  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      query,
      disease,
      publications,
      clinicalTrials,
      conversationHistory
    );

    console.log(`🤖 Calling Groq LLM — model: ${MODEL}`);

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,      // Low temp = factual, consistent
      max_tokens: 2048,
      response_format: { type: 'json_object' }, // Force JSON output
    });

    const rawResponse = completion.choices[0]?.message?.content;
    if (!rawResponse) throw new Error('Empty response from Groq');

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      // If JSON parse fails, wrap in structure
      parsed = {
        conditionOverview: rawResponse,
        keyFindings: [],
        researchSummary: rawResponse,
        clinicalTrialsInsight: '',
        recommendations: [],
        disclaimer: 'This information is for research purposes only.',
        confidence: 'low',
      };
    }

    return {
      success: true,
      response: parsed,
      model: MODEL,
      usage: completion.usage,
    };

  } catch (err) {
    console.error('Groq LLM error:', err.message);

    // Graceful fallback — don't crash, return structured error
    return {
      success: false,
      response: {
        conditionOverview: `Research data retrieved for: ${disease || query}`,
        keyFindings: publications.slice(0, 3).map(p => ({
          insight: p.abstract?.slice(0, 150) || 'See source for details',
          source: p.title,
          year: p.year,
        })),
        researchSummary: 'LLM reasoning temporarily unavailable. Raw research data provided below.',
        clinicalTrialsInsight: clinicalTrials.length > 0
          ? `${clinicalTrials.length} relevant clinical trials found.`
          : 'No clinical trials found.',
        recommendations: ['Please consult a healthcare professional'],
        disclaimer: 'This information is for research purposes only.',
        confidence: 'low',
      },
      error: err.message,
    };
  }
}