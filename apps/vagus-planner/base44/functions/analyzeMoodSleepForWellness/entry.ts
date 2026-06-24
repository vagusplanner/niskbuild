import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch mood and sleep data
    const [mood, sleep, energy] = await Promise.all([
      base44.entities.Mood.list('-created_date', 14),
      base44.entities.Sleep.list('-created_date', 14),
      base44.entities.EnergyLog.list('-created_date', 14)
    ]);

    // Analyze patterns
    const avgMood = mood.length > 0 
      ? mood.reduce((acc, m) => acc + m.mood_rating, 0) / mood.length 
      : 5;
    const avgSleep = sleep.length > 0 
      ? sleep.reduce((acc, s) => acc + (s.hours_slept || 0), 0) / sleep.length 
      : 7;
    const poorSleepDays = sleep.filter(s => s.quality === 'poor' || (s.hours_slept || 0) < 6).length;
    const lowMoodDays = mood.filter(m => m.mood_rating < 5).length;

    const context = `
User Wellness Data (Last 2 Weeks):

MOOD PATTERNS:
- Mood logs: ${mood.length} entries
- Average mood: ${avgMood.toFixed(1)}/10
- Low mood days: ${lowMoodDays}
- Recent mood ratings: ${mood.slice(0, 7).map(m => m.mood_rating).join(', ')}
- Energy levels: ${mood.slice(0, 7).map(m => m.energy_level || 'N/A').join(', ')}

SLEEP PATTERNS:
- Sleep logs: ${sleep.length} entries
- Average sleep: ${avgSleep.toFixed(1)} hours
- Poor sleep days: ${poorSleepDays}
- Sleep quality: ${sleep.slice(0, 7).map(s => s.quality || 'N/A').join(', ')}
- Recent sleep hours: ${sleep.slice(0, 7).map(s => s.hours_slept || 0).join(', ')}

CORRELATIONS:
${mood.length > 0 && sleep.length > 0 ? 
  `- Days with poor sleep often correlate with lower mood ratings` : 
  '- Insufficient data for correlation analysis'}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a wellness psychologist specializing in stress management and sleep optimization. Analyze this user's mood and sleep data to provide actionable recommendations.

${context}

Provide analysis in JSON format:
{
  "analysis": {
    "mood_assessment": "Overall mood assessment",
    "sleep_assessment": "Overall sleep quality assessment",
    "key_concerns": ["Concern 1", "Concern 2"],
    "positive_patterns": ["Pattern 1", "Pattern 2"],
    "stress_management_techniques": [
      {
        "technique": "Deep Breathing",
        "description": "How to practice it",
        "when_to_use": "Before bed, during stress",
        "duration_minutes": 5,
        "difficulty": "easy"
      }
    ],
    "sleep_improvement_strategies": [
      {
        "strategy": "Sleep Schedule",
        "description": "Specific advice",
        "expected_impact": "high",
        "timeframe": "1-2 weeks"
      }
    ],
    "immediate_actions": ["Action 1", "Action 2", "Action 3"],
    "lifestyle_adjustments": ["Adjustment 1", "Adjustment 2"]
  }
}

Focus on:
- Evidence-based techniques
- Practical, actionable advice
- Addressing specific patterns observed
- Progressive implementation`,
      response_json_schema: {
        type: "object",
        properties: {
          analysis: {
            type: "object",
            properties: {
              mood_assessment: { type: "string" },
              sleep_assessment: { type: "string" },
              key_concerns: { type: "array", items: { type: "string" } },
              positive_patterns: { type: "array", items: { type: "string" } },
              stress_management_techniques: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    technique: { type: "string" },
                    description: { type: "string" },
                    when_to_use: { type: "string" },
                    duration_minutes: { type: "number" },
                    difficulty: { type: "string" }
                  }
                }
              },
              sleep_improvement_strategies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    strategy: { type: "string" },
                    description: { type: "string" },
                    expected_impact: { type: "string" },
                    timeframe: { type: "string" }
                  }
                }
              },
              immediate_actions: { type: "array", items: { type: "string" } },
              lifestyle_adjustments: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: response.analysis || {}
    });

  } catch (error) {
    console.error('Mood/sleep analysis error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});