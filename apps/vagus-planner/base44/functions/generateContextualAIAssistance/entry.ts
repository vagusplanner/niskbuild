import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { current_page, user_action } = await req.json();

    // Gather comprehensive user context
    const [
      settings,
      recentPrayerLogs,
      goals,
      upcomingEvents,
      tasks,
      quranGoals,
      fastingRecords,
      charityGiving
    ] = await Promise.all([
      base44.entities.UserSettings.list().catch(() => []),
      base44.entities.PrayerLog.list('-date', 7).catch(() => []),
      base44.entities.Goal.filter({ status: 'in_progress' }).catch(() => []),
      base44.entities.Event.list('start_date', 10).catch(() => []),
      base44.entities.Task.filter({ status: 'todo' }).catch(() => []),
      base44.entities.QuranGoal.list('-created_date', 5).catch(() => []),
      base44.entities.FastingRecord.list('-date', 30).catch(() => []),
      base44.entities.CharitableGiving.list('-date', 10).catch(() => [])
    ]);

    const userSettings = settings[0] || {};
    const now = new Date();
    
    // Calculate prayer consistency
    const prayerConsistency = recentPrayerLogs.length > 0
      ? Math.round((recentPrayerLogs.filter(p => p.status === 'performed').length / recentPrayerLogs.length) * 100)
      : 0;

    // Check upcoming travel
    const hasUpcomingTravel = upcomingEvents.some(e => 
      e.category === 'holiday' || e.title?.toLowerCase().includes('travel')
    );

    // Check if user is planning Hajj/Umrah
    const hasHajjUmrahPlans = upcomingEvents.some(e => 
      e.title?.toLowerCase().includes('hajj') || 
      e.title?.toLowerCase().includes('umrah') ||
      e.title?.toLowerCase().includes('mecca') ||
      e.title?.toLowerCase().includes('makkah')
    );

    // Time of day
    const hour = now.getHours();
    const timeOfDay = 
      hour >= 5 && hour < 12 ? 'morning' :
      hour >= 12 && hour < 17 ? 'afternoon' :
      hour >= 17 && hour < 21 ? 'evening' : 'night';

    const userContext = {
      name: user.full_name,
      current_page,
      user_action: user_action || 'viewing page',
      time_of_day: timeOfDay,
      prayer_consistency: `${prayerConsistency}%`,
      recent_prayers: recentPrayerLogs.slice(0, 3).map(p => ({ 
        prayer: p.prayer_name, 
        status: p.status 
      })),
      active_goals: goals.map(g => ({ 
        title: g.title, 
        category: g.category, 
        progress: g.progress 
      })),
      upcoming_events: upcomingEvents.slice(0, 3).map(e => ({
        title: e.title,
        date: e.start_date,
        category: e.category
      })),
      pending_tasks: tasks.length,
      quran_goals: quranGoals.map(g => ({ 
        target: g.target_verses, 
        progress: g.progress_verses 
      })),
      recent_fasting: fastingRecords.length,
      recent_charity: charityGiving.length,
      has_upcoming_travel: hasUpcomingTravel,
      has_hajj_umrah_plans: hasHajjUmrahPlans,
      focus_areas: userSettings.focus_areas || [],
      interests: userSettings.ai_interest_areas || []
    };

    // Generate contextual AI assistance
    const prompt = `You are an intelligent Islamic AI companion for ${userContext.name}. 

CURRENT CONTEXT:
- Page: ${current_page}
- Action: ${user_action || 'viewing page'}
- Time: ${timeOfDay}
- Prayer consistency: ${prayerConsistency}%
${hasUpcomingTravel ? '- Has upcoming travel plans' : ''}
${hasHajjUmrahPlans ? '- Planning Hajj/Umrah' : ''}
- Active goals: ${userContext.active_goals.map(g => g.title).join(', ') || 'None'}
- Quran progress: ${userContext.quran_goals.length > 0 ? 'Active' : 'None'}

YOUR ROLE:
1. Suggest relevant Islamic features based on their current activity
2. Provide contextual Islamic guidance for this moment
3. Offer personalized encouragement for their spiritual journey

GENERATE 3 TYPES OF ASSISTANCE:

1. FEATURE SUGGESTIONS (1-2 relevant features they should explore now):
   - If on Calendar: Suggest Islamic event planning, prayer time blocking
   - If on Travel/Holidays: Suggest Hajj/Umrah planner, Muslim travel assistant, halal food finder
   - If on Islamic page: Suggest Quran reading, Tasbih, or charity features
   - If on Health: Suggest fasting tracker, prayer as mindfulness
   - Be specific to what would help them RIGHT NOW

2. CONTEXTUAL ISLAMIC GUIDANCE (one insight for this moment):
   - Time-specific reminders (morning adhkar, evening duas, upcoming prayer)
   - Encouragement based on their goals and progress
   - Spiritual advice relevant to their current activity
   - Quranic wisdom that applies to their situation

3. PERSONAL ENCOURAGEMENT (motivational message):
   - Acknowledge their progress (prayer consistency, goals, etc.)
   - Inspire them to continue their spiritual journey
   - Make it personal and warm

Keep suggestions practical, warm, and genuinely helpful. Be concise but meaningful.`;

    const assistanceSchema = {
      type: "object",
      properties: {
        feature_suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              feature_name: { type: "string", description: "Name of the feature" },
              reason: { type: "string", description: "Why it's relevant now (1 sentence)" },
              page_link: { type: "string", description: "Page name to navigate to" },
              icon: { type: "string", description: "Icon name from lucide-react" }
            }
          },
          minItems: 1,
          maxItems: 2
        },
        contextual_guidance: {
          type: "object",
          properties: {
            title: { type: "string", description: "Brief title" },
            message: { type: "string", description: "The guidance message (2-3 sentences)" },
            action_label: { type: "string", description: "Optional CTA button text" },
            action_type: { type: "string", description: "prayer_reminder|quran_reading|dua|general" }
          }
        },
        encouragement: {
          type: "object",
          properties: {
            message: { type: "string", description: "Personal encouragement (2-3 sentences)" },
            verse_reference: { type: "string", description: "Optional Quran verse reference" },
            verse_text: { type: "string", description: "Optional short Quran verse" }
          }
        },
        priority: { 
          type: "string", 
          enum: ["high", "medium", "low"],
          description: "How important is this assistance right now" 
        }
      },
      required: ["feature_suggestions", "contextual_guidance", "encouragement", "priority"]
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: assistanceSchema,
      add_context_from_internet: false
    });

    return Response.json({
      success: true,
      assistance: result,
      context_used: {
        page: current_page,
        prayer_consistency: prayerConsistency,
        active_goals_count: goals.length,
        has_travel_plans: hasUpcomingTravel
      }
    });

  } catch (error) {
    console.error('Error generating contextual assistance:', error);
    return Response.json({
      error: 'Failed to generate assistance',
      details: error.message
    }, { status: 500 });
  }
});