import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email_text } = await req.json();

    if (!email_text) {
      return Response.json({ error: 'Email text is required' }, { status: 400 });
    }

    // Use AI to parse the email invite
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Parse this email invitation and extract event details. Be precise with dates and times.

Email content:
${email_text}

Extract and return the following information in JSON format:
- title: Event title/subject
- description: Event description or purpose
- date: Event date in YYYY-MM-DD format (if not specified, suggest next appropriate date)
- start_time: Start time in HH:mm format (24-hour)
- end_time: End time in HH:mm format (24-hour)
- location: Physical or virtual location (Zoom, Google Meet, address, etc.)
- attendees: Array of email addresses mentioned
- is_all_day: Boolean (true if it's an all-day event)
- category: Choose from: work, personal, health, prayer, holiday, family, social, other
- notes: Any additional important information

If you cannot find certain information, leave those fields empty. Be smart about inferring details from context.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          date: { type: "string" },
          start_time: { type: "string" },
          end_time: { type: "string" },
          location: { type: "string" },
          attendees: { 
            type: "array",
            items: { type: "string" }
          },
          is_all_day: { type: "boolean" },
          category: { type: "string" },
          notes: { type: "string" },
          confidence: { type: "string" }
        }
      }
    });

    // Add helpful suggestions
    const suggestions = [];
    if (!result.date) {
      suggestions.push('No date found - please specify the event date');
    }
    if (!result.start_time) {
      suggestions.push('No time found - please set a start time');
    }
    if (result.location && (result.location.includes('zoom') || result.location.includes('meet'))) {
      suggestions.push('Virtual meeting detected - link included in location');
    }

    return Response.json({
      event_data: result,
      suggestions,
      raw_email: email_text.substring(0, 200) + '...'
    });

  } catch (error) {
    console.error('Error parsing email invite:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});