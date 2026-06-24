import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, messageContent, assignee, dueDate, priority } = await req.json();

    // Use AI to extract task details from message
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract task information from this message and create a clear task title and description:

Message: "${messageContent}"

Create:
1. A concise task title (max 50 chars)
2. A detailed description of what needs to be done
3. Suggested priority (low/normal/high/urgent) based on message tone

Be specific and actionable.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          suggested_priority: { type: "string", enum: ["low", "normal", "high", "urgent"] }
        }
      }
    });

    // Create task
    const task = await base44.asServiceRole.entities.Task.create({
      title: analysis.title,
      description: analysis.description,
      status: 'todo',
      priority: priority || analysis.suggested_priority,
      due_date: dueDate,
      assigned_to: assignee || user.email,
      source_message_id: messageId,
      created_by: user.email
    });

    return Response.json({
      success: true,
      task: task
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});