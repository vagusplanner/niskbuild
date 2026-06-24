import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Detect calendar conflicts for next 7 days
    // Get all users' events for the next 7 days
    const today = new Date();
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    const allUsers = await base44.asServiceRole.entities.User.list();
    const conflicts = [];

    for (const user of allUsers) {
      // Fetch events for next 7 days using start_date
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      
      const events = await base44.asServiceRole.entities.Event.filter({
        created_by: user.email
      }, '-start_date', 100);

      // Filter events in next 7 days and group by date
      const eventsByDate = {};
      events.forEach(event => {
        if (!event.start_date) return;
        
        const eventDate = new Date(event.start_date);
        const eventDateStr = eventDate.toISOString().split('T')[0];
        
        // Only include events in next 7 days
        if (!next7Days.includes(eventDateStr)) return;
        
        if (!eventsByDate[eventDateStr]) {
          eventsByDate[eventDateStr] = [];
        }
        eventsByDate[eventDateStr].push(event);
      });

      // Check for overlaps
      for (const [date, dayEvents] of Object.entries(eventsByDate)) {
        for (let i = 0; i < dayEvents.length; i++) {
          for (let j = i + 1; j < dayEvents.length; j++) {
            const event1 = dayEvents[i];
            const event2 = dayEvents[j];

            // Skip all-day events
            if (event1.is_all_day || event2.is_all_day) continue;
            
            // Parse datetime for comparison
            const start1 = new Date(event1.start_date);
            const end1 = new Date(event1.end_date);
            const start2 = new Date(event2.start_date);
            const end2 = new Date(event2.end_date);
            
            if (isNaN(start1.getTime()) || isNaN(end1.getTime()) || isNaN(start2.getTime()) || isNaN(end2.getTime())) continue;

            // Check overlap
            if (start1 < end2 && end1 > start2) {
              const formatTime = (date) => {
                const hours = date.getHours().toString().padStart(2, '0');
                const mins = date.getMinutes().toString().padStart(2, '0');
                return `${hours}:${mins}`;
              };
              
              // Generate alternative time slots
              const duration1 = (end1 - start1) / (1000 * 60); // minutes
              const duration2 = (end2 - start2) / (1000 * 60);
              
              const eventDate = new Date(date);
              const alternatives = [];
              
              // Generate slots: morning (8-12), afternoon (13-17), evening (18-21)
              const timeSlots = [
                { start: 8, label: 'morning' },
                { start: 13, label: 'afternoon' },
                { start: 18, label: 'evening' }
              ];
              
              timeSlots.forEach(slot => {
                const altStart1 = new Date(eventDate);
                altStart1.setHours(slot.start, 0, 0, 0);
                const altEnd1 = new Date(altStart1.getTime() + duration1 * 60000);
                
                const altStart2 = new Date(eventDate);
                altStart2.setHours(slot.start, 0, 0, 0);
                const altEnd2 = new Date(altStart2.getTime() + duration2 * 60000);
                
                alternatives.push({
                  event1: { start: altStart1.toISOString(), end: altEnd1.toISOString(), slot: slot.label },
                  event2: { start: altStart2.toISOString(), end: altEnd2.toISOString(), slot: slot.label }
                });
              });
              
              // Use AI to suggest resolution with concrete times
              const suggestion = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `
Two events conflict on ${date}:
1. "${event1.title}" (${formatTime(start1)} - ${formatTime(end1)}) - Category: ${event1.category || 'general'}, Location: ${event1.location || 'Not specified'}
2. "${event2.title}" (${formatTime(start2)} - ${formatTime(end2)}) - Category: ${event2.category || 'general'}, Location: ${event2.location || 'Not specified'}

Event 1 Duration: ${duration1} minutes
Event 2 Duration: ${duration2} minutes

Available alternative time slots for today:
${alternatives.map(alt => `- Morning (8 AM), Afternoon (1 PM), Evening (6 PM)`).join('\n')}

Analyze the event priorities and suggest 3 CONCRETE rescheduling options. For each option:
1. Specify WHICH event to move (use event1_id or event2_id)
2. Provide EXACT new start and end times in ISO format
3. Explain WHY this is a good solution

Consider:
- Work events > Personal events during work hours
- Health/Prayer events have high priority
- Location: events at the same location might be easier to move together
- Duration: shorter events are easier to reschedule

Return specific, actionable suggestions.
                `,
                response_json_schema: {
                  type: 'object',
                  properties: {
                    recommendations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          action: { type: 'string' },
                          event_id_to_move: { type: 'string' },
                          new_start_time: { type: 'string' },
                          new_end_time: { type: 'string' },
                          rationale: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              });

              // Store conflict in database for UI access
              const conflictRecord = await base44.asServiceRole.entities.ConflictResolution.create({
                created_by: user.email,
                conflict_date: date,
                event1_id: event1.id,
                event1_title: event1.title,
                event2_id: event2.id,
                event2_title: event2.title,
                ai_suggestions: suggestion.recommendations.map((rec, idx) => ({
                  action: rec.action,
                  event_id: rec.event_id_to_move === 'event1' ? event1.id : event2.id,
                  new_start_date: rec.new_start_time,
                  new_end_date: rec.new_end_time,
                  rationale: rec.rationale
                })),
                status: 'active',
                user_decision: 'pending'
              });

              conflicts.push({
                user_email: user.email,
                conflict_id: conflictRecord.id,
                date,
                event1: { id: event1.id, title: event1.title, time: `${formatTime(start1)}-${formatTime(end1)}` },
                event2: { id: event2.id, title: event2.title, time: `${formatTime(start2)}-${formatTime(end2)}` },
                suggestions: suggestion.recommendations
              });

              // Create in-app notification
              await base44.asServiceRole.entities.Notification.create({
                type: 'event_conflict',
                title: '⚠️ Schedule Conflict Detected',
                message: `${event1.title} and ${event2.title} overlap on ${date}. Tap to resolve.`,
                priority: 'high',
                action_url: `/Calendar?conflict=${conflictRecord.id}`,
                created_by: user.email
              });

              // Send notification
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: user.email,
                subject: '⚠️ Schedule Conflict Detected',
                body: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                      <h2 style="color: #92400e; margin-top: 0;">Schedule Conflict on ${date}</h2>
                      <p style="color: #78350f;"><strong>${event1.title}</strong> (${formatTime(start1)} - ${formatTime(end1)})</p>
                      <p style="color: #78350f;"><strong>${event2.title}</strong> (${formatTime(start2)} - ${formatTime(end2)})</p>
                      
                      <h3 style="color: #92400e;">AI Recommendations:</h3>
                      ${suggestion.recommendations.map((rec, i) => `
                        <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px;">
                          <strong>Option ${i + 1}:</strong> ${rec.action}<br>
                          <em style="color: #78350f;">${rec.rationale}</em>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `
              });
            }
          }
        }
      }
    }

    return Response.json({
      message: 'Conflict detection completed',
      conflicts_found: conflicts.length,
      details: conflicts
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});