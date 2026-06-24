import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { holiday_id } = await req.json();

    // Fetch holiday details and comments
    const [holiday, comments, shares] = await Promise.all([
      base44.entities.Holiday.filter({ id: holiday_id }),
      base44.entities.EventComment.filter({ event_id: holiday_id }),
      base44.entities.HolidayShare.filter({ holiday_id, status: 'accepted' })
    ]);

    if (!holiday[0]) {
      return Response.json({ error: 'Holiday not found' }, { status: 404 });
    }

    const holidayData = holiday[0];

    const prompt = `Summarize this group discussion about a holiday trip:

TRIP: ${holidayData.title} to ${holidayData.destination}
DATES: ${holidayData.start_date} to ${holidayData.end_date}
COLLABORATORS: ${shares.length + 1} people

DISCUSSION COMMENTS:
${comments.map(c => `- ${c.user_name}: ${c.message}`).join('\n')}

Provide a concise summary covering:
1. Key decisions made
2. Open questions or concerns
3. Action items needed
4. Consensus points
5. Areas of disagreement

Keep it brief and actionable.`;

    const { data } = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          key_decisions: {
            type: "array",
            items: { type: "string" }
          },
          open_questions: {
            type: "array",
            items: { type: "string" }
          },
          action_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                suggested_owner: { type: "string" }
              }
            }
          },
          consensus: {
            type: "array",
            items: { type: "string" }
          },
          disagreements: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});