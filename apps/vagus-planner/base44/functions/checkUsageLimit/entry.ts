import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Check if user has remaining quota for a feature
 * Returns current usage and whether the action is allowed
 * Use this before performing usage-limited operations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feature_type } = await req.json();

    if (!feature_type) {
      return Response.json({ error: 'Feature type is required' }, { status: 400 });
    }

    // Get user's subscription
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
      user_email: user.email
    });
    
    const plan = subscriptions.length > 0 ? subscriptions[0].plan : 'free';

    // Define limits per plan
    const limits = {
      free: {
        ai_requests: 100,
        events: 50,
        tasks: 50,
        storage_mb: 10,
        api_calls: 100,
        team_members: 0,
        integrations: 2
      },
      basic: {
        ai_requests: 1000,
        events: 500,
        tasks: 500,
        storage_mb: 100,
        api_calls: 1000,
        team_members: 3,
        integrations: 5
      },
      pro: {
        ai_requests: 5000,
        events: -1,
        tasks: -1,
        storage_mb: 1000,
        api_calls: 10000,
        team_members: 10,
        integrations: -1
      },
      enterprise: {
        ai_requests: -1,
        events: -1,
        tasks: -1,
        storage_mb: -1,
        api_calls: -1,
        team_members: -1,
        integrations: -1
      }
    };

    const limit = limits[plan]?.[feature_type] ?? 0;

    // Get current month's usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const existingUsage = await base44.asServiceRole.entities.Usage.filter({
      user_email: user.email,
      feature_type,
      period_start: monthStart
    });

    const currentUsage = existingUsage.length > 0 ? (existingUsage[0].count || 0) : 0;
    const allowed = limit === -1 || currentUsage < limit;

    return Response.json({
      allowed,
      current: currentUsage,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - currentUsage),
      percent_used: limit === -1 ? 0 : (currentUsage / limit) * 100,
      plan,
      upgrade_needed: !allowed
    });

  } catch (error) {
    console.error('Check usage limit error:', error);
    return Response.json({ 
      error: error.message,
      allowed: true // Fail open
    }, { status: 500 });
  }
});