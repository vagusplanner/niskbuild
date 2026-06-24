import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Predict which tasks are at risk of missing deadlines
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usageCheck = await base44.functions.invoke('trackUsage', {
      feature_type: 'ai_requests',
      amount: 1,
      metadata: { action: 'deadline_risk_prediction' }
    });

    if (!usageCheck.data.allowed) {
      return Response.json({ error: usageCheck.data.message, limit_exceeded: true }, { status: 403 });
    }

    const tasks = await base44.entities.Task.filter({
      status: ['todo', 'in_progress']
    });

    const today = new Date();
    const tasksWithDeadlines = tasks.filter(t => t.due_date).map(task => {
      const dueDate = new Date(task.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return { ...task, daysUntilDue };
    });

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze deadline risk for these tasks:

${tasksWithDeadlines.map(t => `
- "${t.title}"
  Priority: ${t.priority}
  Status: ${t.status}
  Days until due: ${t.daysUntilDue}
  Estimated time: ${t.estimated_minutes || 'unknown'} min
  Subtasks: ${t.subtasks?.length || 0}
  Dependencies: ${t.dependencies?.length || 0}
`).join('\n')}

For each task, assess:
1. Risk level (critical/high/medium/low)
2. Why it's at risk
3. Specific mitigation actions
4. Suggested timeline adjustment`,
      response_json_schema: {
        type: "object",
        properties: {
          at_risk_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                task_title: { type: "string" },
                risk_level: { type: "string", enum: ["critical", "high", "medium", "low"] },
                risk_factors: { type: "array", items: { type: "string" } },
                mitigation_actions: { type: "array", items: { type: "string" } },
                suggested_new_deadline: { type: "string" },
                urgency_score: { type: "number" }
              }
            }
          },
          overall_assessment: { type: "string" },
          immediate_actions: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      total_tasks_analyzed: tasksWithDeadlines.length,
      ...response
    });

  } catch (error) {
    console.error('Deadline risk prediction error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});