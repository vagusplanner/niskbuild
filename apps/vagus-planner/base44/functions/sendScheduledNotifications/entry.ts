import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    const allNotificationsSent = [];

    // Get all users to process notifications for each
    const users = await base44.asServiceRole.entities.User.list();

    for (const user of users) {
      const notifications_sent = [];

      // Fetch user settings
      const settings = await base44.asServiceRole.entities.UserSettings.filter({ 
        created_by: user.email 
      });
      const userSettings = settings[0] || {};

      // Check if notifications are enabled
      if (userSettings.notifications_enabled === false) {
        continue;
      }

      // Check Do Not Disturb
      if (userSettings.do_not_disturb && userSettings.dnd_start_time && userSettings.dnd_end_time) {
        const currentTime = now.toTimeString().slice(0, 5);
        const dndStart = userSettings.dnd_start_time;
        const dndEnd = userSettings.dnd_end_time;
        
        const isDND = dndStart < dndEnd 
          ? currentTime >= dndStart && currentTime <= dndEnd
          : currentTime >= dndStart || currentTime <= dndEnd;
        
        if (isDND) {
          continue;
        }
      }

      // EVENT REMINDERS
      const events = await base44.asServiceRole.entities.Event.filter({ 
        created_by: user.email 
      }, '-start_date', 100);
      const notifyMinutes = userSettings.notify_before_minutes || 15;

      for (const event of events) {
        if (!event.start_date) continue;

        const eventDateTime = event.is_all_day 
          ? new Date(`${event.start_date}T${userSettings.allday_reminder_time || '09:00'}`)
          : new Date(`${event.start_date}T${event.start_time || '00:00'}`);

        const timeDiff = (eventDateTime - now) / 1000 / 60; // minutes

        // Check if we should send reminder
        if (timeDiff > 0 && timeDiff <= notifyMinutes && timeDiff > notifyMinutes - 5) {
          // Check if reminder already sent
          const existingNotif = await base44.asServiceRole.entities.Notification.filter({
            created_by: user.email,
            entity_type: 'event',
            entity_id: event.id,
            notification_type: 'reminder'
          });

          if (existingNotif.length === 0) {
            // Create notification
            await base44.asServiceRole.entities.Notification.create({
              type: 'personalized_reminder',
              title: `Upcoming: ${event.title}`,
              message: `Your event "${event.title}" starts in ${Math.round(timeDiff)} minutes`,
              priority: 'medium',
              is_read: false,
              action_url: `/calendar?date=${event.start_date}`,
              related_event_id: event.id,
              created_by: user.email
            });

            // Send email if enabled
            if (userSettings.email_notifications) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: user.email,
                subject: `Reminder: ${event.title}`,
                body: `Your event "${event.title}" is starting soon!\n\nTime: ${event.start_time || 'All day'}\nLocation: ${event.location || 'Not specified'}\n\nView in calendar: ${Deno.env.get('BASE44_APP_URL') || ''}/calendar?date=${event.start_date}`
              });
            }

            notifications_sent.push({
              type: 'event_reminder',
              event: event.title
            });
          }
        }
      }

      // OVERDUE TASKS
      if (userSettings.overdue_task_alerts) {
        const overdueTime = userSettings.overdue_alert_time || '09:00';
        const currentTime = now.toTimeString().slice(0, 5);

        // Send overdue alerts at specified time
        if (currentTime >= overdueTime && currentTime <= `${overdueTime.split(':')[0]}:05`) {
          const tasks = await base44.asServiceRole.entities.Task.filter({ 
            created_by: user.email,
            status: 'todo' 
          });
          const overdueTasks = tasks.filter(task => {
            if (!task.due_date) return false;
            return new Date(task.due_date) < now;
          });

          if (overdueTasks.length > 0) {
            await base44.asServiceRole.entities.Notification.create({
              type: 'personalized_reminder',
              title: `${overdueTasks.length} Overdue Tasks`,
              message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} that need attention`,
              priority: 'high',
              is_read: false,
              action_url: '/tasks',
              created_by: user.email
            });

            if (userSettings.email_notifications) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: user.email,
                subject: `${overdueTasks.length} Overdue Tasks`,
                body: `You have the following overdue tasks:\n\n${overdueTasks.map(t => `• ${t.title} (Due: ${t.due_date})`).join('\n')}\n\nView tasks: ${Deno.env.get('BASE44_APP_URL') || ''}/tasks`
              });
            }

            notifications_sent.push({
              type: 'overdue_tasks',
              count: overdueTasks.length
            });
          }
        }
      }

      // TASK DUE REMINDERS
      if (userSettings.task_due_reminders) {
        const tasks = await base44.asServiceRole.entities.Task.filter({ 
          created_by: user.email,
          status: 'todo' 
        });
        const reminderHours = userSettings.task_reminder_hours || 24;

        for (const task of tasks) {
          if (!task.due_date) continue;

          const dueDate = new Date(task.due_date);
          const timeDiff = (dueDate - now) / 1000 / 60 / 60; // hours

          if (timeDiff > 0 && timeDiff <= reminderHours && timeDiff > reminderHours - 1) {
            const existingNotif = await base44.asServiceRole.entities.Notification.filter({
              created_by: user.email,
              entity_type: 'task',
              entity_id: task.id,
              notification_type: 'reminder'
            });

            if (existingNotif.length === 0) {
              await base44.asServiceRole.entities.Notification.create({
                type: 'personalized_reminder',
                title: `Task Due Soon: ${task.title}`,
                message: `Task "${task.title}" is due in ${Math.round(timeDiff)} hours`,
                priority: task.priority === 'high' ? 'high' : 'medium',
                is_read: false,
                action_url: '/tasks',
                created_by: user.email
              });

              if (userSettings.email_notifications) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: user.email,
                  subject: `Task Due Soon: ${task.title}`,
                  body: `Your task "${task.title}" is due in ${Math.round(timeDiff)} hours.\n\nDue Date: ${task.due_date}\nPriority: ${task.priority || 'normal'}\n\nView tasks: ${Deno.env.get('BASE44_APP_URL') || ''}/tasks`
                });
              }

              notifications_sent.push({
                type: 'task_reminder',
                task: task.title
              });
            }
          }
        }
      }

      allNotificationsSent.push(...notifications_sent);
    }

    return Response.json({
      success: true,
      users_processed: users.length,
      notifications_sent: allNotificationsSent.length,
      details: allNotificationsSent
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});