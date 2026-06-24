import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, points, metadata = {} } = await req.json();

    // Get or create user's gamification points
    let userPoints = await base44.entities.GamificationPoints.filter({ created_by: user.email });
    
    if (userPoints.length === 0) {
      userPoints = [await base44.asServiceRole.entities.GamificationPoints.create({
        total_points: 0,
        current_level: 1,
        points_to_next_level: 100,
        current_streak: 0,
        longest_streak: 0,
        achievements_unlocked: 0,
        challenges_completed: 0,
        rank: 'Novice',
        created_by: user.email
      })];
    }

    const currentPoints = userPoints[0];
    const newTotalPoints = currentPoints.total_points + points;
    
    // Calculate level progression
    const POINTS_PER_LEVEL = 100;
    const LEVEL_MULTIPLIER = 1.2;
    
    let newLevel = currentPoints.current_level;
    let pointsForNextLevel = currentPoints.points_to_next_level;
    let pointsNeeded = Math.floor(POINTS_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, newLevel - 1));
    
    // Level up if threshold reached
    let levelsGained = 0;
    while (newTotalPoints >= pointsNeeded) {
      newLevel++;
      levelsGained++;
      pointsNeeded = Math.floor(POINTS_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, newLevel - 1));
    }
    
    pointsForNextLevel = pointsNeeded - newTotalPoints;

    // Determine rank based on level
    let rank = 'Novice';
    if (newLevel >= 50) rank = 'Legend';
    else if (newLevel >= 30) rank = 'Master';
    else if (newLevel >= 15) rank = 'Achiever';
    else if (newLevel >= 5) rank = 'Explorer';

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const lastActive = currentPoints.last_active_date;
    let newStreak = currentPoints.current_streak;
    
    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActive === yesterdayStr) {
        newStreak++;
      } else {
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(currentPoints.longest_streak, newStreak);

    // Update points record
    await base44.asServiceRole.entities.GamificationPoints.update(currentPoints.id, {
      total_points: newTotalPoints,
      current_level: newLevel,
      points_to_next_level: pointsForNextLevel,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_active_date: today,
      rank
    });

    // Check for achievements
    const achievements = await checkAchievements(base44, user.email, {
      total_points: newTotalPoints,
      level: newLevel,
      streak: newStreak,
      action,
      metadata
    });

    return Response.json({
      success: true,
      points_awarded: points,
      new_total: newTotalPoints,
      level: newLevel,
      leveled_up: levelsGained > 0,
      levels_gained: levelsGained,
      rank,
      streak: newStreak,
      achievements_unlocked: achievements
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function checkAchievements(base44, userEmail, stats) {
  const unlocked = [];
  
  // Define achievement conditions
  const achievementChecks = [
    { id: 'first_task', condition: stats.action === 'task_completed' && stats.metadata.count === 1, points: 10 },
    { id: 'task_master_10', condition: stats.action === 'task_completed' && stats.metadata.count === 10, points: 50 },
    { id: 'task_master_50', condition: stats.action === 'task_completed' && stats.metadata.count === 50, points: 200 },
    { id: 'streak_7', condition: stats.streak === 7, points: 100 },
    { id: 'streak_30', condition: stats.streak === 30, points: 500 },
    { id: 'level_10', condition: stats.level === 10, points: 150 },
    { id: 'level_25', condition: stats.level === 25, points: 400 },
    { id: 'early_bird', condition: stats.action === 'morning_login' && stats.metadata.hour < 7, points: 25 }
  ];

  for (const check of achievementChecks) {
    if (check.condition) {
      const existing = await base44.entities.UserAchievement.filter({ 
        created_by: userEmail,
        achievement_id: check.id
      });
      
      if (existing.length === 0) {
        await base44.asServiceRole.entities.UserAchievement.create({
          achievement_id: check.id,
          unlocked_at: new Date().toISOString(),
          progress: 100,
          is_new: true,
          created_by: userEmail
        });
        unlocked.push(check.id);
      }
    }
  }

  return unlocked;
}