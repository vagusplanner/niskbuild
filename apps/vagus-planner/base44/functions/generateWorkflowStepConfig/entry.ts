import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { step_type, workflow_context, trigger_type } = await req.json();

    if (!step_type) {
      return Response.json({ error: 'step_type required' }, { status: 400 });
    }

    // Generate AI configuration based on step type
    const prompt = buildPromptForStepType(step_type, workflow_context, trigger_type, user);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          config: { type: "object" },
          suggestions: { 
            type: "array",
            items: { type: "string" }
          },
          best_practices: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      generated_config: response.config || {},
      suggestions: response.suggestions || [],
      best_practices: response.best_practices
    });

  } catch (error) {
    console.error('Error generating step config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildPromptForStepType(stepType, context, triggerType, user) {
  const baseContext = `User: ${user.full_name || user.email}
Workflow Context: ${context?.description || 'General automation'}
Trigger: ${triggerType || 'Unknown'}`;

  switch (stepType) {
    case 'send_email':
      return `${baseContext}

Generate a professional email configuration for this workflow step.

Provide:
1. subject: Email subject line (use {{variable}} for dynamic values like {{event.title}})
2. body: Email body (professional, clear, actionable)
3. recipient: Who should receive it (use {{variable}} or provide default)
4. suggestions: 3 alternative approaches
5. best_practices: One tip for effective automation emails

Consider: The email should be helpful and contextual to the trigger event.`;

    case 'send_notification':
      return `${baseContext}

Generate an in-app notification configuration.

Provide:
1. title: Notification title (concise, 5-8 words)
2. message: Notification message (clear call-to-action)
3. priority: normal, high, or urgent
4. notification_type: info, success, warning, or alert
5. suggestions: 3 alternative notification messages
6. best_practices: One tip for effective notifications`;

    case 'create_task':
      return `${baseContext}

Generate a task creation configuration.

Provide:
1. title: Task title (action-oriented, use {{variable}} for dynamic values)
2. description: Task description (clear, specific)
3. priority: low, medium, high, or urgent
4. due_date: Relative date (e.g., "+1d" for tomorrow, "+1w" for next week)
5. category: Task category
6. suggestions: 3 alternative task configurations
7. best_practices: One tip for automated task management`;

    case 'create_event':
      return `${baseContext}

Generate an event creation configuration.

Provide:
1. title: Event title (use {{variable}} for dynamic values)
2. description: Event description
3. duration: Duration in minutes (default: 30)
4. category: Event category
5. location: Default location or "TBD"
6. suggestions: 3 alternative event configurations
7. best_practices: One tip for automated calendar management`;

    case 'send_slack_message':
      return `${baseContext}

Generate a Slack message configuration.

Provide:
1. channel: Slack channel name (e.g., #general, #team-updates)
2. message: Message text (casual but professional, use {{variable}})
3. thread_reply: Whether to reply in thread (true/false)
4. suggestions: 3 alternative message formats
5. best_practices: One tip for effective Slack automation`;

    default:
      return `${baseContext}

Generate a configuration for workflow step type: ${stepType}.

Provide sensible defaults and best practices for this step type.`;
  }
}