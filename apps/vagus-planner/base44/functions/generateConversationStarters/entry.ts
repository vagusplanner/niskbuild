import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friend_email } = await req.json();

    // Get connection details
    const connections = await base44.entities.SocialConnection.filter({
      friend_email,
      created_by: user.email,
      status: 'active'
    });

    if (connections.length === 0) {
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    const connection = connections[0];

    // Get recent events and context
    const [myEvents, friendEvents, myGoals] = await Promise.all([
      base44.entities.Event.list('-date', 20),
      base44.asServiceRole.entities.Event.filter({ 
        created_by: friend_email 
      }, '-date', 20),
      base44.entities.Goal.filter({ status: 'in_progress' })
    ]);

    // Find shared calendar events
    const sharedEvents = myEvents.filter(e => 
      e.title.toLowerCase().includes(connection.friend_name.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(connection.friend_name.toLowerCase()))
    );

    const context = `
Generate conversation starters for meeting with ${connection.friend_name}.

Relationship: ${connection.relationship}
Shared interests: ${(connection.shared_interests || []).join(', ')}
Last met: ${connection.last_meetup || 'a while ago'}
Past activities together: ${(connection.preferred_activities || ['general hangout']).join(', ')}

My recent events: ${myEvents.slice(0, 5).map(e => e.title).join(', ')}
My current goals: ${myGoals.map(g => g.title).join(', ')}

Generate 5-7 conversation starters that are:
1. Personalized based on shared interests
2. Based on recent activities or upcoming events
3. Natural and engaging (not awkward)
4. Mix of light and deeper topics
5. Questions that invite storytelling

Include icebreakers for:
- Opening the conversation
- During the meetup
- Follow-up topics if conversation stalls
    `;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: context,
      response_json_schema: {
        type: 'object',
        properties: {
          conversation_starters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                starter: { type: 'string' },
                follow_up: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Create or update suggestion
    await base44.entities.SocialSuggestion.create({
      friend_email,
      suggestion_type: 'conversation_starter',
      title: `Talk to ${connection.friend_name}`,
      description: 'AI-generated conversation topics',
      conversation_starters: aiResponse.conversation_starters.map(c => 
        `${c.category}: ${c.starter}${c.follow_up ? ` (Follow-up: ${c.follow_up})` : ''}`
      ),
      reasoning: 'Based on shared interests and recent activities'
    });

    return Response.json({
      success: true,
      friend: connection.friend_name,
      starters: aiResponse.conversation_starters
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});