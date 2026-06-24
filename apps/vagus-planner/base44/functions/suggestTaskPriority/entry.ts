import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Suggest task priority using AI based on task details
 * Analyzes title, description, due date, and context
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, due_date, due_time, category, context } = await req.json();

    if (!title) {
      return Response.json({ error: 'Task title is required' }, { status: 400 });
    }

    // Track AI usage
    const usageCheck = await base44.functions.invoke('trackUsage', {
      feature_type: 'ai_requests',
      amount: 1,
      metadata: { action: 'suggest_task_priority' }
    });

    if (!usageCheck.data.allowed) {
      return Response.json({ 
        error: usageCheck.data.message,
        limit_exceeded: true
      }, { status: 403 });
    }

    const now = new Date();
    const dueDateTime = due_date ? new Date(due_date) : null;
    const daysUntilDue = dueDateTime ? Math.ceil((dueDateTime - now) / (1000 * 60 * 60 * 24)) : null;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a productivity expert analyzing task priority. Consider these factors:

Title: ${title}
Description: ${description || 'Not provided'}
Category: ${category || 'Not specified'}
Due Date: ${due_date ? `${due_date}${due_time ? ` at ${due_time}` : ''} (${daysUntilDue} days from now)` : 'No deadline set'}
${context ? `Additional Context: ${context}` : ''}

Analyze this task and suggest the appropriate priority level:
- LOW: Routine tasks, no urgency, flexible timeline
- MEDIUM: Important but not urgent, moderate timeline (1-2 weeks)
- HIGH: Important and somewhat urgent, needs attention soon (within a week)
- URGENT: Critical, immediate action required, tight deadline (within 1-3 days)

Consider:
1. Time sensitivity and deadlines
2. Impact of not completing the task
3. Dependencies on other tasks or people
4. Keywords indicating urgency (ASAP, critical, important, urgent)
5. Category-specific norms (health issues often higher priority)

Provide a priority suggestion with reasoning.`,
      response_json_schema: {
        type: "object",
        properties: {
          suggested_priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"]
          },
          confidence: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          reasoning: {
            type: "string"
          },
          urgency_factors: {
            type: "array",
            items: { type: "string" }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Priority suggestion error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});