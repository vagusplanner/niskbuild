import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposedTime, participants, duration = 60 } = await req.json();
    
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    
    const proposedStart = new Date(proposedTime);
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60 * 1000);
    
    // Check conflicts for all participants
    const conflictChecks = await Promise.all(
      participants.map(async (email) => {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/freeBusy`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timeMin: proposedStart.toISOString(),
              timeMax: proposedEnd.toISOString(),
              items: [{ id: email }],
            }),
          }
        );
        
        const data = await response.json();
        const busySlots = data.calendars?.[email]?.busy || [];
        
        return {
          email,
          hasConflict: busySlots.length > 0,
          conflicts: busySlots
        };
      })
    );
    
    const hasConflicts = conflictChecks.some(c => c.hasConflict);
    
    if (hasConflicts) {
      // Generate alternative suggestions
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const busyTimesAll = await Promise.all(
        participants.map(async (email) => {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/freeBusy`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                timeMin: now.toISOString(),
                timeMax: weekLater.toISOString(),
                items: [{ id: email }],
              }),
            }
          );
          
          const data = await response.json();
          return { email, busy: data.calendars?.[email]?.busy || [] };
        })
      );
      
      const aiSuggestions = await base44.integrations.Core.InvokeLLM({
        prompt: `A meeting was proposed for ${proposedTime} but conflicts were detected:
${JSON.stringify(conflictChecks.filter(c => c.hasConflict), null, 2)}

Suggest 3 alternative time slots that avoid these conflicts. Consider all participants' busy times:
${JSON.stringify(busyTimesAll, null, 2)}

Duration: ${duration} minutes. Prefer times close to the original proposal.`,
        response_json_schema: {
          type: "object",
          properties: {
            alternatives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start: { type: "string" },
                  end: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      return Response.json({
        hasConflicts: true,
        conflicts: conflictChecks.filter(c => c.hasConflict),
        alternatives: aiSuggestions.alternatives
      });
    }
    
    return Response.json({ hasConflicts: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});