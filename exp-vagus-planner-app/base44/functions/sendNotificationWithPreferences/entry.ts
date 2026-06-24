import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backend function to send notifications respecting user preferences
 * Called from frontend or scheduled tasks
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      notificationType,
      title,
      message,
      data = {},
      eventPriority,
      eventCategory
    } = await req.json();

    if (!notificationType || !title || !message) {
      return Response.json(
        { error: 'Missing required fields: notificationType, title, message' },
        { status: 400 }
      );
    }

    // Fetch user preferences
    const preferences = await base44.entities.NotificationPreference.filter({});
    const preference = preferences.find(p => p.notification_type === notificationType);

    // Check if notification is enabled
    if (preference && !preference.enabled) {
      return Response.json(
        { success: false, reason: 'Notification type disabled', channels: {} },
        { status: 200 }
      );
    }

    // Check event priority filtering
    if (preference?.filter_by_priority?.length > 0 && eventPriority) {
      if (!preference.filter_by_priority.includes(eventPriority)) {
        return Response.json(
          { success: false, reason: 'Event priority filtered out', channels: {} },
          { status: 200 }
        );
      }
    }

    // Check event category filtering
    if (preference?.filter_by_category?.length > 0 && eventCategory) {
      if (!preference.filter_by_category.includes(eventCategory)) {
        return Response.json(
          { success: false, reason: 'Event category filtered out', channels: {} },
          { status: 200 }
        );
      }
    }

    // Determine enabled channels
    const enabledChannels = preference?.channels
      ?.filter(c => c.enabled)
      .map(c => c.channel) || ['in_app', 'email', 'push'];

    const results = {
      success: true,
      channels: {}
    };

    // Send through enabled channels
    if (enabledChannels.includes('in_app')) {
      try {
        // Create in-app notification record
        await base44.asServiceRole.entities.Notification?.create?.({
          user_id: user.id,
          type: notificationType,
          title,
          message,
          data,
          read: false,
          created_at: new Date().toISOString()
        }).catch(() => {
          // Notification entity might not exist, continue
        });
        results.channels.in_app = true;
      } catch (err) {
        console.error('In-app notification failed:', err);
        results.channels.in_app = false;
      }
    }

    // Send email notification
    if (enabledChannels.includes('email') && user.email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: title,
          body: `<h2>${title}</h2><p>${message}</p>${
            Object.keys(data).length > 0
              ? `<pre>${JSON.stringify(data, null, 2)}</pre>`
              : ''
          }`
        });
        results.channels.email = true;
      } catch (err) {
        console.error('Email notification failed:', err);
        results.channels.email = false;
      }
    }

    // Push notification would be sent from frontend or via service
    if (enabledChannels.includes('push')) {
      results.channels.push = 'pending'; // Requires browser push service
    }

    // Create notification log for analytics
    try {
      await base44.asServiceRole.entities.NotificationLog?.create?.({
        user_email: user.email,
        type: notificationType,
        title,
        channels_attempted: enabledChannels,
        channels_successful: Object.keys(results.channels).filter(k => results.channels[k] === true),
        priority: preference?.priority || 'medium',
        created_at: new Date().toISOString()
      }).catch(() => {
        // NotificationLog entity might not exist
      });
    } catch (err) {
      console.error('Failed to log notification:', err);
    }

    return Response.json(results);
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});