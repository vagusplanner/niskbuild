import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function scans Gmail for calendar-related emails
    // and auto-schedules events (flights, hotel bookings, etc.)
    
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    
    // Search for booking confirmations in the last 7 days
    const searchQuery = 'subject:(booking confirmation OR reservation OR ticket) newer_than:7d';
    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const searchData = await searchResponse.json();
    const messages = searchData.messages || [];
    
    const scheduledEvents = [];
    
    for (const message of messages.slice(0, 10)) { // Limit to 10 recent
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`;
      const msgResponse = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const msgData = await msgResponse.json();
      
      // Get email body
      let emailBody = '';
      if (msgData.payload.body.data) {
        emailBody = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (msgData.payload.parts) {
        const textPart = msgData.payload.parts.find(p => p.mimeType === 'text/plain' || p.mimeType === 'text/html');
        if (textPart && textPart.body.data) {
          emailBody = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      }
      
      // Use AI to extract booking details
      const extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `
Extract booking/event details from this email:

${emailBody.substring(0, 2000)}

Extract:
- Event type (flight, hotel, restaurant, conference, etc.)
- Title
- Date
- Time
- Location
- Confirmation number
- Any other relevant details

Return null if this is not a bookable event.
        `,
        response_json_schema: {
          type: 'object',
          properties: {
            is_bookable_event: { type: 'boolean' },
            event_type: { type: 'string' },
            title: { type: 'string' },
            date: { type: 'string' },
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            location: { type: 'string' },
            confirmation: { type: 'string' },
            details: { type: 'string' }
          }
        }
      });
      
      if (extraction.is_bookable_event && extraction.date) {
        // Get user email from message headers
        const fromHeader = msgData.payload.headers.find(h => h.name === 'Delivered-To');
        const userEmail = fromHeader?.value;
        
        if (userEmail) {
          // Check if event already exists
          const existing = await base44.asServiceRole.entities.Event.filter({
            date: extraction.date,
            title: { $regex: extraction.title, $options: 'i' },
            created_by: userEmail
          });
          
          if (existing.length === 0) {
            const event = await base44.asServiceRole.entities.Event.create({
              title: extraction.title,
              description: `${extraction.details}\n\nConfirmation: ${extraction.confirmation}\n\nAuto-scheduled from email`,
              date: extraction.date,
              start_time: extraction.start_time || '09:00',
              end_time: extraction.end_time || '10:00',
              location: extraction.location,
              category: extraction.event_type === 'flight' ? 'holiday' : 'personal',
              reminder_minutes: 120,
              color: '#6366f1',
              created_by: userEmail
            });
            
            scheduledEvents.push({
              user: userEmail,
              title: extraction.title,
              date: extraction.date,
              type: extraction.event_type
            });
          }
        }
      }
    }
    
    return Response.json({
      message: 'Email scanning completed',
      events_scheduled: scheduledEvents.length,
      details: scheduledEvents
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});