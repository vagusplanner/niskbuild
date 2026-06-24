import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user_interests, focus_areas, current_challenges, limit } = await req.json();

  // Fetch user settings for personalization and language
  const settings = await base44.entities.UserSettings.list();
  const userSettings = settings[0] || {};
  const userLang = userSettings?.language || 'en';
  const langMap = { 'ar': 'Arabic', 'fr': 'French', 'tr': 'Turkish', 'ur': 'Urdu', 'en': 'English' };
  const langName = langMap[userLang];
  const langInstruction = langName === 'English' ? '' : `\n\nRespond entirely in ${langName}.`;

  const result = await base44.integrations.Core.InvokeLLM({
     prompt: `You are an Islamic scholar providing personalized Hadith guidance.

  User profile:
  - Interests: ${user_interests?.join(', ') || 'general Islamic knowledge'}
  - Focus areas: ${focus_areas?.join(', ') || userSettings.focus_areas?.join(', ') || 'spiritual growth'}
  - Current challenges: ${current_challenges || 'daily life struggles'}

  Generate ${limit || 3} authentic Hadiths that:
  1. Are directly relevant to the user's interests and current life situation
  2. Provide practical wisdom and actionable guidance
  3. Include both the Arabic text and authentic English translation
  4. Come from Sahih (authentic) collections (Bukhari, Muslim, etc.)

  For each Hadith, provide:
  - The actual Hadith text (Arabic and English)
  - Collection and reference number
  - A brief but insightful explanation
  - Practical steps to implement the teaching
  - How it relates to the user's specific interests${langInstruction}`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        hadiths: {
          type: "array",
          items: {
            type: "object",
            properties: {
              arabic_text: { type: "string" },
              translation: { type: "string" },
              narrator: { type: "string" },
              collection: { type: "string", description: "e.g., Sahih Bukhari, Sahih Muslim" },
              reference: { type: "string", description: "Book and Hadith number" },
              grade: { type: "string", description: "Authenticity grade: Sahih, Hasan, etc." },
              explanation: { type: "string", description: "Detailed explanation of the Hadith" },
              key_teachings: {
                type: "array",
                items: { type: "string" },
                description: "3-4 key teachings"
              },
              practical_steps: {
                type: "array",
                items: { type: "string" },
                description: "Actionable steps to implement"
              },
              relevance_to_user: { type: "string", description: "Why this is relevant to the user's profile" },
              related_quran_verses: {
                type: "array",
                items: { type: "string" },
                description: "Related Quranic verses"
              }
            },
            required: ["translation", "collection", "explanation", "key_teachings"]
          }
        }
      },
      required: ["hadiths"]
    }
  });

  // Save hadiths to database
  const savedHadiths = [];
  for (const hadith of result.hadiths) {
    const saved = await base44.entities.Hadith.create({
      arabic_text: hadith.arabic_text,
      translation: hadith.translation,
      narrator: hadith.narrator,
      collection: hadith.collection,
      reference: hadith.reference,
      grade: hadith.grade,
      notes: JSON.stringify({
        explanation: hadith.explanation,
        key_teachings: hadith.key_teachings,
        practical_steps: hadith.practical_steps,
        relevance_to_user: hadith.relevance_to_user,
        related_quran_verses: hadith.related_quran_verses
      }),
      tags: user_interests || [],
      is_favorite: false
    });
    savedHadiths.push({
      ...saved,
      ai_context: {
        explanation: hadith.explanation,
        key_teachings: hadith.key_teachings,
        practical_steps: hadith.practical_steps,
        relevance_to_user: hadith.relevance_to_user,
        related_quran_verses: hadith.related_quran_verses
      }
    });
  }

  return Response.json({ 
    hadiths: savedHadiths,
    count: savedHadiths.length
  });
});