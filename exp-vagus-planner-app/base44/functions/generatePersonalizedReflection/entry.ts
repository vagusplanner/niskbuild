import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's Quran reading progress and goals
    const quranGoals = await base44.entities.QuranGoal.filter({ status: 'active' });
    const recentReadings = await base44.entities.QuranReading.filter({}, '-date', 10);
    const userMood = await base44.entities.Mood.filter({}, '-date', 3);
    const currentChallenges = await base44.entities.Challenge.filter({ status: 'active' });

    // Build context about user's spiritual journey
    const progressContext = quranGoals.length > 0 
      ? `User is working on: ${quranGoals.map(g => g.title).join(', ')}` 
      : 'User is exploring Quranic knowledge';

    const recentActivityContext = recentReadings.length > 0
      ? `Recently read ${recentReadings.length} times, currently around Surah ${recentReadings[0]?.surah_name}`
      : 'User is beginning their Quran journey';

    const emotionalContext = userMood.length > 0
      ? `Recent emotional states: ${userMood.map(m => m.mood_type).join(', ')}`
      : 'Seeking guidance and spiritual growth';

    const challengesContext = currentChallenges.length > 0
      ? `Currently facing challenges in: ${currentChallenges.map(c => c.title).join(', ')}`
      : 'Open to all spiritual wisdom';

    // Generate personalized reflection via AI
    const reflection = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a knowledgeable Islamic guide providing personalized Quranic reflections. Based on this user's current spiritual journey, provide a deeply personal and compassionate Quranic reflection that addresses their needs.

User Context:
- ${progressContext}
- ${recentActivityContext}
- ${emotionalContext}
- ${challengesContext}

Generate a personalized Quranic reflection that:
1. References a specific Quranic verse or story relevant to their situation
2. Explains the spiritual wisdom in a way that speaks to their current challenges
3. Provides practical spiritual guidance they can apply today
4. Is warm, encouraging, and personally relevant (NOT generic)
5. Includes a brief reflection question for self-examination

Format the response as a JSON object with:
{
  "verse_reference": "Surah X, Verse Y",
  "verse_text": "The Quranic verse",
  "reflection_title": "A meaningful title",
  "main_reflection": "The personalized reflection",
  "spiritual_insight": "Key spiritual lesson",
  "reflection_question": "A question for personal contemplation",
  "relevance": "Why this reflection is specifically for them"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          verse_reference: { type: 'string' },
          verse_text: { type: 'string' },
          reflection_title: { type: 'string' },
          main_reflection: { type: 'string' },
          spiritual_insight: { type: 'string' },
          reflection_question: { type: 'string' },
          relevance: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      reflection,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});