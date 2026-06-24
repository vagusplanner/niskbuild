import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { memorization_id, action } = payload;

    // Fetch the memorization record
    const memorizations = await base44.entities.QuranMemorization.filter({ id: memorization_id });
    const memorization = memorizations[0];

    if (!memorization) {
      return Response.json({ error: 'Memorization not found' }, { status: 404 });
    }

    let points = 0;
    let badge = null;
    let description = '';

    // Point system based on action and verses
    if (action === 'memorized') {
      points = memorization.total_verses * 10; // 10 points per verse
      description = `Memorized ${memorization.surah_name} (${memorization.from_verse}-${memorization.to_verse})`;
      
      // Bonus for completing full chapters
      if (memorization.from_verse === 1) {
        if (memorization.surah_number === 2 && memorization.to_verse === 286) { // Al-Baqarah
          points += 500;
          badge = 'Al-Baqarah Master';
        } else if (memorization.surah_number === 18 && memorization.to_verse === 110) { // Al-Kahf
          points += 300;
          badge = 'Friday Champion';
        } else if (memorization.surah_number === 36 && memorization.to_verse === 83) { // Ya-Sin
          points += 250;
          badge = 'Heart of Quran';
        }
      }
    } else if (action === 'reviewed') {
      points = Math.ceil(memorization.total_verses * 3); // 3 points per verse for review
      description = `Reviewed ${memorization.surah_name} (${memorization.from_verse}-${memorization.to_verse})`;
    }

    if (points > 0) {
      // Award points
      await base44.entities.GamificationPoints.create({
        activity_type: action === 'memorized' ? 'quran_memorization' : 'quran_review',
        activity_details: description,
        points_earned: points,
        category: 'quran'
      });

      // Check for milestone badges
      const allPoints = await base44.entities.GamificationPoints.filter({ 
        created_by: user.email,
        category: 'quran'
      });
      
      const totalQuranPoints = allPoints.reduce((sum, p) => sum + (p.points_earned || 0), 0);

      // Award milestone badges
      const milestones = [
        { points: 100, name: 'Quran Beginner', achieved: false },
        { points: 500, name: 'Hafidh in Training', achieved: false },
        { points: 1000, name: 'Dedicated Memorizer', achieved: false },
        { points: 2500, name: 'Quran Scholar', achieved: false },
        { points: 5000, name: 'Master Hafidh', achieved: false }
      ];

      const newBadges = [];
      for (const milestone of milestones) {
        if (totalQuranPoints >= milestone.points) {
          // Check if badge already exists
          const existingBadge = await base44.entities.UserAchievement.filter({
            created_by: user.email,
            achievement_name: milestone.name
          });

          if (existingBadge.length === 0) {
            await base44.entities.UserAchievement.create({
              achievement_type: 'quran_milestone',
              achievement_name: milestone.name,
              achievement_description: `Earned ${milestone.points} Quran memorization points`,
              points_value: milestone.points,
              earned_date: new Date().toISOString().split('T')[0]
            });
            newBadges.push(milestone.name);
          }
        }
      }

      return Response.json({
        success: true,
        points_awarded: points,
        badge_earned: badge,
        new_milestone_badges: newBadges,
        total_quran_points: totalQuranPoints,
        message: `Earned ${points} points! ${newBadges.length > 0 ? `New badge(s): ${newBadges.join(', ')}` : ''}`
      });
    }

    return Response.json({ success: true, points_awarded: 0 });

  } catch (error) {
    console.error('Award memorization points error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});