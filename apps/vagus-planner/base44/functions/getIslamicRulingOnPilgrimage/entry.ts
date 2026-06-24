import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, pilgrimage_type = 'hajj', user_language = 'en' } = await req.json();

    const ruling = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an Islamic scholar providing guidance on Hajj/Umrah related questions.

User's Question: "${question}"
Pilgrimage Type: ${pilgrimage_type}
Language: ${user_language}

Provide a comprehensive Islamic ruling in JSON format:
{
  "question": "${question}",
  "ruling_category": "ritual|health|etiquette|preparation|financial|other",
  "answer": "Clear, accurate answer based on Islamic jurisprudence",
  "evidence": [
    {
      "source": "Quran verse reference or Hadith or scholarly consensus",
      "text": "relevant quote",
      "interpretation": "what this means for the pilgrimage"
    }
  ],
  "different_schools": [
    {
      "school": "Hanafi|Maliki|Shafi'i|Hanbali",
      "opinion": "this school's opinion",
      "reasoning": "why they hold this view"
    }
  ],
  "practical_application": "How to apply this ruling in practice",
  "related_rulings": ["other related rulings that might be helpful"],
  "precautions": "any precautions to take",
  "exceptions": "any exceptions or special circumstances",
  "further_consultation": "if scholar consultation needed, when and why",
  "confidence_level": "very_confident|confident|moderate|requires_consultation"
}

Ensure accuracy. If unsure, recommend consulting with a qualified Islamic scholar.`,
      response_json_schema: {
        type: "object",
        properties: {
          question: { type: "string" },
          ruling_category: { type: "string" },
          answer: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                source: { type: "string" },
                text: { type: "string" },
                interpretation: { type: "string" }
              }
            }
          },
          different_schools: {
            type: "array",
            items: {
              type: "object",
              properties: {
                school: { type: "string" },
                opinion: { type: "string" },
                reasoning: { type: "string" }
              }
            }
          },
          practical_application: { type: "string" },
          related_rulings: { type: "array", items: { type: "string" } },
          precautions: { type: "string" },
          exceptions: { type: "string" },
          further_consultation: { type: "string" },
          confidence_level: { type: "string" }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      query: question,
      pilgrimage_type,
      language: user_language,
      ...ruling,
      answered_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Islamic ruling fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});