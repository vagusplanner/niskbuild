import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Service role to process all pending notifications
    const now = new Date();
    const notifications = await base44.asServiceRole.entities.SmartNotification.filter({
      status: 'pending'
    });

    const toSend = notifications.filter(n => {
      const scheduledTime = new Date(n.scheduled_time);
      return scheduledTime <= now;
    });

    console.log(`Found ${toSend.length} notifications to send`);

    const results = [];

    for (const notification of toSend) {
      try {
        // Get user preferences
        const preferences = await base44.asServiceRole.entities.NotificationPreference.filter({
          created_by: notification.created_by,
          notification_type: notification.type
        });

        const pref = preferences[0];

        // Check if notification type is enabled
        if (pref && pref.enabled === false) {
          await base44.asServiceRole.entities.SmartNotification.update(notification.id, {
            status: 'dismissed'
          });
          continue;
        }

        // Check quiet hours
        if (pref?.quiet_hours_enabled) {
          const currentHour = now.getHours();
          const quietStart = parseInt(pref.quiet_hours_start.split(':')[0]);
          const quietEnd = parseInt(pref.quiet_hours_end.split(':')[0]);
          
          const isQuietTime = quietStart > quietEnd
            ? (currentHour >= quietStart || currentHour < quietEnd)
            : (currentHour >= quietStart && currentHour < quietEnd);

          if (isQuietTime) {
            console.log(`Skipping notification ${notification.id} - quiet hours`);
            continue;
          }
        }

        // Send via preferred channels
        const channels = pref?.delivery_channels || notification.delivery_channel === 'all' 
          ? ['in_app', 'email', 'push'] 
          : [notification.delivery_channel];

        for (const channel of channels) {
          if (channel === 'email') {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: notification.created_by,
                subject: notification.title,
                body: notification.message
              });
            } catch (emailError) {
              console.error(`Failed to send email for notification ${notification.id}:`, emailError);
            }
          }
          // In-app and push are handled by the frontend subscription system
        }

        // Mark as sent
        await base44.asServiceRole.entities.SmartNotification.update(notification.id, {
          status: 'sent',
          sent_at: now.toISOString()
        });

        results.push({ id: notification.id, success: true });

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        results.push({ id: notification.id, success: false, error: error.message });
      }
    }

    return Response.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Error in sendSmartNotifications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});