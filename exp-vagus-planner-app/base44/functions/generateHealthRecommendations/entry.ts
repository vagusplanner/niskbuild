import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recent health data
    const [nutrition, exercise, mood, sleep, periods] = await Promise.all([
      base44.entities.Nutrition.list('-created_date', 7),
      base44.entities.Exercise.list('-created_date', 7),
      base44.entities.Mood.list('-created_date', 7),
      base44.entities.Sleep.list('-created_date', 7),
      base44.entities.Period.list('-start_date', 3)
    ]);

    // Build context for AI
    const healthContext = `
User Health Data Summary:
- Nutrition logs (last 7 days): ${nutrition.length} entries
- Exercise sessions (last 7 days): ${exercise.length} entries
- Mood logs (last 7 days): ${mood.length} entries (avg: ${mood.length > 0 ? (mood.reduce((acc, m) => acc + m.mood_rating, 0) / mood.length).toFixed(1) : 'N/A'}/10)
- Sleep logs (last 7 days): ${sleep.length} entries (avg: ${sleep.length > 0 ? (sleep.reduce((acc, s) => acc + (s.hours_slept || 0), 0) / sleep.length).toFixed(1) : 'N/A'}h)
- Period tracking: ${periods.length} cycles tracked

Recent patterns:
${exercise.length > 0 ? `- Exercise: ${exercise.slice(0, 3).map(e => `${e.activity_type} (${e.duration}min)`).join(', ')}` : '- No recent exercise logged'}
${mood.length > 0 ? `- Mood trend: ${mood.slice(0, 3).map(m => `${m.mood_rating}/10 (${m.energy_level})`).join(', ')}` : '- No recent mood logs'}
${sleep.length > 0 ? `- Sleep quality: ${sleep.slice(0, 3).map(s => `${s.hours_slept}h (${s.quality})`).join(', ')}` : '- No recent sleep logs'}
`;

    // Use AI to generate recommendations
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a health and wellness coach. Based on this user's health data, provide 3-5 specific, actionable health recommendations.

${healthContext}

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "category": "nutrition|exercise|sleep|mood|general",
      "title": "Brief title",
      "description": "Specific actionable advice",
      "priority": "high|medium|low",
      "icon": "relevant icon name from lucide-react"
    }
  ]
}

Focus on:
1. Addressing any concerning patterns or gaps
2. Balancing different health aspects
3. Realistic, achievable actions
4. Personalized to their data patterns`,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string" },
                icon: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: response.recommendations || []
    });

  } catch (error) {
    console.error('Health recommendations error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});