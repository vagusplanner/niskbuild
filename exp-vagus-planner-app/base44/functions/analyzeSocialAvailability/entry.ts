import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friend_email, duration_minutes = 60 } = await req.json();

    // Get connection details
    const connections = await base44.entities.SocialConnection.filter({
      friend_email,
      created_by: user.email,
      status: 'active',
      can_see_their_availability: true
    });

    if (connections.length === 0) {
      return Response.json({ 
        error: 'No permission to view this friend\'s availability' 
      }, { status: 403 });
    }

    const connection = connections[0];

    // Get next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    // Get both users' events
    const [myEvents, friendEvents] = await Promise.all([
      base44.entities.Event.filter({ 
        date: { $in: dates },
        created_by: user.email 
      }),
      base44.asServiceRole.entities.Event.filter({ 
        date: { $in: dates },
        created_by: friend_email 
      })
    ]);

    // Get user settings for work hours
    const [mySettings, friendSettings] = await Promise.all([
      base44.entities.UserSettings.filter({ created_by: user.email }),
      base44.asServiceRole.entities.UserSettings.filter({ created_by: friend_email })
    ]);

    const mySetting = mySettings[0] || {};
    const friendSetting = friendSettings[0] || {};

    // Analyze availability patterns
    const availabilitySlots = [];

    for (const date of dates) {
      const dayOfWeek = new Date(date).getDay();
      
      // Skip if weekend and friend has different preferences
      const myEvents_day = myEvents.filter(e => e.date === date);
      const friendEvents_day = friendEvents.filter(e => e.date === date);

      // Find free slots (9am - 9pm)
      const timeSlots = [];
      for (let hour = 9; hour <= 21 - Math.ceil(duration_minutes / 60); hour++) {
        const startTime = `${String(hour).padStart(2, '0')}:00`;
        const endHour = hour + Math.ceil(duration_minutes / 60);
        const endTime = `${String(endHour).padStart(2, '0')}:00`;

        // Check if both are free
        const myBusy = myEvents_day.some(e => {
          if (!e.start_time || !e.end_time) return false;
          const [sh, sm] = e.start_time.split(':').map(Number);
          const [eh, em] = e.end_time.split(':').map(Number);
          return hour >= sh && hour < eh;
        });

        const friendBusy = friendEvents_day.some(e => {
          if (!e.start_time || !e.end_time) return false;
          const [sh, sm] = e.start_time.split(':').map(Number);
          const [eh, em] = e.end_time.split(':').map(Number);
          return hour >= sh && hour < eh;
        });

        if (!myBusy && !friendBusy) {
          timeSlots.push({ startTime, endTime });
        }
      }

      availabilitySlots.push({ date, slots: timeSlots });
    }

    // Use AI to rank the best times
    const context = `
Analyze optimal meeting times for two friends:

Connection: ${connection.relationship} - ${connection.meetup_frequency || 'occasional'} meetups
Last met: ${connection.last_meetup || 'unknown'}
Shared interests: ${(connection.shared_interests || []).join(', ')}
Preferred activities: ${(connection.preferred_activities || []).join(', ')}

Available time slots:
${availabilitySlots.map(slot => 
  `${slot.date} (${new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short' })}): ${slot.slots.length} slots available`
).join('\n')}

Consider:
1. Time since last meetup (should meet more frequently if relationship is close)
2. Day of week preferences (weekends for friends, weekdays for colleagues)
3. Time of day (coffee mornings, lunch, evening dinner)
4. Relationship type and typical activities

Rank top 5 meeting times with compatibility scores and suggest activity.
    `;

    const aiSuggestions = await base44.integrations.Core.InvokeLLM({
      prompt: context,
      response_json_schema: {
        type: 'object',
        properties: {
          top_suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                start_time: { type: 'string' },
                end_time: { type: 'string' },
                compatibility_score: { type: 'number' },
                suggested_activity: { type: 'string' },
                reasoning: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Create suggestion record
    await base44.entities.SocialSuggestion.create({
      friend_email,
      suggestion_type: 'meetup_time',
      title: `Meet ${connection.friend_name}`,
      description: `AI found ${aiSuggestions.top_suggestions.length} optimal times`,
      suggested_times: aiSuggestions.top_suggestions,
      reasoning: 'Based on mutual availability and relationship patterns',
      priority: connection.relationship === 'close_friend' ? 'high' : 'medium'
    });

    return Response.json({
      success: true,
      friend: connection.friend_name,
      suggestions: aiSuggestions.top_suggestions,
      total_available_slots: availabilitySlots.reduce((sum, s) => sum + s.slots.length, 0)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});