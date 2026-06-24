import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Scheduled function - check all active holidays
    const holidays = await base44.asServiceRole.entities.Holiday.filter({
      status: { $in: ['planned', 'booked', 'in_progress'] }
    });

    const results = [];

    for (const holiday of holidays) {
      if (!holiday.budget) continue;

      const expenses = await base44.asServiceRole.entities.HolidayExpense.filter({
        holiday_id: holiday.id
      });

      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const percentageUsed = (totalSpent / holiday.budget) * 100;

      // Alert if over 80% or overspent
      if (percentageUsed >= 80) {
        const severity = percentageUsed >= 100 ? 'critical' : 'warning';
        const message = percentageUsed >= 100
          ? `You've exceeded your budget by $${(totalSpent - holiday.budget).toFixed(2)}!`
          : `You've used ${percentageUsed.toFixed(0)}% of your budget. Consider reviewing upcoming expenses.`;

        // Check if alert already exists
        const existingAlerts = await base44.asServiceRole.entities.TravelAlert.filter({
          holiday_id: holiday.id,
          type: 'budget_alert',
          status: 'active'
        });

        if (existingAlerts.length === 0) {
          await base44.asServiceRole.entities.TravelAlert.create({
            holiday_id: holiday.id,
            type: 'advisory',
            severity,
            title: 'Budget Alert',
            message,
            suggested_actions: [{
              action: 'Review your expenses and adjust spending',
              priority: 'high'
            }, {
              action: 'Consider increasing your budget if needed',
              priority: 'medium'
            }],
            status: 'active'
          });

          // Send email notification
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: holiday.created_by,
              subject: `💰 Budget Alert: ${holiday.title}`,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: ${severity === 'critical' ? '#dc2626' : '#f59e0b'}; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Budget Alert</h1>
                  </div>
                  <div style="padding: 30px; background: #f9fafb;">
                    <h2 style="color: #374151;">${holiday.title}</h2>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                      ${message}
                    </p>
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Budget:</span>
                        <strong>$${holiday.budget.toFixed(2)}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Spent:</span>
                        <strong style="color: ${percentageUsed >= 100 ? '#dc2626' : '#f59e0b'};">$${totalSpent.toFixed(2)}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span>Remaining:</span>
                        <strong>${holiday.budget - totalSpent > 0 ? '$' + (holiday.budget - totalSpent).toFixed(2) : '$0'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              `
            });
          } catch (emailError) {
            console.error('Failed to send budget alert email:', emailError);
          }

          results.push({
            holiday: holiday.title,
            alert_sent: true,
            percentage_used: percentageUsed
          });
        }
      }
    }

    return Response.json({
      message: 'Budget monitoring completed',
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});