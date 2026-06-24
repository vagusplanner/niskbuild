import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { participants, title, date, duration_minutes = 60 } = await req.json();

        if (!participants || participants.length === 0) {
            return Response.json({ error: 'Participants required' }, { status: 400 });
        }

        // Get all participants' events for the target date
        const allEvents = await base44.entities.Event.list('-created_date', 500);
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        // Filter events for target date and participants
        const participantEvents = allEvents.filter(e => 
            e.date === targetDate && 
            (e.created_by === user.email || participants.includes(e.created_by))
        );

        // Get past similar meetings for location suggestions
        const pastMeetings = allEvents.filter(e => 
            e.title?.toLowerCase().includes(title?.toLowerCase() || '') ||
            e.category === 'work'
        ).slice(0, 20);

        // Analyze participant availability and patterns
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze this scheduling request and suggest optimal meeting details:

Meeting: "${title || 'New Meeting'}"
Date: ${targetDate}
Duration: ${duration_minutes} minutes
Participants: ${participants.join(', ')}

Existing events on ${targetDate}:
${JSON.stringify(participantEvents.map(e => ({ 
    title: e.title, 
    start: e.start_time, 
    end: e.end_time,
    owner: e.created_by 
})))}

Past similar meetings:
${JSON.stringify(pastMeetings.map(e => ({ 
    title: e.title, 
    location: e.location, 
    start_time: e.start_time,
    duration: e.duration_minutes 
})))}

Suggest:
1. Three optimal time slots (avoiding conflicts)
2. Best location based on past meetings and meeting type
3. Recommended duration if different from requested
4. Brief explanation for each suggestion`,
            response_json_schema: {
                type: "object",
                properties: {
                    suggested_times: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                start_time: { type: "string" },
                                end_time: { type: "string" },
                                confidence: { type: "number" },
                                reason: { type: "string" }
                            }
                        }
                    },
                    suggested_location: {
                        type: "object",
                        properties: {
                            location: { type: "string" },
                            reason: { type: "string" }
                        }
                    },
                    recommended_duration: { type: "number" },
                    overall_recommendation: { type: "string" }
                }
            }
        });

        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});