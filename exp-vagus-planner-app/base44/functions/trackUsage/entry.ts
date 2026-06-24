import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Track feature usage for a user
 * Updates the Usage entity and enforces plan limits
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feature_type, amount = 1, metadata = {} } = await req.json();

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
        events: -1, // unlimited
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

    // Get current month's usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const existingUsage = await base44.asServiceRole.entities.Usage.filter({
      user_email: user.email,
      feature_type,
      period_start: monthStart
    });

    let currentUsage = 0;
    let usageRecord;

    if (existingUsage.length > 0) {
      usageRecord = existingUsage[0];
      currentUsage = usageRecord.count || 0;
    }

    // Check limit
    const limit = limits[plan]?.[feature_type] ?? 0;
    const newUsage = currentUsage + amount;

    if (limit !== -1 && newUsage > limit) {
      return Response.json({
        allowed: false,
        limit_exceeded: true,
        current: currentUsage,
        limit,
        plan,
        message: `You've reached your ${plan} plan limit for ${feature_type.replace('_', ' ')}. Upgrade to continue.`
      }, { status: 403 });
    }

    // Update or create usage record
    if (usageRecord) {
      await base44.asServiceRole.entities.Usage.update(usageRecord.id, {
        count: newUsage,
        last_used: new Date().toISOString()
      });
    } else {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      await base44.asServiceRole.entities.Usage.create({
        user_email: user.email,
        feature_type,
        count: amount,
        period_start: monthStart,
        period_end: monthEnd,
        plan,
        metadata,
        last_used: new Date().toISOString()
      });
    }

    // Send warning if approaching limit (80% or 90%)
    if (limit !== -1) {
      const percentUsed = (newUsage / limit) * 100;
      
      if ((percentUsed >= 80 && percentUsed < 90 && currentUsage < limit * 0.8) ||
          (percentUsed >= 90 && currentUsage < limit * 0.9)) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject: `Usage Alert: ${Math.round(percentUsed)}% of ${feature_type} limit reached`,
            body: `You've used ${newUsage} of ${limit} ${feature_type.replace('_', ' ')} this month (${Math.round(percentUsed)}%). Consider upgrading your plan to avoid interruption.`
          });
        } catch (emailError) {
          console.error('Failed to send usage warning email:', emailError);
        }
      }
    }

    return Response.json({
      allowed: true,
      current: newUsage,
      limit,
      remaining: limit === -1 ? -1 : limit - newUsage,
      percent_used: limit === -1 ? 0 : (newUsage / limit) * 100,
      plan
    });

  } catch (error) {
    console.error('Usage tracking error:', error);
    return Response.json({ 
      error: error.message,
      allowed: true // Fail open to not block users on errors
    }, { status: 500 });
  }
});