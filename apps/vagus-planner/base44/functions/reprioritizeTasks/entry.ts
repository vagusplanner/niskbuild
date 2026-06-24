import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Re-prioritize multiple tasks based on current context
 * Useful when deadlines change or new information emerges
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_ids, context } = await req.json();

    if (!task_ids || task_ids.length === 0) {
      return Response.json({ error: 'Task IDs are required' }, { status: 400 });
    }

    // Track AI usage (one request per batch)
    const usageCheck = await base44.functions.invoke('trackUsage', {
      feature_type: 'ai_requests',
      amount: 1,
      metadata: { action: 'reprioritize_tasks', task_count: task_ids.length }
    });

    if (!usageCheck.data.allowed) {
      return Response.json({ 
        error: usageCheck.data.message,
        limit_exceeded: true
      }, { status: 403 });
    }

    // Fetch all tasks
    const tasks = await Promise.all(
      task_ids.map(id => base44.entities.Task.get(id))
    );

    const now = new Date();
    const tasksWithDays = tasks.map(task => {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const daysUntilDue = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null;
      return { ...task, daysUntilDue };
    });

    // Get AI recommendations
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a productivity expert analyzing multiple tasks to suggest optimal priorities. 

${context ? `Context: ${context}\n\n` : ''}Tasks to analyze:

${tasksWithDays.map((task, idx) => `
${idx + 1}. "${task.title}"
   Category: ${task.category}
   Current Priority: ${task.priority}
   Due: ${task.due_date ? `${task.due_date} (${task.daysUntilDue} days)` : 'No deadline'}
   Description: ${task.description || 'None'}
`).join('\n')}

Analyze all tasks holistically and suggest updated priorities considering:
1. Relative urgency and deadlines
2. Dependencies between tasks
3. Category importance
4. Any context provided
5. Current workload distribution

For each task, suggest if the priority should change and why.`,
      response_json_schema: {
        type: "object",
        properties: {
          task_updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_index: { type: "number" },
                current_priority: { type: "string" },
                suggested_priority: { 
                  type: "string",
                  enum: ["low", "medium", "high", "urgent"]
                },
                should_change: { type: "boolean" },
                reasoning: { type: "string" }
              }
            }
          },
          overall_recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Apply changes
    const updates = [];
    for (const update of response.task_updates) {
      if (update.should_change) {
        const task = tasks[update.task_index];
        await base44.asServiceRole.entities.Task.update(task.id, {
          priority: update.suggested_priority
        });
        updates.push({
          task_id: task.id,
          task_title: task.title,
          old_priority: update.current_priority,
          new_priority: update.suggested_priority,
          reasoning: update.reasoning
        });
      }
    }

    return Response.json({
      success: true,
      changes_made: updates.length,
      updates,
      recommendations: response.overall_recommendations
    });

  } catch (error) {
    console.error('Re-prioritization error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});