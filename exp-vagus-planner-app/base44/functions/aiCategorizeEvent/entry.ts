import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event } = await req.json();

    // Use AI to categorize the event
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this calendar event and categorize it. Consider the title, description, location, and time.

Event Details:
- Title: ${event.title}
- Description: ${event.description || 'No description'}
- Location: ${event.location || 'No location'}
- Start: ${event.start_date}
- End: ${event.end_date}

Based on this information:
1. Assign ONE primary category from: work, personal, health, prayer, holiday, family, social, other
2. Suggest 2-3 relevant tags (e.g., meeting, exercise, mosque, birthday, etc.)
3. Estimate the priority level: low, medium, high

Return the result as a JSON object.`,
      response_json_schema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["work", "personal", "health", "prayer", "holiday", "family", "social", "other"]
          },
          tags: {
            type: "array",
            items: { type: "string" }
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          reasoning: {
            type: "string"
          }
        }
      }
    });

    return Response.json({
      success: true,
      category: result.category,
      tags: result.tags,
      priority: result.priority,
      reasoning: result.reasoning
    });

  } catch (error) {
    console.error('Error categorizing event:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});