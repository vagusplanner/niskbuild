import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, data, tag, requireInteraction } = await req.json();

    // In a production app, you would:
    // 1. Store push subscriptions in a database
    // 2. Use Web Push protocol to send notifications
    // 3. Use VAPID keys for authentication

    // For now, this creates a notification record
    await base44.entities.Notification.create({
      title: title || 'MyAssistant',
      message: body,
      type: 'push',
      status: 'sent',
      data: data || {},
      priority: requireInteraction ? 'high' : 'normal'
    });

    return Response.json({
      success: true,
      message: 'Push notification sent'
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});