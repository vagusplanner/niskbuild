import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Analyze user activity patterns
    const [events, tasks, meetings, settings] = await Promise.all([
      base44.entities.Event.filter({ created_by: user.email }),
      base44.entities.Task.filter({ created_by: user.email }),
      base44.entities.Meeting.filter({ organizer_email: user.email }),
      base44.entities.UserSettings.filter({ created_by: user.email })
    ]);

    const userSettings = settings[0] || {};

    // Build context for AI
    const context = {
      total_events: events.length,
      total_tasks: tasks.length,
      total_meetings: meetings.length,
      event_categories: [...new Set(events.map(e => e.category))],
      common_event_types: getCommonEventTypes(events),
      task_patterns: analyzeTaskPatterns(tasks),
      meeting_frequency: meetings.length > 0 ? 'regular' : 'occasional',
      work_style: userSettings.work_style || 'flexible',
      focus_areas: userSettings.focus_areas || []
    };

    // Generate AI suggestions
    const prompt = `Based on this user's activity patterns, suggest 5 practical workflow automation templates:

User Activity:
- Events: ${context.total_events} (Categories: ${context.event_categories.join(', ')})
- Tasks: ${context.total_tasks} (${context.task_patterns})
- Meetings: ${context.meeting_frequency}
- Focus Areas: ${context.focus_areas.join(', ')}
- Work Style: ${context.work_style}

Suggest workflows that would genuinely help this user. For each workflow, provide:
1. Name (concise, action-oriented)
2. Description (one sentence)
3. Trigger type (event_created, task_completed, meeting_created, etc.)
4. Trigger conditions (if any)
5. Steps (2-4 practical steps)

Return ONLY a JSON array of workflow objects.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          workflows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                trigger_type: { type: "string" },
                trigger_conditions: { type: "array" },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      description: { type: "string" },
                      config: { type: "object" }
                    }
                  }
                },
                use_case: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      templates: response.workflows || [],
      context
    });

  } catch (error) {
    console.error('Error suggesting workflows:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getCommonEventTypes(events) {
  const categories = events.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);
}

function analyzeTaskPatterns(tasks) {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = tasks.filter(t => t.status === 'todo').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length;

  return `${completed} completed, ${pending} pending, ${overdue} overdue`;
}