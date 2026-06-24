import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trigger_type, desired_outcome, existing_steps } = await req.json();

    if (!trigger_type || !desired_outcome) {
      return Response.json({ 
        error: 'trigger_type and desired_outcome are required' 
      }, { status: 400 });
    }

    // Fetch user's existing workflows for context
    const existingWorkflows = await base44.entities.WorkflowAutomation.filter({
      created_by: user.email
    }, '-created_date', 5);

    const workflowContext = existingWorkflows.length > 0 
      ? `User has created ${existingWorkflows.length} workflows before. Common patterns include: ${existingWorkflows.map(w => w.name).join(', ')}`
      : 'This is one of the user\'s first workflows.';

    const suggestions = await base44.integrations.Core.InvokeLLM({
      prompt: `
You are a workflow automation expert. Help design an optimal workflow.

Trigger: ${trigger_type}
Desired Outcome: ${desired_outcome}
${existing_steps ? `Existing steps: ${JSON.stringify(existing_steps)}` : ''}

Context: ${workflowContext}

Suggest a complete workflow with 3-6 steps that will achieve the desired outcome.

Available step types:
- send_notification: Send in-app notification
- send_email: Send email
- create_event: Create calendar event
- update_event: Update existing event
- create_task: Create a task
- invoke_function: Call a custom function
- wait: Add delay between steps

For each step, provide:
1. Type of action
2. Configuration details
3. Explanation of why this step is needed
4. Any conditions that should apply

Make the workflow practical, efficient, and aligned with best practices.
      `,
      response_json_schema: {
        type: 'object',
        properties: {
          suggested_steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                config: { type: 'object' },
                explanation: { type: 'string' },
                suggested_conditions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      operator: { type: 'string' },
                      value: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          overall_explanation: { type: 'string' },
          best_practices: {
            type: 'array',
            items: { type: 'string' }
          },
          alternative_approaches: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    return Response.json({
      success: true,
      suggestions: suggestions.suggested_steps,
      explanation: suggestions.overall_explanation,
      best_practices: suggestions.best_practices,
      alternatives: suggestions.alternative_approaches
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});