import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { holiday_id, duration_minutes = 60 } = await req.json();

    // Fetch collaborators
    const [holiday, shares] = await Promise.all([
      base44.entities.Holiday.filter({ id: holiday_id }),
      base44.entities.HolidayShare.filter({ holiday_id, status: 'accepted' })
    ]);

    if (!holiday[0]) {
      return Response.json({ error: 'Holiday not found' }, { status: 404 });
    }

    const holidayData = holiday[0];
    const collaboratorEmails = [holidayData.created_by, ...shares.map(s => s.shared_with)];

    // Fetch all events for collaborators in the next 2 weeks
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const allEvents = await base44.asServiceRole.entities.Event.list();
    const relevantEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      return collaboratorEmails.includes(event.created_by) && 
             eventDate >= new Date() && 
             eventDate <= twoWeeksFromNow;
    });

    // Build availability summary
    const availabilitySummary = {};
    for (const email of collaboratorEmails) {
      const userEvents = relevantEvents.filter(e => e.created_by === email);
      availabilitySummary[email] = userEvents.map(e => ({
        date: e.date,
        start: e.start_time,
        end: e.end_time,
        title: e.title
      }));
    }

    const prompt = `Suggest 5 optimal meeting times for ${collaboratorEmails.length} collaborators planning a trip:

TRIP: ${holidayData.title}
DURATION: ${duration_minutes} minutes
COLLABORATORS: ${collaboratorEmails.join(', ')}

CURRENT SCHEDULES (next 2 weeks):
${Object.entries(availabilitySummary).map(([email, events]) => `
${email}:
${events.length > 0 ? events.map(e => `  - ${e.date} ${e.start}-${e.end}: ${e.title}`).join('\n') : '  No events scheduled'}
`).join('\n')}

Find times when ALL collaborators are likely available. Consider:
- Working hours (9am-6pm)
- Avoid early mornings or late evenings
- Prefer mid-week over Monday/Friday
- Look for gaps between existing meetings

Suggest date, start time, and end time in ISO format.`;

    const { data } = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                start_time: { type: "string" },
                end_time: { type: "string" },
                confidence: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});