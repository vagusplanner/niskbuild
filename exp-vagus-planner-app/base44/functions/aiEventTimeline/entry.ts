import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_name, event_date, event_type, attendees, venue_type } = await req.json();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a comprehensive event planning timeline with task dependencies. Format as JSON.

Event Details:
- Name: ${event_name}
- Date: ${event_date}
- Type: ${event_type}
- Attendees: ${attendees}
- Venue Type: ${venue_type}

Generate a detailed timeline with tasks in this JSON format:
{
  "timeline": [
    {
      "phase": "Phase Name",
      "timeline": "X weeks/days before event",
      "tasks": [
        {
          "task_id": "T1",
          "title": "Task Title",
          "duration": "X days",
          "priority": "high/medium/low",
          "description": "What needs to be done",
          "dependencies": ["T0"],
          "resources_needed": ["resource1", "resource2"],
          "cost_estimate": "estimated cost"
        }
      ]
    }
  ],
  "critical_path": ["T1", "T2", "T3"],
  "total_days_needed": number,
  "risk_factors": ["risk1", "risk2"],
  "timeline_tips": ["tip1", "tip2"]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                phase: { type: 'string' },
                timeline: { type: 'string' },
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string' },
                      title: { type: 'string' },
                      duration: { type: 'string' },
                      priority: { type: 'string' },
                      description: { type: 'string' },
                      dependencies: { type: 'array', items: { type: 'string' } },
                      resources_needed: { type: 'array', items: { type: 'string' } },
                      cost_estimate: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          critical_path: { type: 'array', items: { type: 'string' } },
          total_days_needed: { type: 'number' },
          risk_factors: { type: 'array', items: { type: 'string' } },
          timeline_tips: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});