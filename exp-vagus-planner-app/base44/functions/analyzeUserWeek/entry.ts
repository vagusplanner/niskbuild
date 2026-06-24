import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current week data
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Fetch all relevant data
    const [events, tasks, energyLogs, userPoints, habits] = await Promise.all([
      base44.entities.Event.list('-date', 100),
      base44.entities.Task.list('-updated_date', 100),
      base44.entities.EnergyLog.list('-date', 50),
      base44.entities.GamificationPoints.filter({ created_by: user.email }),
      base44.entities.Habit.filter({ created_by: user.email, is_active: true })
    ]);

    // Filter events for current week
    const weekEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    // Analyze tasks
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const completedThisWeek = tasks.filter(t => {
      if (t.status !== 'completed' || !t.updated_date) return false;
      const updatedDate = new Date(t.updated_date);
      return updatedDate >= weekStart && updatedDate <= weekEnd;
    });

    // Analyze energy patterns
    const avgEnergy = energyLogs.length > 0
      ? energyLogs.reduce((sum, log) => sum + log.energy_level, 0) / energyLogs.length
      : null;

    // Detect conflicts
    const conflicts = [];
    for (let i = 0; i < weekEvents.length; i++) {
      for (let j = i + 1; j < weekEvents.length; j++) {
        const e1 = weekEvents[i];
        const e2 = weekEvents[j];
        
        if (e1.date === e2.date && e1.start_time && e2.start_time) {
          const [h1, m1] = e1.start_time.split(':').map(Number);
          const [h2, m2] = e2.start_time.split(':').map(Number);
          const start1 = h1 * 60 + m1;
          const start2 = h2 * 60 + m2;
          
          if (Math.abs(start1 - start2) < 60) {
            conflicts.push({
              event1: e1.title,
              event2: e2.title,
              date: e1.date,
              time: e1.start_time
            });
          }
        }
      }
    }

    // Generate AI analysis
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this user's week and provide actionable insights:

USER DATA:
- Events this week: ${weekEvents.length}
- Pending tasks: ${pendingTasks.length}
- Tasks completed this week: ${completedThisWeek.length}
- Active habits: ${habits.length}
- Average energy level: ${avgEnergy ? avgEnergy.toFixed(1) : 'Unknown'}
- Current streak: ${userPoints[0]?.current_streak || 0} days
- Detected conflicts: ${conflicts.length}

EVENTS THIS WEEK:
${weekEvents.slice(0, 10).map(e => `- ${e.date}: ${e.title} (${e.category})`).join('\n')}

TOP PENDING TASKS:
${pendingTasks.slice(0, 10).map(t => `- ${t.title} (Priority: ${t.priority || 'normal'})`).join('\n')}

${conflicts.length > 0 ? `CONFLICTS DETECTED:\n${conflicts.map(c => `- ${c.date} at ${c.time}: ${c.event1} vs ${c.event2}`).join('\n')}` : ''}

Provide:
1. Weekly summary highlighting key achievements and patterns
2. Top 3 priorities for the upcoming days
3. Specific time suggestions for high-priority tasks based on their typical energy
4. Any concerns about workload or balance
5. Motivational insights based on their streak and progress

Be concise, actionable, and encouraging.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          achievements: { type: "array", items: { type: "string" } },
          priorities: { type: "array", items: { type: "string" } },
          time_suggestions: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                task: { type: "string" },
                suggested_day: { type: "string" },
                suggested_time: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          concerns: { type: "array", items: { type: "string" } },
          motivation: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      analysis: analysis,
      conflicts: conflicts,
      stats: {
        events_this_week: weekEvents.length,
        pending_tasks: pendingTasks.length,
        completed_this_week: completedThisWeek.length,
        current_streak: userPoints[0]?.current_streak || 0,
        avg_energy: avgEnergy
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});