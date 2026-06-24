import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message } = await req.json();
    if (!message?.trim()) return Response.json({ error: 'No message provided' }, { status: 400 });

    console.log('Parsing travel message, length:', message.length);

    // ── Step 1: AI extraction ─────────────────────────────────────────────────
    const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a travel booking parser. Extract structured data from this travel-related message or email. It could be a flight receipt, hotel booking, car hire, train ticket, or any travel confirmation.

Message:
${message.substring(0, 3000)}

Extract all bookings found. For each booking return:
- booking_type: "flight" | "hotel" | "car" | "train" | "cruise" | "activity" | "other"
- title: short descriptive title e.g. "Flight LHR→DXB (EK101)" or "Hotel: The Ritz, Paris"
- destination: destination city/country name
- arrival_date: YYYY-MM-DD (departure date for flights, check-in for hotels)
- departure_date: YYYY-MM-DD (return/check-out date)
- arrival_time: HH:MM 24h if available
- departure_time: HH:MM 24h if available  
- reference: booking/PNR/confirmation number
- notes: any useful details (airline, hotel name, seat, room type)
- travel_buffer_before_mins: recommended buffer before event in minutes (e.g. 120 for flights, 30 for hotels)
- travel_buffer_after_mins: recommended buffer after event in minutes`,
      response_json_schema: {
        type: 'object',
        properties: {
          bookings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                booking_type: { type: 'string' },
                title: { type: 'string' },
                destination: { type: 'string' },
                arrival_date: { type: 'string' },
                departure_date: { type: 'string' },
                arrival_time: { type: 'string' },
                departure_time: { type: 'string' },
                reference: { type: 'string' },
                notes: { type: 'string' },
                travel_buffer_before_mins: { type: 'number' },
                travel_buffer_after_mins: { type: 'number' },
              }
            }
          }
        }
      }
    });

    const bookings = extracted?.bookings || [];
    if (!bookings.length) {
      return Response.json({ bookings: [], events: [], contexts: [], message: 'No travel bookings found in this message.' });
    }

    // ── Step 2: Geocode destinations ─────────────────────────────────────────
    const geoResults = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Return approximate latitude and longitude for each of these travel destinations. Be accurate.
Destinations: ${[...new Set(bookings.map(b => b.destination).filter(Boolean))].join(', ')}`,
      response_json_schema: {
        type: 'object',
        properties: {
          locations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                destination: { type: 'string' },
                lat: { type: 'number' },
                lng: { type: 'number' }
              }
            }
          }
        }
      }
    });

    const geoMap = {};
    for (const loc of (geoResults?.locations || [])) {
      if (loc.destination) geoMap[loc.destination.toLowerCase()] = { lat: loc.lat, lng: loc.lng };
    }

    // ── Step 3: Create calendar events with travel buffers ────────────────────
    const createdEvents = [];
    const createdContexts = [];

    for (const b of bookings) {
      if (!b.arrival_date) continue;

      const bufferBefore = b.travel_buffer_before_mins || (b.booking_type === 'flight' ? 120 : 30);
      const bufferAfter  = b.travel_buffer_after_mins  || (b.booking_type === 'flight' ? 60  : 30);

      // Main event
      const startHour = b.arrival_time || '09:00';
      const startDT = `${b.arrival_date}T${startHour}:00`;
      const endDate  = b.departure_date || b.arrival_date;
      const endHour  = b.departure_time || startHour;
      const endDT    = `${endDate}T${endHour}:00`;

      const eventPayload = {
        title: `✈️ ${b.title}`,
        description: [b.notes, b.reference ? `Ref: ${b.reference}` : ''].filter(Boolean).join('\n'),
        start_date: startDT,
        end_date: endDT,
        category: 'holiday',
        location: b.destination || '',
        is_all_day: !b.arrival_time,
        source: 'app',
        is_synced: false,
      };

      let mainEvent;
      try {
        mainEvent = await base44.entities.Event.create(eventPayload);
        createdEvents.push(mainEvent);
        console.log('Created event:', mainEvent.id, b.title);
      } catch (e) {
        console.error('Event creation failed:', e.message);
        continue;
      }

      // Buffer event BEFORE (e.g. travel to airport)
      if (b.arrival_time) {
        const bufStart = new Date(`${b.arrival_date}T${b.arrival_time}:00`);
        bufStart.setMinutes(bufStart.getMinutes() - bufferBefore);
        const bufEnd = new Date(`${b.arrival_date}T${b.arrival_time}:00`);
        try {
          const bufEvent = await base44.entities.Event.create({
            title: `🚗 Travel buffer — ${b.title}`,
            description: `Allow ${bufferBefore} min before ${b.title}`,
            start_date: bufStart.toISOString(),
            end_date: bufEnd.toISOString(),
            category: 'holiday',
            location: b.destination || '',
            source: 'app',
            is_synced: false,
          });
          createdEvents.push(bufEvent);
        } catch (e) {
          console.error('Buffer event error:', e.message);
        }
      }

      // ── Step 4: Store TravelContext ────────────────────────────────────────
      const geoKey = (b.destination || '').toLowerCase();
      const geo = Object.keys(geoMap).find(k => geoKey.includes(k) || k.includes(geoKey));
      const coords = geo ? geoMap[geo] : {};

      try {
        const ctx = await base44.entities.TravelContext.create({
          trip_title: b.title,
          destination: b.destination || '',
          destination_lat: coords.lat || null,
          destination_lng: coords.lng || null,
          arrival_date: b.arrival_date,
          departure_date: b.departure_date || b.arrival_date,
          booking_type: b.booking_type || 'other',
          booking_reference: b.reference || '',
          raw_message: message.substring(0, 500),
          calendar_event_ids: mainEvent ? [mainEvent.id] : [],
          is_active: false,
        });
        createdContexts.push(ctx);
      } catch (e) {
        console.error('TravelContext creation failed:', e.message);
      }
    }

    return Response.json({
      bookings,
      events: createdEvents,
      contexts: createdContexts,
      message: `Parsed ${bookings.length} booking(s), created ${createdEvents.length} calendar event(s).`
    });

  } catch (error) {
    console.error('parseTravelMessage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});