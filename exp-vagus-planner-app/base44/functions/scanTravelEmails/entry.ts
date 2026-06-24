import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { destination, start_date, end_date } = await req.json();

    // Get Gmail access token via connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build a targeted query — include destination filter if provided
    const dateFilter = 'after:2025/01/01';
    const destFilter = destination ? `"${destination}" ` : '';
    const queries = [
      `${destFilter}(booking confirmation OR flight confirmation OR hotel reservation OR travel confirmation) ${dateFilter}`,
      `${destFilter}(your booking OR booking reference OR e-ticket OR itinerary) ${dateFilter}`,
    ];

    const seen = new Set();
    const bookings = [];

    for (const query of queries) {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`;
      const searchRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!searchRes.ok) {
        console.error('Gmail search failed:', await searchRes.text());
        continue;
      }
      const searchData = await searchRes.json();
      if (!searchData.messages) continue;

      for (const msg of searchData.messages.slice(0, 8)) {
        if (seen.has(msg.id)) continue;
        seen.add(msg.id);

        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (!msgRes.ok) continue;
        const msgData = await msgRes.json();

        const headers = msgData.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const dateHeader = headers.find(h => h.name === 'Date')?.value || '';

        // Extract body text
        let body = '';
        const extractBody = (parts) => {
          for (const part of (parts || [])) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            } else if (part.parts) {
              extractBody(part.parts);
            }
          }
        };
        if (msgData.payload?.body?.data) {
          body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else {
          extractBody(msgData.payload?.parts);
        }

        try {
          const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Extract travel booking details from this email. Return is_booking=false if it's not a genuine travel booking confirmation.

Subject: ${subject}
From: ${from}
Date: ${dateHeader}
Body (first 2500 chars): ${body.substring(0, 2500)}

Extract and return JSON with:
- is_booking: boolean (true only for confirmed bookings)
- title: short title e.g. "Flight to Dubai — EK123"
- type: one of "flight", "hotel", "car", "train", "cruise", "tour", "activity", "other"
- date: travel/check-in date in format "DD MMM YYYY"
- time: departure or check-in time if available e.g. "14:30"
- end_date: return/check-out date YYYY-MM-DD
- details: 1-2 sentence summary of the booking
- reference: booking/confirmation/PNR number
- passengers: number or names if flight
- price: total price if visible
- from_email: sender email`,
            response_json_schema: {
              type: "object",
              properties: {
                is_booking: { type: "boolean" },
                title: { type: "string" },
                type: { type: "string" },
                date: { type: "string" },
                time: { type: "string" },
                end_date: { type: "string" },
                details: { type: "string" },
                reference: { type: "string" },
                passengers: { type: "string" },
                price: { type: "string" },
                from_email: { type: "string" }
              }
            }
          });

          if (extracted.is_booking) {
            bookings.push({
              gmail_id: msg.id,
              subject,
              from_email: from,
              ...extracted,
            });
          }
        } catch (e) {
          console.error('AI extraction error:', e.message);
        }
      }
    }

    // Deduplicate by reference number
    const unique = bookings.filter((b, i, arr) =>
      !b.reference || arr.findIndex(x => x.reference === b.reference) === i
    );

    console.log(`Found ${unique.length} booking confirmations for destination: ${destination || 'any'}`);
    return Response.json({ bookings: unique, count: unique.length });

  } catch (error) {
    console.error('scanTravelEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});