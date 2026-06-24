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

    // Fetch recent unread emails from last 7 days
    const query = 'is:unread newer_than:7d';
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
      {
        headers: { Authorization: `Bearer ${gmailToken}` }
      }
    );

    const { messages = [] } = await response.json();

    if (messages.length === 0) {
      return Response.json({ success: true, events_found: 0, events: [] });
    }

    const detectedEvents = [];

    // Process each email
    for (const message of messages.slice(0, 10)) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: { Authorization: `Bearer ${gmailToken}` }
        }
      );

      const msgData = await msgResponse.json();
      const subject = msgData.payload.headers.find(h => h.name === 'Subject')?.value || '';
      const from = msgData.payload.headers.find(h => h.name === 'From')?.value || '';
      
      // Get email body
      let body = '';
      if (msgData.payload.body?.data) {
        body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (msgData.payload.parts) {
        const textPart = msgData.payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      }

      // Use AI to detect if this email contains event information
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this email and determine if it contains information about an event, meeting, appointment, or deadline that should be added to a calendar.

Subject: ${subject}
From: ${from}
Body excerpt: ${body.substring(0, 1000)}

If this email mentions a specific event/meeting/appointment, extract:
- Event title
- Date and time
- Location (if mentioned)
- Description/purpose
- Whether it requires action

Today's date: ${new Date().toISOString().split('T')[0]}`,
        response_json_schema: {
          type: 'object',
          properties: {
            contains_event: { type: 'boolean' },
            confidence: { type: 'number' },
            event: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                date: { type: 'string' },
                time: { type: 'string' },
                location: { type: 'string' },
                description: { type: 'string' },
                requires_response: { type: 'boolean' }
              }
            }
          }
        }
      });

      if (analysis.contains_event && analysis.confidence > 0.7) {
        detectedEvents.push({
          email_id: message.id,
          subject,
          from,
          ...analysis.event,
          confidence: analysis.confidence
        });
      }
    }

    return Response.json({
      success: true,
      events_found: detectedEvents.length,
      events: detectedEvents
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});