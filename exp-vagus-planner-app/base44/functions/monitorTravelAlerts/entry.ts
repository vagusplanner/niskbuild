import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function runs as a scheduled automation, no user auth needed
    // Fetch all active holidays (booked or in progress)
    const holidays = await base44.asServiceRole.entities.Holiday.filter({
      status: { $in: ['booked', 'in_progress'] }
    });

    if (holidays.length === 0) {
      return Response.json({ message: 'No active holidays to monitor' });
    }

    const results = [];

    for (const holiday of holidays) {
      try {
        // Get comprehensive travel alerts using AI with web search
        const { data } = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Monitor and detect travel alerts for this upcoming trip:

TRIP DETAILS:
- Destination: ${holiday.destination}
- Travel Dates: ${holiday.start_date} to ${holiday.end_date}
- Flight: ${holiday.flight_details || 'Not specified'}
- Accommodation: ${holiday.accommodation || 'Not specified'}

Check for the following and provide ONLY actionable alerts:
1. Flight delays, cancellations, or gate changes
2. Severe weather warnings at destination
3. Travel advisories or safety warnings
4. Visa requirement changes
5. Local disruptions (strikes, events affecting transport)
6. Airport delays or closures
7. Health alerts or entry requirement changes

For each alert provide:
- Type, severity, and clear message
- Suggested alternative actions with booking URLs if applicable
- Whether immediate action is required

Return empty array if everything is normal.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              alerts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { 
                      type: "string",
                      enum: ["flight_delay", "cancellation", "gate_change", "weather", "visa_change", "advisory", "security"]
                    },
                    severity: { 
                      type: "string",
                      enum: ["info", "warning", "critical"]
                    },
                    title: { type: "string" },
                    message: { type: "string" },
                    suggested_actions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          action: { type: "string" },
                          url: { type: "string" },
                          priority: { type: "string" }
                        }
                      }
                    },
                    requires_immediate_action: { type: "boolean" }
                  }
                }
              }
            }
          }
        });

        const alerts = data.alerts || [];

        // Get existing alerts for this holiday
        const existingAlerts = await base44.asServiceRole.entities.TravelAlert.filter({
          holiday_id: holiday.id,
          status: 'active'
        });

        // Process new alerts
        for (const alert of alerts) {
          // Check if similar alert already exists
          const isDuplicate = existingAlerts.some(
            existing => existing.type === alert.type && 
                       existing.title === alert.title
          );

          if (!isDuplicate) {
            // Create new alert
            const newAlert = await base44.asServiceRole.entities.TravelAlert.create({
              holiday_id: holiday.id,
              type: alert.type,
              severity: alert.severity,
              title: alert.title,
              message: alert.message,
              suggested_actions: alert.suggested_actions || [],
              status: 'active',
              notified: false
            });

            // Send notification to user
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: holiday.created_by,
                subject: `🚨 Travel Alert: ${alert.title}`,
                body: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6'}; padding: 30px; text-align: center;">
                      <h1 style="color: white; margin: 0;">Travel Alert</h1>
                      <p style="color: white; margin-top: 10px; font-size: 18px;">${holiday.title}</p>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                      <h2 style="color: #374151; margin-bottom: 10px;">${alert.title}</h2>
                      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
                        ${alert.message}
                      </p>
                      
                      ${alert.suggested_actions?.length > 0 ? `
                        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                          <h3 style="color: #374151; margin-bottom: 10px;">Suggested Actions:</h3>
                          ${alert.suggested_actions.map(action => `
                            <div style="margin-bottom: 10px;">
                              <strong>${action.action}</strong>
                              ${action.url ? `<br/><a href="${action.url}" style="color: #3b82f6;">View Options</a>` : ''}
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                      
                      <p style="font-size: 14px; color: #6b7280;">
                        <strong>Trip:</strong> ${holiday.destination}<br/>
                        <strong>Dates:</strong> ${holiday.start_date} to ${holiday.end_date}
                      </p>
                    </div>
                  </div>
                `
              });

              // Mark as notified
              await base44.asServiceRole.entities.TravelAlert.update(newAlert.id, {
                notified: true
              });

              results.push({
                holiday: holiday.title,
                alert: alert.title,
                notified: true
              });
            } catch (emailError) {
              console.error('Failed to send email notification:', emailError);
              results.push({
                holiday: holiday.title,
                alert: alert.title,
                notified: false,
                error: emailError.message
              });
            }
          }
        }

      } catch (error) {
        console.error(`Error monitoring holiday ${holiday.id}:`, error);
        results.push({
          holiday: holiday.title,
          error: error.message
        });
      }
    }

    return Response.json({
      message: 'Travel alerts monitoring completed',
      monitored: holidays.length,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});