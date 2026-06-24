import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { 
    situation, 
    time_of_day, 
    current_location, 
    upcoming_events,
    current_mood 
  } = await req.json();

  // Fetch user settings and recent events for context
  const settings = await base44.entities.UserSettings.list();
  const userSettings = settings[0] || {};

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an Islamic scholar providing personalized Du'a (supplication) recommendations.

User context:
- Situation: ${situation || 'general daily life'}
- Time of day: ${time_of_day || 'any time'}
- Location: ${current_location || 'unknown'}
- Upcoming events: ${upcoming_events?.map(e => e.title).join(', ') || 'none'}
- Current mood/state: ${current_mood || 'neutral'}
- User's focus areas: ${userSettings.focus_areas?.join(', ') || 'general'}

Recommend 3-5 authentic Du'as that:
1. Are appropriate for the current situation and time
2. Come from the Quran or authentic Hadith
3. Include both Arabic text and transliteration
4. Provide context on when the Prophet ﷺ would recite them
5. Explain the benefits and virtues of each Du'a

Focus on Du'as that are practical, easy to memorize, and deeply meaningful.`,
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        duas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short title for the Du'a" },
              arabic_text: { type: "string" },
              transliteration: { type: "string" },
              translation: { type: "string" },
              source: { type: "string", description: "Quran verse or Hadith reference" },
              occasion: { 
                type: "string", 
                description: "When this Du'a should be recited" 
              },
              benefits: { type: "string", description: "Spiritual and practical benefits" },
              prophet_context: { 
                type: "string", 
                description: "How/when the Prophet ﷺ used this Du'a" 
              },
              relevance_explanation: { 
                type: "string", 
                description: "Why this is relevant to the user's current situation" 
              },
              memorization_tip: { type: "string", description: "Tips to memorize this Du'a" },
              frequency_recommendation: {
                type: "string",
                enum: ["daily", "morning", "evening", "before_sleep", "as_needed", "weekly"],
                description: "How often to recite"
              }
            },
            required: ["title", "arabic_text", "transliteration", "translation", "source"]
          }
        },
        situational_guidance: { 
          type: "string", 
          description: "Overall guidance for the user's current situation" 
        }
      },
      required: ["duas"]
    }
  });

  // Save Du'as to database
  const savedDuas = [];
  for (const dua of result.duas) {
    const saved = await base44.entities.DailyDua.create({
      title: dua.title,
      arabic_text: dua.arabic_text,
      transliteration: dua.transliteration,
      translation: dua.translation,
      source: dua.source,
      occasion: dua.occasion,
      benefits: dua.benefits,
      category: determineDuaCategory(situation, time_of_day),
      is_favorite: false,
      recitation_count: 0,
      notes: JSON.stringify({
        prophet_context: dua.prophet_context,
        relevance_explanation: dua.relevance_explanation,
        memorization_tip: dua.memorization_tip,
        frequency_recommendation: dua.frequency_recommendation
      })
    });
    
    savedDuas.push({
      ...saved,
      ai_context: {
        prophet_context: dua.prophet_context,
        relevance_explanation: dua.relevance_explanation,
        memorization_tip: dua.memorization_tip,
        frequency_recommendation: dua.frequency_recommendation
      }
    });
  }

  return Response.json({ 
    duas: savedDuas,
    situational_guidance: result.situational_guidance,
    count: savedDuas.length
  });
});

function determineDuaCategory(situation, timeOfDay) {
  if (timeOfDay?.includes('morning')) return 'morning';
  if (timeOfDay?.includes('evening')) return 'evening';
  if (situation?.includes('travel')) return 'travel';
  if (situation?.includes('work') || situation?.includes('meeting')) return 'work';
  if (situation?.includes('health') || situation?.includes('sick')) return 'health';
  return 'general';
}