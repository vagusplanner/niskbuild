import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { destination, origin, start_date, end_date, trip_type, num_travelers, halal_mode } = await req.json();
    const tripDays = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;

    const halalInstructions = halal_mode ? `
ISLAMIC / HALAL REQUIREMENTS (mandatory):
- Schedule activities AROUND the 5 daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha)
- Include mosque visits and prayer times in the itinerary
- Only suggest halal-certified restaurants and cafes
- Avoid nightclubs, bars, casinos, alcohol-related venues
- For each food activity, add a halal_note field confirming halal status
- Include modest dress code tips for the destination
- Suggest Islamic historical and cultural sites to visit
- Include time for Jumu'ah (Friday prayer) if trip covers Friday
- Recommend family-friendly, Islamic-compliant activities
- Add packing items: prayer mat, compass (for qibla), ihram (if Hajj/Umrah)
` : '';

    const prompt = `You are a travel expert. Return ONLY a valid JSON object (no markdown, no explanation) for this trip:
Destination: ${destination}
Origin: ${origin || 'London, UK'}
Dates: ${start_date} to ${end_date} (${tripDays} days)
Type: ${trip_type || 'leisure'}, Travelers: ${num_travelers || 1}
${halalInstructions}

JSON structure:
{
  "packing_list": [{"category": "Clothing", "items": ["item1","item2"]}, ...],
  "itinerary": [{"day": 1, "date": "${start_date}", "title": "Arrival Day", "activities": [{"time": "14:00", "description": "Check in", "type": "activity", "halal_note": "optional halal note"}]}, ...],
  "travel_tips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "estimated_travel_time_hours": 2,
  "calendar_events": [
    {"title": "✈️ Depart to ${destination}", "description": "Travel day", "start_datetime": "${start_date}T06:00:00", "end_datetime": "${start_date}T14:00:00"},
    {"title": "✈️ Return from ${destination}", "description": "Return travel", "start_datetime": "${end_date}T12:00:00", "end_datetime": "${end_date}T20:00:00"}
  ]
}
Keep itinerary to max 3-4 activities per day. Return only the JSON.`;

    const raw = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });

    // Parse the JSON from the response
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch (e) {
      console.error('JSON parse failed:', e.message);
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    let created = 0;
    for (const ev of (result.calendar_events || [])) {
      try {
        await base44.entities.Event.create({
          title: ev.title,
          description: ev.description || '',
          start_date: ev.start_datetime,
          end_date: ev.end_datetime,
          category: 'holiday',
          is_all_day: false,
          location: destination,
          source: 'app'
        });
        created++;
      } catch (e) { console.error('event err', e.message); }
    }

    return Response.json({ ...result, created_events_count: created });
  } catch (error) {
    console.error('smartTripPlanner error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});