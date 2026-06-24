import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      notification_type, 
      title, 
      message, 
      priority = 'medium',
      action_url,
      metadata = {},
      send_email = false 
    } = await req.json();

    // Get user settings
    const settings = await base44.entities.UserSettings.list();
    const userSettings = settings[0] || {};

    // Check if notifications are enabled for this type
    const typeEnabled = {
      'event_reminder': userSettings.notifications_enabled,
      'deadline': userSettings.task_due_reminders,
      'ai_suggestion': userSettings.ai_proactive_suggestions,
      'meeting': userSettings.meeting_notifications,
      'travel': userSettings.travel_notifications,
      'islamic': userSettings.islamic_notifications,
      'system': true
    };

    if (!typeEnabled[notification_type]) {
      return Response.json({ 
        success: false, 
        message: 'Notification type disabled by user' 
      });
    }

    // Create in-app notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      type: notification_type,
      title,
      message,
      priority,
      action_url,
      is_read: false,
      metadata
    });

    // Send email notification if requested and enabled
    if (send_email && userSettings.email_notifications) {
      // Check if priority is high enough for email
      const sendEmailForPriority = 
        priority === 'high' || 
        priority === 'urgent' || 
        (priority === 'medium' && userSettings.email_notifications);

      if (sendEmailForPriority) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject: `[VAGUS PLANNER] ${title}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #14b8a6;">${title}</h2>
                <p style="color: #475569; line-height: 1.6;">${message}</p>
                ${action_url ? `
                  <a href="${action_url}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #14b8a6; color: white; text-decoration: none; border-radius: 8px;">
                    Take Action
                  </a>
                ` : ''}
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px;">
                  This is an automated notification from VAGUS PLANNER. 
                  You can manage your notification preferences in the app settings.
                </p>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }
    }

    return Response.json({
      success: true,
      notification_id: notification.id,
      email_sent: send_email && userSettings.email_notifications
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});