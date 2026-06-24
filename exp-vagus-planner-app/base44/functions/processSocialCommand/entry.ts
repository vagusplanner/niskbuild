import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { command } = await req.json();

    // Get user's social connections
    const connections = await base44.entities.SocialConnection.filter({
      created_by: user.email,
      status: 'active'
    });

    // Parse command with AI
    const parseContext = `
Parse this natural language scheduling command:
"${command}"

User's friends: ${connections.map(c => c.friend_name).join(', ')}

Extract:
- Who to meet (friend name or relationship like "close friends")
- When (specific date/time or relative like "this weekend", "next Tuesday")
- Duration (if mentioned)
- Activity type (if mentioned)
- Location preference (if mentioned)

Return structured data for scheduling.
    `;

    const parsed = await base44.integrations.Core.InvokeLLM({
      prompt: parseContext,
      response_json_schema: {
        type: 'object',
        properties: {
          friend_names: {
            type: 'array',
            items: { type: 'string' }
          },
          when: { type: 'string' },
          duration_minutes: { type: 'number' },
          activity: { type: 'string' },
          location: { type: 'string' },
          is_group: { type: 'boolean' }
        }
      }
    });

    // Find matching friends
    const matchedFriends = connections.filter(c => 
      parsed.friend_names.some(name => 
        c.friend_name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(c.friend_name.toLowerCase())
      )
    );

    if (matchedFriends.length === 0) {
      return Response.json({
        success: false,
        message: 'Could not identify which friend(s) you want to meet'
      });
    }

    // Calculate date from natural language
    const dateContext = `
Convert "${parsed.when}" to a specific date.
Today is ${new Date().toISOString().split('T')[0]}.
Return ISO date format (YYYY-MM-DD).
    `;

    const dateResult = await base44.integrations.Core.InvokeLLM({
      prompt: dateContext,
      response_json_schema: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          time_suggestion: { type: 'string' }
        }
      }
    });

    // Find optimal times for all friends
    const availabilityResults = [];

    for (const friend of matchedFriends) {
      if (friend.can_see_their_availability) {
        try {
          const availability = await base44.functions.invoke('analyzeSocialAvailability', {
            friend_email: friend.friend_email,
            duration_minutes: parsed.duration_minutes || 60
          });
          availabilityResults.push(availability.data);
        } catch (error) {
          console.error('Failed to check availability:', error);
        }
      }
    }

    // Create event proposal
    const eventTitle = parsed.is_group 
      ? `${parsed.activity || 'Hangout'} with ${matchedFriends.map(f => f.friend_name).join(', ')}`
      : `${parsed.activity || 'Meet'} ${matchedFriends[0].friend_name}`;

    const proposal = {
      title: eventTitle,
      suggested_date: dateResult.date,
      suggested_time: dateResult.time_suggestion || '18:00',
      duration: parsed.duration_minutes || 60,
      activity: parsed.activity,
      location: parsed.location,
      friends: matchedFriends.map(f => f.friend_name),
      ai_recommendations: availabilityResults.length > 0 ? availabilityResults[0].suggestions : []
    };

    return Response.json({
      success: true,
      message: `Understood! Scheduling ${proposal.title}`,
      proposal,
      next_step: 'Confirm to create event or adjust details'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});