import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { date, user_interests, recent_reflections } = await req.json();
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Check if verse already exists for today
  const existingVerse = await base44.entities.QuranVerse.filter({ date: targetDate });
  if (existingVerse.length > 0) {
    return Response.json({ verse: existingVerse[0], generated: false });
  }

  // Get user's language preference
  const settings = await base44.entities.UserSettings.filter({ created_by: user.email });
  const userLang = settings?.[0]?.language || 'en';
  const langMap = { 'ar': 'Arabic', 'fr': 'French', 'tr': 'Turkish', 'ur': 'Urdu', 'en': 'English' };
  const langName = langMap[userLang];
  const langInstruction = langName === 'English' ? '' : `\n\nRespond entirely in ${langName}.`;

  // Generate AI-powered verse selection with context
   const result = await base44.integrations.Core.InvokeLLM({
     prompt: `You are an Islamic scholar providing daily Quran guidance.

  User interests: ${user_interests?.join(', ') || 'general Islamic guidance'}
  Recent reflections context: ${recent_reflections?.slice(0, 2).join('. ') || 'None'}

  Generate a meaningful Quran verse for ${targetDate} that:
  1. Is relevant to the user's spiritual journey and interests
  2. Provides practical life guidance
  3. Includes deep context and wisdom

  Select an actual verse from the Quran (specify Surah and verse number).
  Provide thoughtful reflection prompts that encourage personal growth.${langInstruction}`,
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        surah_number: { type: "number" },
        surah_name: { type: "string" },
        verse_number: { type: "number" },
        arabic_text: { type: "string" },
        translation: { type: "string" },
        transliteration: { type: "string" },
        context: { type: "string", description: "Historical and situational context of revelation" },
        key_lessons: { 
          type: "array", 
          items: { type: "string" },
          description: "2-3 key lessons from this verse"
        },
        reflection_prompts: { 
          type: "array", 
          items: { type: "string" },
          description: "3 personal reflection questions"
        },
        practical_application: { type: "string", description: "How to apply this verse in daily life" },
        related_verses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              reference: { type: "string" },
              brief_text: { type: "string" }
            }
          },
          description: "2-3 related verses for deeper study"
        }
      },
      required: ["surah_name", "arabic_text", "translation", "context", "key_lessons", "reflection_prompts"]
    }
  });

  // Save the verse
  const savedVerse = await base44.entities.QuranVerse.create({
    date: targetDate,
    surah_number: result.surah_number,
    surah_name: result.surah_name,
    verse_number: result.verse_number,
    arabic_text: result.arabic_text,
    translation: result.translation,
    transliteration: result.transliteration,
    notes: JSON.stringify({
      context: result.context,
      key_lessons: result.key_lessons,
      reflection_prompts: result.reflection_prompts,
      practical_application: result.practical_application,
      related_verses: result.related_verses
    })
  });

  return Response.json({ 
    verse: savedVerse, 
    generated: true,
    ai_context: {
      context: result.context,
      key_lessons: result.key_lessons,
      reflection_prompts: result.reflection_prompts,
      practical_application: result.practical_application,
      related_verses: result.related_verses
    }
  });
});