import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const POINT_SYSTEM = {
  // Health Activities
  'log_sleep': { points: 10, category: 'health', description: 'Logged sleep data' },
  'log_exercise': { points: 20, category: 'health', description: 'Completed workout' },
  'log_nutrition': { points: 15, category: 'health', description: 'Tracked meal' },
  'log_mood': { points: 10, category: 'health', description: 'Logged mood' },
  'complete_health_goal': { points: 100, category: 'health', description: 'Completed health goal' },
  'update_health_goal': { points: 5, category: 'health', description: 'Updated goal progress' },
  'seven_day_streak': { points: 50, category: 'health', description: '7-day tracking streak' },
  
  // Islamic Activities - Prayer
  'log_prayer': { points: 15, category: 'islamic', description: 'Logged Fard prayer' },
  'log_prayer_ontime': { points: 20, category: 'islamic', description: 'Logged prayer on time' },
  'log_prayer_congregation': { points: 25, category: 'islamic', description: 'Prayed in congregation' },
  'log_sunnah_muakkadah': { points: 10, category: 'islamic', description: 'Logged Sunnah Muakkadah prayer' },
  'log_sunnah': { points: 5, category: 'islamic', description: 'Logged Sunnah prayer' },
  'log_nafl': { points: 5, category: 'islamic', description: 'Logged Nafl prayer' },
  'log_witr': { points: 8, category: 'islamic', description: 'Logged Witr prayer' },
  'makeup_prayer': { points: 12, category: 'islamic', description: 'Made up missed prayer (Qada)' },
  
  // Other Islamic Activities
  'read_quran': { points: 25, category: 'islamic', description: 'Read Quran' },
  'complete_quran_goal': { points: 100, category: 'islamic', description: 'Completed Quran goal' },
  'log_fasting': { points: 30, category: 'islamic', description: 'Fasted today' },
  'complete_ramadan_challenge': { points: 75, category: 'islamic', description: 'Completed Ramadan challenge' },
  'memorize_verses': { points: 40, category: 'islamic', description: 'Memorized new verses' },
  
  // Travel/Planning Activities
  'create_holiday': { points: 20, category: 'travel', description: 'Planned new trip' },
  'complete_trip': { points: 50, category: 'travel', description: 'Completed trip' },
  'log_expense': { points: 5, category: 'travel', description: 'Tracked expense' },
  'share_itinerary': { points: 15, category: 'travel', description: 'Shared itinerary' },
  
  // Productivity
  'create_event': { points: 10, category: 'productivity', description: 'Created calendar event' },
  'complete_task': { points: 15, category: 'productivity', description: 'Completed task' },
  'achieve_goal': { points: 100, category: 'productivity', description: 'Achieved goal' }
};

const BADGE_THRESHOLDS = {
  health_warrior: { points: 500, category: 'health', title: 'Health Warrior', description: 'Earned 500+ health points' },
  spiritual_seeker: { points: 500, category: 'islamic', title: 'Spiritual Seeker', description: 'Earned 500+ Islamic points' },
  travel_enthusiast: { points: 300, category: 'travel', title: 'Travel Enthusiast', description: 'Earned 300+ travel points' },
  productivity_master: { points: 400, category: 'productivity', title: 'Productivity Master', description: 'Earned 400+ productivity points' },
  
  consistent_tracker: { streak: 30, title: 'Consistency Champion', description: '30-day tracking streak' },
  early_adopter: { activities: 100, title: 'Early Adopter', description: 'Completed 100 activities' }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Handle both direct calls and entity automation calls
    let activity_type, metadata;
    
    // For entity automations there is no user session - authenticate only for direct calls
    const isEntityAutomation = !!(payload.event && payload.event.type);
    if (!isEntityAutomation) {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    if (payload.event && payload.event.type) {
      // Called from entity automation
      const entityName = payload.event.entity_name;
      const eventType = payload.event.type;
      const entityData = payload.data || {};
      
      // Auto-detect activity type based on entity
      if (entityName === 'PrayerLog') {
        // Determine prayer activity type based on prayer log data
        // Accept both 'performed' status and any log with performed_at field
        const isPerformed = entityData.status === 'performed' || entityData.performed_at;
        
        if (isPerformed) {
          if (entityData.is_makeup_prayer) {
            activity_type = 'makeup_prayer';
          } else if (entityData.prayer_type === 'fard') {
            if (entityData.in_congregation) {
              activity_type = 'log_prayer_congregation';
            } else if (entityData.prayed_on_time) {
              activity_type = 'log_prayer_ontime';
            } else {
              activity_type = 'log_prayer';
            }
          } else if (entityData.prayer_type === 'sunnah_muakkadah') {
            activity_type = 'log_sunnah_muakkadah';
          } else if (entityData.prayer_type === 'sunnah_ghair_muakkadah') {
            activity_type = 'log_sunnah';
          } else if (entityData.prayer_type === 'nafl') {
            activity_type = 'log_nafl';
          } else if (entityData.prayer_type === 'witr') {
            activity_type = 'log_witr';
          } else {
            // Default to log_prayer if no specific type
            activity_type = 'log_prayer';
          }
        } else {
          // If prayer not performed (missed), skip awarding points
          return Response.json({ 
            success: true, 
            message: 'No points awarded for missed prayers',
            points_awarded: 0 
          });
        }
      } else if (entityName === 'QuranReading') {
        activity_type = 'read_quran';
      } else if (entityName === 'QuranMemorization') {
        activity_type = 'memorize_verses';
      } else if (entityName === 'FastingRecord') {
        activity_type = 'log_fasting';
      } else if (entityName === 'Sleep') {
        activity_type = 'log_sleep';
      } else if (entityName === 'Exercise') {
        activity_type = 'log_exercise';
      } else if (entityName === 'Nutrition') {
        activity_type = 'log_nutrition';
      } else if (entityName === 'Mood') {
        activity_type = 'log_mood';
      } else if (entityName === 'Holiday') {
        activity_type = eventType === 'create' ? 'create_holiday' : null;
      } else if (entityName === 'Task' && entityData.status === 'completed') {
        activity_type = 'complete_task';
      } else if (entityName === 'Event') {
        activity_type = eventType === 'create' ? 'create_event' : null;
      } else {
        // Fallback to function_args for other entities
        activity_type = payload.activity_type;
      }

      // Always allow function_args activity_type to override if auto-detect gave null
      if (!activity_type && payload.activity_type) {
        activity_type = payload.activity_type;
      }
      
      metadata = {
        entity_name: entityName,
        entity_id: payload.event.entity_id,
        event_type: eventType,
        ...entityData
      };
    } else {
      // Direct function call
      activity_type = payload.activity_type;
      metadata = payload.metadata || {};
    }
    
    console.log('Payload received:', JSON.stringify(payload, null, 2));
    console.log('Activity type:', activity_type);

    if (!activity_type) {
      // Nothing to award for this event (e.g. holiday update, task not yet completed)
      return Response.json({ success: true, message: 'No points awarded for this event', points_awarded: 0 });
    }

    if (!POINT_SYSTEM[activity_type]) {
      return Response.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    const activity = POINT_SYSTEM[activity_type];

    // Award points
    await base44.asServiceRole.entities.GamificationPoints.create({
      activity_type,
      points_earned: activity.points,
      category: activity.category,
      description: activity.description,
      metadata
    });

    // Get user's total points by category
    const allPoints = await base44.entities.GamificationPoints.list();
    const categoryPoints = allPoints
      .filter(p => p.category === activity.category)
      .reduce((sum, p) => sum + p.points_earned, 0);

    const totalPoints = allPoints.reduce((sum, p) => sum + p.points_earned, 0);
    const totalActivities = allPoints.length;

    // Check for badge eligibility
    const newBadges = [];
    
    for (const [badgeKey, criteria] of Object.entries(BADGE_THRESHOLDS)) {
      // Check if badge already awarded
      const existingBadge = await base44.entities.UserAchievement.filter({
        badge_key: badgeKey
      });

      if (existingBadge.length > 0) continue;

      // Check criteria
      let eligible = false;
      
      if (criteria.points && criteria.category) {
        eligible = categoryPoints >= criteria.points;
      } else if (criteria.activities) {
        eligible = totalActivities >= criteria.activities;
      }

      if (eligible) {
        await base44.asServiceRole.entities.UserAchievement.create({
          title: criteria.title,
          description: criteria.description,
          badge_key: badgeKey,
          earned_date: new Date().toISOString(),
          category: criteria.category || 'general',
          points_value: criteria.points || 100
        });
        newBadges.push(criteria.title);
      }
    }

    return Response.json({
      success: true,
      points_awarded: activity.points,
      total_points: totalPoints,
      category_points: categoryPoints,
      new_badges: newBadges,
      activity: {
        type: activity_type,
        description: activity.description
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});