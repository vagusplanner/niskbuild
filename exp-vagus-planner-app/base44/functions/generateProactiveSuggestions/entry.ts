import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch comprehensive user data for deep analysis
    const [goals, tasks, events, settings] = await Promise.all([
      base44.entities.Goal.list('-created_date', 50),
      base44.entities.Task.list('-created_date', 100),
      base44.entities.Event.list('-created_date', 50),
      base44.entities.UserSettings.list()
    ]);

    const userSettings = settings[0] || {};

    // Comprehensive analysis
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Goals analysis
    const activeGoals = goals.filter(g => g.status !== 'completed');
    const completedGoals = goals.filter(g => g.status === 'completed');
    
    const stalledGoals = activeGoals.filter(g => {
      const progress = g.progress || 0;
      const daysSinceUpdate = g.updated_date ? 
        Math.floor((now - new Date(g.updated_date)) / (1000 * 60 * 60 * 24)) : 999;
      return progress < 50 && daysSinceUpdate > 7;
    });
    
    const nearCompletionGoals = activeGoals.filter(g => {
      const progress = g.progress || 0;
      return progress >= 75 && progress < 100;
    });

    // Tasks analysis
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < now);
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
    const tasksWithoutDeadlines = pendingTasks.filter(t => !t.due_date);
    
    const tasksByCategory = pendingTasks.reduce((acc, t) => {
      acc[t.category || 'other'] = (acc[t.category || 'other'] || 0) + 1;
      return acc;
    }, {});
    const mostOverloadedCategory = Object.entries(tasksByCategory).sort((a, b) => b[1] - a[1])[0];

    // Events analysis
    const upcomingEvents = events.filter(e => {
      const eventDate = new Date(e.start_date);
      return eventDate > now && eventDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    });
    
    const timeConflicts = events.filter((e1, i) => {
      return events.some((e2, j) => {
        if (i >= j) return false;
        const e1Start = new Date(e1.start_date);
        const e1End = new Date(e1.end_date);
        const e2Start = new Date(e2.start_date);
        const e2End = new Date(e2.end_date);
        return (e1Start < e2End && e1End > e2Start);
      });
    });

    // Build comprehensive context
    const context = {
      activeGoalsCount: activeGoals.length,
      completedGoalsCount: completedGoals.length,
      stalledGoalsCount: stalledGoals.length,
      nearCompletionGoalsCount: nearCompletionGoals.length,
      pendingTasksCount: pendingTasks.length,
      overdueTasksCount: overdueTasks.length,
      highPriorityTasksCount: highPriorityTasks.length,
      upcomingEventsCount: upcomingEvents.length,
      timeConflictsCount: timeConflicts.length,
      tasksWithoutDeadlinesCount: tasksWithoutDeadlines.length
    };

    // Generate comprehensive AI suggestions
    const prompt = `You are an AI productivity coach analyzing comprehensive user data. Provide 4-7 highly personalized, actionable suggestions focusing on goal achievement, task prioritization, conflict resolution, and motivation.

COMPREHENSIVE CONTEXT:
════════════════════════════════════════

📊 GOALS ANALYSIS:
- Active Goals: ${activeGoals.length} (${stalledGoals.length} stalled, ${nearCompletionGoals.length} near completion)
- Completed Goals: ${completedGoals.length}
- Stalled Goals (no progress in 7+ days): ${stalledGoals.map(g => \`"\${g.title}" (\${g.progress || 0}%)\`).join(', ') || 'None'}
- Almost Complete: ${nearCompletionGoals.map(g => \`"\${g.title}" (\${g.progress}%)\`).join(', ') || 'None'}

📋 TASKS ANALYSIS:
- Total Pending: ${pendingTasks.length}
- Overdue: ${overdueTasks.length} tasks
- High Priority: ${highPriorityTasks.length} tasks
- Without Deadlines: ${tasksWithoutDeadlines.length} tasks
- Most Overloaded Category: ${mostOverloadedCategory ? \`\${mostOverloadedCategory[0]} (\${mostOverloadedCategory[1]} tasks)\` : 'None'}

📅 SCHEDULE ANALYSIS:
- Upcoming Events (7 days): ${upcomingEvents.length}
- Time Conflicts Detected: ${timeConflicts.length}
${timeConflicts.length > 0 ? \`- Conflicting Events: \${timeConflicts.map(e => e.title).join(', ')}\` : ''}

🎯 TOP PRIORITY ITEMS:
Goals: ${activeGoals.slice(0, 3).map(g => \`"\${g.title}" (\${g.progress || 0}%, target: \${g.target_date || 'not set'})\`).join('\n')}

Tasks: ${highPriorityTasks.slice(0, 5).map(t => \`"\${t.title}" (\${t.priority}, due: \${t.due_date || 'not set'})\`).join('\n')}

REQUIRED SUGGESTION TYPES (include all applicable):
═══════════════════════════════════════════

1. **Goal Breakdown**: For large/complex goals with <30% progress, suggest breaking into smaller milestones
2. **Task Prioritization**: Recommend which tasks to focus on based on deadlines, dependencies, and impact
3. **Conflict Resolution**: Identify scheduling conflicts, overcommitment, or bottlenecks
4. **Motivation & Progress**: Celebrate wins, provide encouragement for stalled goals, push near-completion items
5. **Time Management**: Suggest time-blocking, batch processing, or delegation opportunities
6. **Deadline Management**: Flag overdue items and tasks without deadlines that need them

RESPONSE FORMAT:
{
  "suggestions": [
    {
      "title": "Action-oriented title (e.g., 'Break Down Complex Goal', 'Resolve Schedule Conflict')",
      "description": "Specific, personalized explanation with exact goal/task names and actionable steps (2-4 sentences)",
      "category": "productivity|wellness|islamic|time-management|goals",
      "priority": "high|medium|low",
      "action_url": "/Profile or /Calendar or /Islamic or null",
      "insight_type": "goal_breakdown|task_prioritization|conflict_resolution|motivation|deadline_alert|time_optimization"
    }
  ]
}

Be specific - use actual goal and task titles. Provide clear, actionable advice. Prioritize high-impact suggestions. Make suggestions data-driven and motivational. Reference specific items by name.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                priority: { type: "string" },
                action_url: { type: "string" },
                insight_type: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      suggestions: aiResponse.suggestions || [],
      context,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return Response.json({ 
      error: error.message,
      suggestions: []
    }, { status: 500 });
  }
});