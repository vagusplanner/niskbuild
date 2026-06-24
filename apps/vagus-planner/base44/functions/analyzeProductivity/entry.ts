import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Analyze productivity patterns and provide actionable insights
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
      metadata: { action: 'productivity_analysis' }
    });

    if (!usageCheck.data.allowed) {
      return Response.json({ error: usageCheck.data.message, limit_exceeded: true }, { status: 403 });
    }

    const { period = 'week' } = await req.json().catch(() => ({}));
    
    const daysAgo = period === 'week' ? 7 : period === 'month' ? 30 : 1;
    const startDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

    const [tasks, events, goals] = await Promise.all([
      base44.entities.Task.list('-updated_date', 200),
      base44.entities.Event.list('-start_date', 100),
      base44.entities.Goal.list()
    ]);

    const recentTasks = tasks.filter(t => t.created_date >= startDate);
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.updated_date >= startDate);
    const overdueRate = tasks.filter(t => t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'completed').length / tasks.length;

    const categoryBreakdown = tasks.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});

    const avgCompletionTime = completedTasks
      .filter(t => t.estimated_minutes)
      .reduce((sum, t) => sum + (t.estimated_minutes || 0), 0) / completedTasks.length || 0;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze productivity for the past ${period}:

**Task Metrics:**
- Total tasks: ${tasks.length}
- Tasks created: ${recentTasks.length}
- Tasks completed: ${completedTasks.length}
- Completion rate: ${((completedTasks.length / recentTasks.length) * 100).toFixed(1)}%
- Overdue rate: ${(overdueRate * 100).toFixed(1)}%
- Avg completion time: ${avgCompletionTime.toFixed(0)} min

**Category Breakdown:**
${Object.entries(categoryBreakdown).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

**Goals:**
- Active: ${goals.filter(g => g.status === 'in_progress').length}
- Completed: ${goals.filter(g => g.status === 'completed').length}
- Avg progress: ${(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length).toFixed(0)}%

Provide:
1. Overall productivity score (0-100)
2. Key strengths (what's working well)
3. Areas for improvement
4. Specific actionable recommendations
5. Time management insights
6. Focus area suggestions`,
      response_json_schema: {
        type: "object",
        properties: {
          productivity_score: { type: "number" },
          trend: { type: "string", enum: ["improving", "stable", "declining"] },
          key_strengths: { type: "array", items: { type: "string" } },
          improvement_areas: { type: "array", items: { type: "string" } },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                action: { type: "string" },
                impact: { type: "string", enum: ["high", "medium", "low"] }
              }
            }
          },
          time_insights: { type: "array", items: { type: "string" } },
          focus_areas: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      period,
      metrics: {
        total_tasks: tasks.length,
        completed_tasks: completedTasks.length,
        completion_rate: ((completedTasks.length / recentTasks.length) * 100).toFixed(1),
        overdue_rate: (overdueRate * 100).toFixed(1),
        category_breakdown: categoryBreakdown
      },
      ...response
    });

  } catch (error) {
    console.error('Productivity analysis error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});