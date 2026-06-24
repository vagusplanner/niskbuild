import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const allUsers = await base44.asServiceRole.entities.User.list();
    const predictions = [];
    
    for (const user of allUsers) {
      // Get historical data
      const [pastEvents, pastHolidays, goals] = await Promise.all([
        base44.asServiceRole.entities.Event.filter({ created_by: user.email }, '-date', 200),
        base44.asServiceRole.entities.Holiday.filter({ created_by: user.email }),
        base44.asServiceRole.entities.Goal.filter({ created_by: user.email })
      ]);
      
      // Analyze patterns
      const context = `
User's historical data:
- ${pastEvents.length} events in history
- ${pastHolidays.length} holidays planned
- ${goals.length} active goals

Recent events (last 30):
${pastEvents.slice(0, 30).map(e => `${e.date}: ${e.title} (${e.category})`).join('\n')}

Past holidays:
${pastHolidays.map(h => `${h.start_date}: ${h.destination}`).join('\n')}

Based on patterns, predict:
1. Upcoming events user might need to schedule (birthdays, anniversaries, seasonal bookings)
2. Habits or recurring events they should establish
3. Goal-related reminders
4. Travel planning suggestions

Provide 3-5 actionable predictions with specific dates.
      `;
      
      const predictions_ai = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: context,
        response_json_schema: {
          type: 'object',
          properties: {
            predictions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  suggestion: { type: 'string' },
                  suggested_date: { type: 'string' },
                  reasoning: { type: 'string' },
                  priority: { type: 'string' }
                }
              }
            }
          }
        }
      });
      
      if (predictions_ai.predictions && predictions_ai.predictions.length > 0) {
        predictions.push({
          user: user.email,
          predictions: predictions_ai.predictions
        });
        
        // Send prediction email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: '🔮 AI Predictions: Upcoming Events You Might Want to Plan',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">🔮 AI Predictions</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Based on your patterns</p>
              </div>
              
              <div style="padding: 30px; background: #f9fafb;">
                <p style="color: #475569;">Your AI assistant noticed some patterns and has suggestions for you:</p>
                
                ${predictions_ai.predictions.map((pred, i) => `
                  <div style="background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid ${pred.priority === 'high' ? '#ef4444' : pred.priority === 'medium' ? '#f59e0b' : '#10b981'};">
                    <h3 style="margin: 0 0 10px 0; color: #1e293b;">${pred.type}</h3>
                    <p style="margin: 0; color: #475569;"><strong>${pred.suggestion}</strong></p>
                    <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">
                      📅 Suggested: ${pred.suggested_date}<br>
                      💡 ${pred.reasoning}
                    </p>
                  </div>
                `).join('')}
                
                <p style="color: #94a3b8; font-size: 14px; margin-top: 20px;">
                  These are AI-generated suggestions based on your calendar patterns. You can ignore any that don't apply.
                </p>
              </div>
            </div>
          `
        });
      }
    }
    
    return Response.json({
      message: 'Predictive scheduling completed',
      users_analyzed: predictions.length,
      details: predictions
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});