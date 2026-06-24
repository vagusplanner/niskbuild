import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Gmail access token
    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // Fetch recent emails (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const query = `after:${Math.floor(sevenDaysAgo.getTime() / 1000)} (booking OR reservation OR flight OR hotel OR "meeting invite" OR calendar)`;

    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      {
        headers: { Authorization: `Bearer ${gmailToken}` }
      }
    );

    if (!messagesResponse.ok) {
      throw new Error(`Gmail API error: ${messagesResponse.statusText}`);
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];

    let eventsCreated = 0;
    const createdEvents = [];

    // Process each message
    for (const message of messages.slice(0, 20)) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: { Authorization: `Bearer ${gmailToken}` }
        }
      );

      const msgData = await msgResponse.json();
      const snippet = msgData.snippet || '';
      const subject = msgData.payload.headers.find(h => h.name === 'Subject')?.value || '';

      // Use AI to extract event information
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this email and extract any calendar event information. If this looks like a booking, reservation, flight, hotel, or meeting invite, extract the details.

Subject: ${subject}
Content: ${snippet}

Extract:
1. Is this a calendar-worthy event? (booking, reservation, flight, hotel, meeting)
2. Event title
3. Start date and time (ISO format)
4. End date and time (ISO format)
5. Location
6. Category (work, travel, personal, etc.)
7. Brief description

Return null if this is not a calendar event.`,
        response_json_schema: {
          type: "object",
          properties: {
            is_event: { type: "boolean" },
            title: { type: "string" },
            start_date: { type: "string" },
            end_date: { type: "string" },
            location: { type: "string" },
            category: { type: "string" },
            description: { type: "string" }
          }
        }
      });

      if (aiResult.is_event && aiResult.title) {
        // Check if event already exists
        const existing = await base44.entities.Event.filter({
          title: aiResult.title,
          start_date: aiResult.start_date
        });

        if (existing.length === 0) {
          const newEvent = await base44.entities.Event.create({
            title: aiResult.title,
            description: aiResult.description || `Auto-imported from Gmail: ${subject}`,
            start_date: aiResult.start_date,
            end_date: aiResult.end_date,
            location: aiResult.location,
            category: aiResult.category || 'personal',
            source: 'app',
            notes: `📧 Detected from email: "${subject}"`
          });

          eventsCreated++;
          createdEvents.push(newEvent);
        }
      }
    }

    console.log(`Gmail scan complete: ${eventsCreated} events created from ${messages.length} emails`);

    return Response.json({
      success: true,
      events_created: eventsCreated,
      emails_scanned: messages.length,
      events: createdEvents
    });

  } catch (error) {
    console.error('Gmail scan error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Response.json({
      error: error.message || 'Failed to scan Gmail'
    }, { status: 500 });
  }
});