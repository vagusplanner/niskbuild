import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate detailed tasks from a user's goal or description
 * Uses AI to suggest tasks, subtasks, priorities, and time estimates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal, context } = await req.json();

    if (!goal) {
      return Response.json({ error: 'Goal description is required' }, { status: 400 });
    }

    // Track AI usage
    const usageCheck = await base44.functions.invoke('trackUsage', {
      feature_type: 'ai_requests',
      amount: 1,
      metadata: { action: 'generate_tasks_from_goal' }
    });

    if (!usageCheck.data.allowed) {
      return Response.json({ 
        error: usageCheck.data.message,
        limit_exceeded: true,
        upgrade_required: true
      }, { status: 403 });
    }

    // Generate tasks using AI
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a task management expert. A user wants to accomplish the following goal:

Goal: ${goal}

${context ? `Additional context: ${context}` : ''}

Generate a comprehensive list of tasks to help achieve this goal. For each task, provide:
1. A clear, actionable title
2. A brief description
3. Priority level (low, medium, high, or urgent)
4. Estimated duration in minutes
5. Category (work, personal, health, shopping, learning, home, or other)
6. 2-4 relevant subtasks that break down the task further
7. Any helpful notes or tips

Provide 3-7 tasks that cover the main steps needed to achieve this goal.
Focus on actionable, specific tasks rather than vague objectives.
Order them logically based on dependencies and natural workflow.`,
      response_json_schema: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                estimated_minutes: { type: "number" },
                category: { type: "string", enum: ["work", "personal", "health", "shopping", "learning", "home", "other"] },
                subtasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      completed: { type: "boolean" }
                    }
                  }
                },
                notes: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          overall_tips: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      success: true,
      tasks: response.tasks,
      tips: response.overall_tips
    });

  } catch (error) {
    console.error('AI task generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});