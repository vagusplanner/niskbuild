import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_title, category, recurrence_type, occurrence_date } = await req.json();

    if (!task_title) {
      return Response.json({ error: 'task_title required' }, { status: 400 });
    }

    // Get user's task history for personalization
    const userTasks = await base44.entities.Task.filter({
      created_by: user.email,
      category: category || undefined
    });

    // Get completed tasks for pattern analysis
    const completedTasks = userTasks.filter(t => t.status === 'completed');

    // Build context about user's work patterns
    const userContext = {
      total_tasks: userTasks.length,
      completed_tasks: completedTasks.length,
      common_categories: [...new Set(userTasks.map(t => t.category))],
      recent_task_titles: userTasks.slice(0, 10).map(t => t.title)
    };

    // Get user settings for additional context
    const settings = await base44.entities.UserSettings.list();
    const userSettings = settings.find(s => s.created_by === user.email);

    const prompt = `You are a personalized task assistant. Generate a detailed, contextual description for this recurring task:

Task: ${task_title}
Category: ${category || 'general'}
Recurrence: ${recurrence_type || 'weekly'}
${occurrence_date ? `Current Occurrence: ${occurrence_date}` : ''}

User Context:
- Completed ${completedTasks.length} tasks in this category
- Work Style: ${userSettings?.work_style || 'flexible'}
- Focus Areas: ${userSettings?.focus_areas?.join(', ') || 'general productivity'}
- Recent similar tasks: ${userContext.recent_task_titles.slice(0, 5).join(', ')}

Generate a description that:
1. Provides clear, actionable guidance for completing this task
2. References user's work patterns and preferences
3. Includes specific steps or checklist items if appropriate
4. Mentions time estimates based on ${recurrence_type} recurrence
5. Adds motivational or contextual notes
6. Makes it personal - use "you" language

Keep it concise but helpful (2-4 sentences).`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          suggested_subtasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                completed: { type: "boolean" }
              }
            }
          },
          estimated_minutes: { type: "number" },
          tips: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      description: response.description,
      subtasks: response.suggested_subtasks || [],
      estimated_minutes: response.estimated_minutes || 30,
      tips: response.tips || []
    });

  } catch (error) {
    console.error('Error generating task description:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});