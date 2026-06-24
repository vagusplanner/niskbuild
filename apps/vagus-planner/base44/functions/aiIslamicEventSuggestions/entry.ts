import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hijri_day, hijri_month, hijri_year } = await req.json();

    // Get AI context for Islamic date - CONCISE VERSION
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a brief, accurate summary for Islamic date ${hijri_day} ${getHijriMonthName(hijri_month)} ${hijri_year} AH.
Be concise. Return only essential information in JSON:
{
  "significance": "1-2 sentence summary of this date's importance",
  "practice": "Primary recommended practice (1 sentence)",
  "dois": ["1-2 short duas"],
  "fasting": "Fasting recommendation if applicable",
  "event_type": "ramadan|hajj_phase|eid|mawlid|ashura|sacred_month|regular",
  "key_action": "Most important thing to do today (1 sentence)"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          date_significance: { type: 'string' },
          religious_context: { type: 'string' },
          recommendations: { type: 'array', items: { type: 'string' } },
          dua_suggestions: { type: 'array', items: { type: 'string' } },
          historical_events: { type: 'string' },
          fasting_status: { type: 'string' },
          special_night: { type: 'string' },
          event_type: { type: 'string' },
          suggested_activities: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getHijriMonthName(month) {
  const months = [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah'
  ];
  return months[month - 1] || '';
}