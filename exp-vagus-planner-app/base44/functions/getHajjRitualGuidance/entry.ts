import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ritual_type, user_language = 'en', mobility_level = 'normal' } = await req.json();

    const ritualGuide = await base44.integrations.Core.InvokeLLM({
      prompt: `Provide comprehensive step-by-step guidance for performing the ${ritual_type} during Hajj/Umrah.

User's mobility level: ${mobility_level} (normal/elderly/disabled)
Language preference: ${user_language}

Create detailed guidance with this JSON structure:
{
  "ritual": "${ritual_type}",
  "overview": "Brief overview of the ritual",
  "spiritual_significance": "Why this ritual is important spiritually",
  "prerequisites": ["things to do before starting"],
  "step_by_step_guide": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed description",
      "duration": "estimated time",
      "key_points": ["important points"],
      "common_mistakes": ["mistakes to avoid"],
      "accessibility_note": "note for mobility level"
    }
  ],
  "duas": [
    {
      "occasion": "when to recite",
      "arabic": "dua in arabic",
      "transliteration": "transliteration",
      "translation": "english translation",
      "timing": "when to say it"
    }
  ],
  "important_rules": [
    {
      "rule": "rule description",
      "consequence": "if broken, what happens",
      "how_to_comply": "how to follow it"
    }
  ],
  "safety_tips": ["safety considerations"],
  "crowd_management": ["how to navigate crowds"],
  "what_to_bring": ["items needed for this ritual"],
  "estimated_duration": "total time needed",
  "nearby_facilities": ["facilities available - restrooms, water stations, etc"],
  "post_ritual_guidance": "what to do after completing ritual"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          ritual: { type: "string" },
          overview: { type: "string" },
          spiritual_significance: { type: "string" },
          prerequisites: { type: "array", items: { type: "string" } },
          step_by_step_guide: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step: { type: "number" },
                title: { type: "string" },
                description: { type: "string" },
                duration: { type: "string" },
                key_points: { type: "array", items: { type: "string" } },
                common_mistakes: { type: "array", items: { type: "string" } },
                accessibility_note: { type: "string" }
              }
            }
          },
          duas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                occasion: { type: "string" },
                arabic: { type: "string" },
                transliteration: { type: "string" },
                translation: { type: "string" },
                timing: { type: "string" }
              }
            }
          },
          important_rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                rule: { type: "string" },
                consequence: { type: "string" },
                how_to_comply: { type: "string" }
              }
            }
          },
          safety_tips: { type: "array", items: { type: "string" } },
          crowd_management: { type: "array", items: { type: "string" } },
          what_to_bring: { type: "array", items: { type: "string" } },
          estimated_duration: { type: "string" },
          nearby_facilities: { type: "array", items: { type: "string" } },
          post_ritual_guidance: { type: "string" }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      ritual_type,
      user_language,
      mobility_level,
      ...ritualGuide,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ritual guidance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});