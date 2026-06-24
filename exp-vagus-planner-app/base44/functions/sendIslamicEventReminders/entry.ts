import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const nowStr = now.toISOString().split('T')[0];
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

    // Fetch only events whose gregorian_date falls within the next 30 days
    const events = await base44.asServiceRole.entities.IslamicEvent.filter(
      { gregorian_date: { $gte: nowStr, $lte: thirtyDaysStr } },
      'gregorian_date',
      100
    );

    const upcomingEvents = events.filter(event =>
      event.gregorian_date && event.reminder_enabled && event.reminders?.length
    );

    const notificationsToCreate = [];
    const eventsToUpdate = [];

    for (const event of upcomingEvents) {
      const eventDate = new Date(event.gregorian_date);
      let hasUpdates = false;
      const updatedReminders = [...event.reminders];

      for (let i = 0; i < updatedReminders.length; i++) {
        const reminder = updatedReminders[i];
        if (reminder.sent) continue;

        const multiplier = {
          minutes: 1000 * 60,
          hours: 1000 * 60 * 60,
          days: 1000 * 60 * 60 * 24,
          weeks: 1000 * 60 * 60 * 24 * 7
        }[reminder.time_unit] || 1000 * 60 * 60 * 24;

        const reminderTime = new Date(eventDate.getTime() - (reminder.time_value * multiplier));
        const timeDiff = reminderTime.getTime() - now.getTime();

        // Within a 5-minute window
        if (timeDiff <= 5 * 60 * 1000 && timeDiff > -5 * 60 * 1000) {
          notificationsToCreate.push({
            type: 'islamic_event',
            title: `Upcoming: ${event.title}`,
            message: `${event.title} is coming up on ${eventDate.toLocaleDateString()}. ${event.description || ''}`,
            priority: 'medium',
            is_read: false,
            action_url: '/Islamic',
            created_by: event.created_by
          });

          updatedReminders[i] = { ...reminder, sent: true };
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        eventsToUpdate.push({ id: event.id, reminders: updatedReminders });
      }
    }

    // Run all creates and updates in parallel
    await Promise.all([
      ...notificationsToCreate.map(n =>
        base44.asServiceRole.entities.Notification.create(n)
      ),
      ...eventsToUpdate.map(u =>
        base44.asServiceRole.entities.IslamicEvent.update(u.id, { reminders: u.reminders })
      )
    ]);

    console.log(`Sent ${notificationsToCreate.length} notifications, updated ${eventsToUpdate.length} events.`);

    return Response.json({
      success: true,
      notifications_sent: notificationsToCreate.length,
      events_updated: eventsToUpdate.length
    });
  } catch (error) {
    console.error('sendIslamicEventReminders error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});