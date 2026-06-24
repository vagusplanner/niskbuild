import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { addMinutes, parseISO, formatDistanceToNow } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    const users = await base44.asServiceRole.entities.User.list();
    
    let notificationsSent = 0;

    for (const user of users) {
      try {
        const [events, settings] = await Promise.all([
          base44.asServiceRole.entities.Event.filter({ created_by: user.email }),
          base44.asServiceRole.entities.UserSettings.filter({ created_by: user.email })
        ]);

        const userSettings = settings[0] || {};
        if (!userSettings.notifications_enabled) continue;

        for (const event of events) {
          const eventStart = parseISO(event.start_date);
          const diffMinutes = (eventStart.getTime() - now.getTime()) / (1000 * 60);

          // Only process future events within next 24 hours
          if (diffMinutes < 0 || diffMinutes > 1440) continue;

          const reminderMinutes = userSettings.notify_before_minutes || 30;

          // Only fire within a 4-minute window (automation runs every 5 min)
          if (Math.abs(diffMinutes - reminderMinutes) > 4) continue;

          // Dedup key: user + event + reminderMinutes rounded to nearest 5
          const dedupKey = `reminder_${user.email}_${event.id}_${reminderMinutes}`;
          const dedupDate = now.toISOString().slice(0, 13); // hour-level dedup
          const fullKey = `${dedupKey}_${dedupDate}`;

          // Check if already sent
          const existing = await base44.asServiceRole.entities.Notification.filter({
            user_email: user.email,
            type: 'event_reminder',
            'metadata.dedup_key': fullKey
          }).catch(() => []);

          if (existing && existing.length > 0) continue;

          await base44.asServiceRole.entities.Notification.create({
            user_email: user.email,
            type: 'event_reminder',
            title: `Upcoming: ${event.title}`,
            message: `Your event "${event.title}" starts ${formatDistanceToNow(eventStart, { addSuffix: true })}`,
            priority: 'high',
            action_url: '/Calendar',
            is_read: false,
            metadata: { event_id: event.id, dedup_key: fullKey }
          });

          // Email only for work events and if enabled
          if (userSettings.email_notifications && event.category === 'work') {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user.email,
              subject: `[Vagus Planner] Upcoming: ${event.title}`,
              body: `<p>Your event <strong>${event.title}</strong> starts ${formatDistanceToNow(eventStart, { addSuffix: true })}.</p>`
            }).catch(() => {});
          }

          notificationsSent++;
        }
      } catch (userError) {
        console.error(`Error for ${user.email}:`, userError.message);
      }
    }

    return Response.json({ success: true, notifications_sent: notificationsSent });

  } catch (error) {
    console.error('processScheduledNotifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});