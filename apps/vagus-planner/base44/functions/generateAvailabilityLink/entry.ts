import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { duration_minutes, date_range_days, buffer_minutes } = await req.json();

    // Generate a unique token
    const token = crypto.randomUUID();
    
    // Get user's events to calculate availability
    const events = await base44.entities.Event.filter({
      created_by: user.email
    });

    // Create availability sharing record
    const sharing = await base44.asServiceRole.entities.AvailabilityShare.create({
      user_email: user.email,
      token,
      duration_minutes: duration_minutes || 30,
      date_range_days: date_range_days || 7,
      buffer_minutes: buffer_minutes || 15,
      is_active: true,
      created_date: new Date().toISOString()
    });

    // Generate shareable URL
    const baseUrl = req.headers.get('origin') || 'https://your-app.base44.app';
    const shareUrl = `${baseUrl}/availability/${token}`;

    return Response.json({
      share_url: shareUrl,
      token,
      expires_in_days: 30,
      settings: {
        duration_minutes: duration_minutes || 30,
        date_range_days: date_range_days || 7,
        buffer_minutes: buffer_minutes || 15
      }
    });

  } catch (error) {
    console.error('Availability link generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});