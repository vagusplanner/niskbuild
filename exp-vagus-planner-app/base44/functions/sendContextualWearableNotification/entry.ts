import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, notification_type } = await req.json();

    if (!user_email) {
      return Response.json({ error: 'user_email required' }, { status: 400 });
    }

    const now = new Date();
    
    // Get user settings
    const settings = await base44.asServiceRole.entities.UserSettings.filter({
      created_by: user_email
    });
    const userSettings = settings[0] || {};

    // Check if in prayer time - if so, don't send
    if (userSettings.prayer_enabled) {
      const prayerResponse = await base44.asServiceRole.functions.invoke('fetchPrayerTimes', {
        date: now.toISOString().split('T')[0],
        latitude: userSettings.latitude,
        longitude: userSettings.longitude
      });
      
      const prayers = prayerResponse.data.prayer_times;
      const isPrayerTime = Object.values(prayers).some(time => {
        if (!time) return false;
        const [hours, minutes] = time.split(':');
        const prayerTime = new Date();
        prayerTime.setHours(parseInt(hours), parseInt(minutes), 0);
        
        const diff = Math.abs(now - prayerTime);
        return diff < 20 * 60 * 1000; // Within 20 minutes of prayer
      });

      if (isPrayerTime) {
        return Response.json({
          success: true,
          notification_sent: false,
          reason: 'Prayer time - notifications silenced'
        });
      }
    }

    // Get upcoming events
    const events = await base44.asServiceRole.entities.Event.filter({
      created_by: user_email
    });

    const upcomingEvents = events
      .filter(e => new Date(e.start_date) > now)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    // Get tasks
    const tasks = await base44.asServiceRole.entities.Task.filter({
      created_by: user_email,
      status: { $ne: 'completed' }
    });

    const urgentTasks = tasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date(now.getTime() + 3600000)
    );

    let notification = null;

    // Check for prayer coming up
    if (userSettings.prayer_enabled) {
      const prayerResponse = await base44.asServiceRole.functions.invoke('fetchPrayerTimes', {
        date: now.toISOString().split('T')[0],
        latitude: userSettings.latitude,
        longitude: userSettings.longitude
      });
      
      const prayers = prayerResponse.data.prayer_times;
      const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      
      for (const name of prayerNames) {
        const time = prayers[name];
        if (time) {
          const [hours, minutes] = time.split(':');
          const prayerTime = new Date();
          prayerTime.setHours(parseInt(hours), parseInt(minutes), 0);
          
          const minutesUntil = Math.round((prayerTime - now) / 60000);
          
          if (minutesUntil > 0 && minutesUntil <= 30) {
            if (urgentTasks.length > 0) {
              notification = {
                title: `${name} in ${minutesUntil} mins`,
                body: `You have ${urgentTasks.length} urgent task(s). Finish now?`,
                actions: ['Complete Task', 'Snooze'],
                priority: 'high'
              };
            } else {
              notification = {
                title: `${name} prayer in ${minutesUntil} minutes`,
                body: 'Prepare for prayer',
                actions: ['Set Reminder', 'Dismiss'],
                priority: 'normal'
              };
            }
            break;
          }
        }
      }
    }

    // If no prayer notification, check for event-based notifications
    if (!notification && upcomingEvents.length > 0) {
      const next = upcomingEvents[0];
      const minutesUntil = Math.round((new Date(next.start_date) - now) / 60000);
      
      if (minutesUntil > 0 && minutesUntil <= 15) {
        notification = {
          title: `${next.title} in ${minutesUntil} mins`,
          body: next.location ? `Location: ${next.location}` : 'Get ready',
          actions: ['View Details', 'Snooze'],
          priority: 'high'
        };
      }
    }

    if (notification) {
      // Create notification record
      await base44.asServiceRole.entities.Notification.create({
        user_email,
        title: notification.title,
        message: notification.body,
        type: 'wearable',
        priority: notification.priority,
        is_read: false
      });

      return Response.json({
        success: true,
        notification_sent: true,
        notification
      });
    }

    return Response.json({
      success: true,
      notification_sent: false,
      reason: 'No urgent notifications'
    });

  } catch (error) {
    console.error('Wearable notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});