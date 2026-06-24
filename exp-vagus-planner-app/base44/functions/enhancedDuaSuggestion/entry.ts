import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current emotional and spiritual state
    const recentMoods = await base44.entities.Mood.filter({}, '-date', 5);
    const currentGoals = await base44.entities.Goal.filter({ status: 'active' });
    const activeChallenges = await base44.entities.Challenge.filter({ status: 'active' });
    const userSettings = await base44.entities.UserSettings.list();

    // Determine current time-based occasion
    const currentHour = new Date().getHours();
    const timeBased = {
      fajr: { start: 4, end: 7, theme: 'morning', occasion: 'morning' },
      dhuhr: { start: 11, end: 15, theme: 'midday', occasion: 'after_prayer' },
      asr: { start: 15, end: 18, theme: 'afternoon', occasion: 'after_prayer' },
      maghrib: { start: 18, end: 20, theme: 'sunset', occasion: 'eating' },
      isha: { start: 20, end: 23, theme: 'night', occasion: 'before_sleep' }
    };

    let selectedOccasion = 'general';
    for (const [prayer, times] of Object.entries(timeBased)) {
      if (currentHour >= times.start && currentHour < times.end) {
        selectedOccasion = times.occasion;
        break;
      }
    }

    // Analyze emotional state
    const emotionalState = recentMoods.length > 0 
      ? {
          primary_mood: recentMoods[0]?.mood_type,
          stress_level: recentMoods[0]?.stress_level,
          energy_level: recentMoods[0]?.energy_level,
          recent_emotions: recentMoods.map(m => m.mood_type).join(', ')
        }
      : { primary_mood: 'neutral', stress_level: 5, energy_level: 5 };

    // Get base duas for the time
    const baseDuas = await base44.entities.DailyDua.filter({
      occasion: selectedOccasion
    });

    if (baseDuas.length === 0) {
      // Fallback: get general duas if no specific ones found
      const generalDuas = await base44.entities.DailyDua.filter({ occasion: 'general' });
      
      if (generalDuas.length === 0) {
        return Response.json({
          success: false,
          message: 'No duas available. Please add some duas to your collection first.',
          duas: []
        });
      }
      
      baseDuas.push(...generalDuas);
    }

    // Use AI to select and contextualize the most relevant duas
    const goalContext = currentGoals.length > 0 
      ? `User's goals: ${currentGoals.map(g => g.title).join(', ')}`
      : 'User is seeking guidance';

    const challengeContext = activeChallenges.length > 0
      ? `Current challenges: ${activeChallenges.map(c => c.title).join(', ')}`
      : 'Open to all spiritual support';

    const duasText = baseDuas.map(d => `${d.title}: ${d.english_translation}`).join('\n');

    // Get AI recommendations
    const recommendations = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a compassionate Islamic guide helping someone select the most spiritually appropriate duas for their current state.

Current Context:
- Time of Day: ${selectedOccasion}
- Emotional State: ${emotionalState.primary_mood} (Stress: ${emotionalState.stress_level}/10, Energy: ${emotionalState.energy_level}/10)
- Recent Emotions: ${emotionalState.recent_emotions}
- ${goalContext}
- ${challengeContext}

Available Duas:
${duasText}

Task: Select and rank the top 3 duas that are most spiritually beneficial and emotionally appropriate for this person RIGHT NOW. Consider their emotional state, spiritual needs, and the time of day.

For each dua, explain why it's particularly relevant to their current situation in 1-2 compassionate sentences.

Return as JSON with:
{
  "primary_recommendation": {
    "index": 0,
    "why_now": "Why this is most appropriate now",
    "spiritual_benefit": "What spiritual benefit they'll gain"
  },
  "secondary_recommendations": [
    {
      "index": number,
      "why_now": "Why this is appropriate",
      "spiritual_benefit": "Spiritual benefit"
    }
  ],
  "personalized_guidance": "Brief guidance on approaching these duas with their current state in mind",
  "emotional_resonance": "How these duas address their emotional/spiritual needs"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          primary_recommendation: { type: 'object' },
          secondary_recommendations: { type: 'array' },
          personalized_guidance: { type: 'string' },
          emotional_resonance: { type: 'string' }
        }
      }
    });

    // Map recommendations back to actual duas
    const selectedDuas = [];
    
    if (recommendations.primary_recommendation?.index !== undefined) {
      const idx = recommendations.primary_recommendation.index;
      if (baseDuas[idx]) {
        selectedDuas.push({
          ...baseDuas[idx],
          recommendation_reason: recommendations.primary_recommendation.why_now,
          spiritual_benefit: recommendations.primary_recommendation.spiritual_benefit,
          priority: 'primary'
        });
      }
    }

    if (recommendations.secondary_recommendations) {
      recommendations.secondary_recommendations.forEach((rec, i) => {
        if (baseDuas[rec.index]) {
          selectedDuas.push({
            ...baseDuas[rec.index],
            recommendation_reason: rec.why_now,
            spiritual_benefit: rec.spiritual_benefit,
            priority: `secondary_${i + 1}`
          });
        }
      });
    }

    return Response.json({
      success: true,
      time_based_occasion: selectedOccasion,
      emotional_state: emotionalState,
      duas: selectedDuas.slice(0, 3),
      personalized_guidance: recommendations.personalized_guidance,
      emotional_resonance: recommendations.emotional_resonance,
      message: `${selectedDuas.length} personalized duas selected based on your current spiritual and emotional state`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});