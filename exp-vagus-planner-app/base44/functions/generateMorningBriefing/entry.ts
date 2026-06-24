import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    // Fetch today's events
    const allEvents = await base44.entities.Event.list();
    const todayEvents = allEvents.filter(e => {
      const eventDate = new Date(e.start_date);
      return eventDate >= todayStart && eventDate <= todayEnd;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    // Fetch pending tasks
    const allTasks = await base44.entities.Task.list();
    const pendingTasks = allTasks.filter(t => 
      t.status !== 'completed' && 
      (t.priority === 'high' || t.priority === 'urgent')
    );

    // Get user settings for Islamic reminders and language
     const settings = await base44.entities.UserSettings.list();
     const userSettings = settings.find(s => s.created_by === user.email);
     const userLang = userSettings?.language || 'en';
     const langMap = { 'ar': 'Arabic', 'fr': 'French', 'tr': 'Turkish', 'ur': 'Urdu', 'en': 'English' };
     const langName = langMap[userLang];
     const langInstruction = langName === 'English' ? '' : `\n\nRespond entirely in ${langName}.`;

     // Check for Islamic activities
     const islamicReminders = [];

     // Check if fasting today
     const fastingRecords = await base44.entities.FastingRecord?.list?.() || [];
     const todayFasting = fastingRecords.find(f => {
       const fDate = new Date(f.date);
       return fDate.toDateString() === today.toDateString();
     });
     if (todayFasting) {
       islamicReminders.push('You are fasting today - Suhoor completed ✅');
     }

     // Check Quran reading goal
     const quranGoals = await base44.entities.QuranGoal?.list?.() || [];
     if (quranGoals.length > 0) {
       islamicReminders.push('Daily Quran reading goal pending');
     }

     // Generate AI summary
     const briefingPrompt = `Generate a warm, motivational morning briefing for a Muslim user.

    Today's Schedule:
    ${todayEvents.map(e => `- ${e.title} at ${new Date(e.start_date).toLocaleTimeString()} (${e.category})`).join('\n')}

    Pending High Priority Tasks:
    ${pendingTasks.slice(0, 5).map(t => `- ${t.title} (${t.priority})`).join('\n')}

    Islamic Context:
    ${islamicReminders.join('\n')}

    Generate:
    1. A warm summary sentence (mention it's after Fajr)
    2. Highlight most important meetings/events
    3. Remind about pending Islamic activities
    4. One actionable productivity tip for the day

    Keep it brief, warm, and motivating.${langInstruction}`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: briefingPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          ai_tip: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      briefing: {
        summary: aiResponse.summary,
        events: todayEvents.slice(0, 5).map(e => ({
          title: e.title,
          time: new Date(e.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          category: e.category
        })),
        pending_tasks: pendingTasks.slice(0, 3).map(t => ({
          title: t.title,
          priority: t.priority
        })),
        islamic_reminders: islamicReminders,
        ai_tip: aiResponse.ai_tip
      }
    });

  } catch (error) {
    console.error('Error generating morning briefing:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});