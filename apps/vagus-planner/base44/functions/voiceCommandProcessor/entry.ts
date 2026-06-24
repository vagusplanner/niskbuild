import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { command } = await req.json();

    if (!command) {
      return Response.json({ error: 'Command text required' }, { status: 400 });
    }

    // Use AI to parse the voice command
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Parse this voice command into a structured action. Today is ${new Date().toISOString().split('T')[0]}.

Voice command: "${command}"

Determine the intent and extract relevant information. Support these intents:
- create_event: Schedule meetings, appointments, events
- create_task: Add tasks or to-dos
- query_schedule: Ask about schedule ("What's my schedule today?", "Am I free tomorrow?")
- find_time: Find available slots ("When am I free this week?")
- reschedule: Move or postpone events
- cancel: Delete events or tasks
- set_reminder: Create reminders
- prayer_times: Check prayer times

Return the parsed command with all extracted details.`,
      response_json_schema: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            enum: ['create_event', 'create_task', 'query_schedule', 'find_time', 'reschedule', 'cancel', 'set_reminder', 'prayer_times', 'unknown']
          },
          confidence: { type: 'number' },
          entities: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              date: { type: 'string' },
              time: { type: 'string' },
              duration: { type: 'number' },
              location: { type: 'string' },
              participants: { type: 'array', items: { type: 'string' } },
              priority: { type: 'string' },
              category: { type: 'string' }
            }
          },
          action: { type: 'string' },
          response_message: { type: 'string' }
        }
      }
    });

    // Execute the action based on intent
    let actionResult = null;

    switch (result.intent) {
      case 'create_event':
        const startDate = new Date(result.entities.date || new Date());
        if (result.entities.time) {
          const [hours, minutes] = result.entities.time.split(':');
          startDate.setHours(parseInt(hours), parseInt(minutes), 0);
        }
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + (result.entities.duration || 60));

        actionResult = await base44.entities.Event.create({
          title: result.entities.title,
          description: result.entities.description,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          location: result.entities.location,
          category: result.entities.category || 'personal',
          created_by: user.email
        });
        break;

      case 'create_task':
        actionResult = await base44.entities.Task.create({
          title: result.entities.title,
          description: result.entities.description,
          priority: result.entities.priority || 'medium',
          status: 'todo',
          due_date: result.entities.date,
          category: result.entities.category || 'personal',
          created_by: user.email
        });
        break;

      case 'query_schedule':
        const queryDate = result.entities.date || new Date().toISOString().split('T')[0];
        const events = await base44.entities.Event.filter({
          start_date: { $gte: `${queryDate}T00:00:00.000Z` },
          end_date: { $lte: `${queryDate}T23:59:59.999Z` }
        });
        
        actionResult = {
          events: events.length,
          summary: events.map(e => `${e.title} at ${new Date(e.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`).join(', ') || 'No events scheduled'
        };
        break;

      case 'prayer_times':
        const settings = await base44.entities.UserSettings.filter({ created_by: user.email });
        if (settings.length > 0) {
          actionResult = {
            message: `Prayer times are configured for ${settings[0].location_city}. Check the Islamic page for today's schedule.`,
            location: settings[0].location_city
          };
        }
        break;
    }

    return Response.json({
      success: true,
      intent: result.intent,
      confidence: result.confidence,
      response: result.response_message,
      action_result: actionResult
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});