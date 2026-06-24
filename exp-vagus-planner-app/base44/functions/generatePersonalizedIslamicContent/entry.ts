import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_type, context } = await req.json();

    // Gather comprehensive user context
    const [
      settings,
      recentEvents,
      upcomingEvents,
      goals,
      prayerLogs,
      tasks,
      reflections
    ] = await Promise.all([
      base44.entities.UserSettings.list().catch(() => []),
      base44.entities.Event.list('-start_date', 20).catch(() => []),
      base44.entities.Event.list('start_date', 20).catch(() => []),
      base44.entities.Goal.filter({ status: 'in_progress' }).catch(() => []),
      base44.entities.PrayerLog.list('-date', 30).catch(() => []),
      base44.entities.Task.filter({ status: 'todo' }).catch(() => []),
      base44.entities.Reflection.list('-created_date', 10).catch(() => [])
    ]);

    const userSettings = settings[0] || {};
    const now = new Date();
    const todayEvents = recentEvents.filter(e => {
      const eventDate = new Date(e.start_date);
      return eventDate.toDateString() === now.toDateString();
    });
    
    const futureEvents = upcomingEvents.filter(e => {
      const eventDate = new Date(e.start_date);
      return eventDate > now;
    }).slice(0, 5);

    // Calculate prayer consistency
    const recentPrayers = prayerLogs.filter(log => {
      const logDate = new Date(log.date);
      const daysDiff = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7;
    });
    const prayerConsistency = recentPrayers.length > 0 
      ? (recentPrayers.filter(p => p.status === 'performed').length / recentPrayers.length * 100).toFixed(0)
      : 0;

    // Get time of day context
    const hour = now.getHours();
    const timeOfDay = 
      hour >= 5 && hour < 12 ? 'morning' :
      hour >= 12 && hour < 17 ? 'afternoon' :
      hour >= 17 && hour < 21 ? 'evening' : 'night';

    // Build rich context
    const userContext = {
      name: user.full_name,
      focus_areas: userSettings.focus_areas || [],
      interests: userSettings.ai_interest_areas || [],
      work_style: userSettings.work_style,
      today_events: todayEvents.map(e => ({ title: e.title, category: e.category })),
      upcoming_events: futureEvents.map(e => ({ 
        title: e.title, 
        date: e.start_date, 
        category: e.category 
      })),
      active_goals: goals.map(g => ({ 
        title: g.title, 
        category: g.category, 
        progress: g.progress 
      })),
      prayer_consistency: `${prayerConsistency}%`,
      pending_tasks: tasks.length,
      time_of_day: timeOfDay,
      recent_reflections: reflections.slice(0, 3).map(r => r.topic),
      ...context
    };

    let prompt = '';
    let responseSchema = {};

    // Generate content based on type
    if (content_type === 'daily_reflection') {
      prompt = `You are an Islamic spiritual guide. Generate a deeply personalized daily Quranic reflection for ${userContext.name}.

CONTEXT:
- Time: ${timeOfDay}
- Today's events: ${userContext.today_events.length > 0 ? userContext.today_events.map(e => e.title).join(', ') : 'None'}
- Focus areas: ${userContext.focus_areas.join(', ') || 'General spiritual growth'}
- Prayer consistency: ${userContext.prayer_consistency}
- Active goals: ${userContext.active_goals.map(g => g.title).join(', ') || 'None'}
- Upcoming: ${userContext.upcoming_events.slice(0, 2).map(e => e.title).join(', ') || 'Nothing scheduled'}

Generate a reflection that:
1. Selects a Quran verse highly relevant to their current life situation
2. Provides deep spiritual insights connected to their goals and activities
3. Offers practical wisdom they can apply TODAY
4. Includes a thought-provoking reflection question
5. Explains specifically why this reflection matters to them RIGHT NOW

Be warm, personal, and deeply insightful. Address their actual circumstances.`;

      responseSchema = {
        type: "object",
        properties: {
          verse_reference: { type: "string", description: "e.g., 'Surah Al-Baqarah 2:286'" },
          verse_text: { type: "string", description: "Arabic text" },
          reflection_title: { type: "string", description: "Compelling title" },
          main_reflection: { type: "string", description: "2-3 paragraphs of deep reflection" },
          spiritual_insight: { type: "string", description: "Key spiritual takeaway" },
          relevance: { type: "string", description: "Why this reflection now, connected to their context" },
          reflection_question: { type: "string", description: "Thought-provoking question" },
          action_suggestion: { type: "string", description: "One practical action for today" }
        },
        required: ["verse_reference", "verse_text", "reflection_title", "main_reflection", "spiritual_insight", "relevance", "reflection_question"]
      };

    } else if (content_type === 'contextual_duas') {
      const situation = context.situation || 'general';
      
      prompt = `You are an Islamic scholar specializing in Du'as. Generate 3 highly contextual and personalized Du'as for ${userContext.name}.

CURRENT SITUATION: ${situation}
CONTEXT:
- Time: ${timeOfDay}
- Today's schedule: ${userContext.today_events.map(e => e.title).join(', ') || 'Free day'}
- Upcoming: ${userContext.upcoming_events.slice(0, 2).map(e => `${e.title} (${e.date})`).join(', ') || 'Nothing soon'}
- Current challenges: ${context.current_challenges || 'General life guidance'}
- Interests: ${userContext.interests.join(', ') || 'Spiritual growth'}

Select Du'as that:
1. Directly address their current situation and upcoming events
2. Provide spiritual support for their challenges
3. Are authentic from Quran/Sunnah
4. Include practical guidance on when and how to recite
5. Explain specifically why each Du'a is relevant to their life RIGHT NOW

Be specific about their actual circumstances.`;

      responseSchema = {
        type: "object",
        properties: {
          situational_guidance: { type: "string", description: "Brief guidance for their situation" },
          duas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                arabic_text: { type: "string" },
                transliteration: { type: "string" },
                translation: { type: "string" },
                source: { type: "string", description: "Quran/Hadith reference" },
                occasion: { type: "string", description: "When to recite" },
                benefits: { type: "string" },
                ai_context: {
                  type: "object",
                  properties: {
                    relevance_explanation: { type: "string", description: "Why this Du'a NOW" },
                    frequency_recommendation: { type: "string", description: "How often to recite" },
                    memorization_tip: { type: "string" }
                  }
                }
              }
            },
            minItems: 3,
            maxItems: 3
          }
        },
        required: ["situational_guidance", "duas"]
      };

    } else if (content_type === 'hadith_explanation') {
      const interests = context.interests || userContext.interests || [];
      const challenges = context.challenges || '';
      
      prompt = `You are an Islamic scholar expert in Hadith. Generate 3 personalized Hadith teachings for ${userContext.name}.

USER PROFILE:
- Interests: ${interests.join(', ') || 'General Islamic knowledge'}
- Current challenges: ${challenges || 'Life guidance'}
- Focus areas: ${userContext.focus_areas.join(', ') || 'Spiritual development'}
- Prayer consistency: ${userContext.prayer_consistency}
- Active goals: ${userContext.active_goals.map(g => `${g.title} (${g.progress}%)`).join(', ') || 'None'}

Select Hadiths that:
1. Directly relate to their interests and challenges
2. Provide practical guidance for their current situation
3. Connect to their goals and aspirations
4. Include deep explanations that resonate personally
5. Offer concrete action steps they can implement

Explain specifically how each Hadith applies to THEIR life and circumstances.`;

      responseSchema = {
        type: "object",
        properties: {
          hadiths: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Topic/theme" },
                translation: { type: "string", description: "English translation" },
                collection: { type: "string", description: "e.g., 'Sahih Bukhari 123'" },
                narrator: { type: "string" },
                ai_context: {
                  type: "object",
                  properties: {
                    explanation: { type: "string", description: "Deep explanation" },
                    key_teachings: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "3-5 key lessons"
                    },
                    practical_steps: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "Actionable steps"
                    },
                    relevance_to_user: { type: "string", description: "How it applies to their life" },
                    related_quran_verse: { type: "string" }
                  }
                }
              }
            },
            minItems: 3,
            maxItems: 3
          }
        },
        required: ["hadiths"]
      };
    }

    // Generate content using AI
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema,
      add_context_from_internet: false
    });

    return Response.json({ 
      success: true, 
      content: result,
      user_context_used: {
        events_count: userContext.today_events.length + userContext.upcoming_events.length,
        goals_count: userContext.active_goals.length,
        prayer_consistency: userContext.prayer_consistency
      }
    });

  } catch (error) {
    console.error('Error generating Islamic content:', error);
    return Response.json({ 
      error: 'Failed to generate content',
      details: error.message 
    }, { status: 500 });
  }
});