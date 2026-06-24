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

    // Search for travel-related emails
    const queries = [
      'subject:(flight booking confirmation)',
      'subject:(hotel reservation)',
      'subject:(booking.com)',
      'subject:(expedia)',
      'subject:(airbnb)',
      'from:(noreply@booking.com OR confirmations@expedia.com OR automated@airbnb.com)'
    ];

    const bookings = [];

    for (const query of queries) {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
        {
          headers: {
            'Authorization': `Bearer ${gmailToken}`
          }
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      
      if (data.messages) {
        for (const message of data.messages.slice(0, 5)) {
          // Get full message details
          const msgResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: {
                'Authorization': `Bearer ${gmailToken}`
              }
            }
          );

          if (!msgResponse.ok) continue;

          const msgData = await msgResponse.json();
          const headers = msgData.payload.headers;
          
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';

          // Extract booking type
          let type = 'Booking';
          if (subject.toLowerCase().includes('flight')) type = 'Flight';
          else if (subject.toLowerCase().includes('hotel')) type = 'Hotel';
          else if (subject.toLowerCase().includes('airbnb')) type = 'Accommodation';

          // Try to extract confirmation number
          const confirmationMatch = subject.match(/\b([A-Z0-9]{6,})\b/);
          const confirmation = confirmationMatch ? confirmationMatch[1] : 'N/A';

          bookings.push({
            type,
            details: subject,
            date: new Date(date).toLocaleDateString(),
            confirmation,
            from,
            messageId: message.id
          });
        }
      }
    }

    return Response.json({ 
      bookings,
      count: bookings.length 
    });

  } catch (error) {
    console.error('Error scanning emails:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});