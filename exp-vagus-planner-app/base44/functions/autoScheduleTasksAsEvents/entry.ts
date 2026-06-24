import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { addDays, addHours, setHours, setMinutes, parseISO, isBefore, isAfter } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_ids, schedule_preferences } = await req.json();

    // Fetch tasks and existing events
    const tasks = await base44.entities.Task.filter({
      id: { $in: task_ids }
    });

    const events = await base44.entities.Event.list();
    
    // Get user working hours from settings
    const settings = await base44.entities.UserSettings.list();
    const workingHours = {
      start: schedule_preferences?.work_start || 9,
      end: schedule_preferences?.work_end || 17
    };

    // Build AI prompt for optimal scheduling
    const prompt = `As a productivity expert, help schedule these tasks optimally:

Tasks to schedule:
${tasks.map(t => `
- "${t.title}"
  Priority: ${t.priority}
  Due date: ${t.due_date || 'No deadline'}
  Estimated time: ${t.estimated_minutes || 30} minutes
  Category: ${t.category}
`).join('\n')}

Existing events count: ${events.length}
Working hours: ${workingHours.start}:00 - ${workingHours.end}:00

Rules:
1. High/urgent priority tasks should be scheduled earlier
2. Tasks with earlier deadlines should be prioritized
3. Group similar category tasks together when possible
4. Respect working hours
5. Leave 15-minute buffers between tasks
6. Schedule longer tasks (>60 min) in morning when energy is high

For each task, suggest the optimal date and time to schedule it as a calendar event.

Respond with a JSON array of scheduling suggestions:
[{
  "task_id": "task_id_here",
  "suggested_date": "YYYY-MM-DD",
  "suggested_start_time": "HH:MM",
  "reasoning": "brief explanation"
}]`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                suggested_date: { type: "string" },
                suggested_start_time: { type: "string" },
                reasoning: { type: "string" }
              }
            }
          }
        }
      }
    });

    const suggestions = aiResponse.data?.suggestions || [];
    const createdEvents = [];

    // Create events based on AI suggestions
    for (const suggestion of suggestions) {
      const task = tasks.find(t => t.id === suggestion.task_id);
      if (!task) continue;

      const [hours, minutes] = suggestion.suggested_start_time.split(':');
      const startDate = new Date(`${suggestion.suggested_date}T${suggestion.suggested_start_time}:00`);
      const endDate = addMinutes(startDate, task.estimated_minutes || 30);

      const eventData = {
        title: task.title,
        description: `${task.description || ''}\n\n📋 Auto-scheduled from task\n${suggestion.reasoning}`,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        category: task.category,
        is_all_day: false,
        event_id: task.id // Link to task
      };

      const event = await base44.entities.Event.create(eventData);
      createdEvents.push({
        event,
        task,
        reasoning: suggestion.reasoning
      });
    }

    return Response.json({
      success: true,
      scheduled_count: createdEvents.length,
      events: createdEvents,
      message: `Successfully scheduled ${createdEvents.length} task(s) on your calendar`
    });

  } catch (error) {
    console.error('Error auto-scheduling tasks:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}