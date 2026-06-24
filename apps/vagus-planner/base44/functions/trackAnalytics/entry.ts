import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ success: true }); // Silently succeed for unauthenticated
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // ignore malformed body
    }

    const { event_type, category, metadata, duration_ms, success } = body;

    if (!event_type) {
      return Response.json({ success: true }); // Nothing to track
    }

    try {
      await base44.entities.AnalyticsEvent.create({
        event_type: String(event_type),
        category: category || 'general',
        metadata: metadata || {},
        user_email: user.email,
        duration_ms: duration_ms || null,
        success: success !== undefined ? success : true
      });
    } catch (dbError) {
      // Don't fail the caller if analytics write fails
      console.warn('Analytics write failed (non-critical):', dbError.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('trackAnalytics error:', error.message);
    return Response.json({ success: true }); // Always return 200 — analytics must never break the app
  }
});