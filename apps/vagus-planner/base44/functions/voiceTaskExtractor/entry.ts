import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * voiceTaskExtractor
 *
 * Accepts a voice transcript and extracts structured tasks/events/errands using AI.
 * Returns structured items ready to be saved to Task and Event entities.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { transcript } = payload;

    if (!transcript || transcript.trim().length < 3) {
      return Response.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Use AI to extract structured tasks, events, and errands from transcript
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a smart assistant that extracts tasks, errands, and calendar events from a voice transcript.

Today's date is: ${today}
User's voice transcript: "${transcript}"

Extract ALL actionable items (tasks, errands, appointments, reminders, calendar events) from the transcript.
For each item determine:
- Is it a TASK (something to do, an errand, a to-do item) or an EVENT (something with a specific time/date)?
- The title (concise, action-oriented)
- Priority: urgent, high, medium, or low
- Category: work, personal, health, shopping, learning, home, other
- Due date (YYYY-MM-DD) if mentioned or implied (e.g. "tomorrow", "next Monday", "Friday")
- Due time (HH:MM 24h) if mentioned
- Estimated duration in minutes for tasks
- For events: start time (HH:MM 24h) and end time

Be smart about context — "pick up milk" = shopping task, "meeting with John at 3pm" = event, "call the doctor" = personal task.
If no due date mentioned, leave it null.`,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['task', 'event'] },
                title: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                category: { type: 'string' },
                due_date: { type: 'string' },
                due_time: { type: 'string' },
                estimated_minutes: { type: 'number' },
                event_start_time: { type: 'string' },
                event_end_time: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          },
          summary: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      transcript,
      extracted: result.items || [],
      summary: result.summary || '',
      extracted_count: (result.items || []).length
    });

  } catch (error) {
    console.error('voiceTaskExtractor error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});