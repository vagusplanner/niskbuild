import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, title, type, priority, action_url } = await req.json();

    // Create notification in database
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      title: title || 'AI Assistant Notification',
      message,
      type: type || 'info',
      priority: priority || 'normal',
      is_read: false,
      action_url: action_url || null
    });

    // Send push notification (if enabled in user settings)
    const settings = await base44.entities.UserSettings.list();
    if (settings.length > 0 && settings[0].notifications_enabled !== false) {
      // Note: Push notifications would be handled by the frontend service worker
      // This creates a notification record that the frontend can display
    }

    return Response.json({
      success: true,
      notification_id: notification.id,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});