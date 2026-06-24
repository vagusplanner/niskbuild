import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { achievement_type, ramadanYear } = payload;

    const badgeDefinitions = {
      taraweeh_master: {
        badge_type: 'taraweeh_master',
        title: 'Taraweeh Master',
        description: 'Completed all 30 Taraweeh prayers',
        requirement: 'Attend Taraweeh all 30 nights',
        rarity: 'uncommon',
        icon_color: 'emerald'
      },
      laylat_qadr_warrior: {
        badge_type: 'laylat_qadr_warrior',
        title: 'Laylat al-Qadr Warrior',
        description: 'Perfect performance in all 10 nights',
        requirement: '100% completion in all last 10 nights',
        rarity: 'rare',
        icon_color: 'purple'
      },
      dua_master: {
        badge_type: 'dua_master',
        title: 'Du\'a Master',
        description: 'Mastered 30 different Du\'as',
        requirement: 'Complete 30 du\'a challenges',
        rarity: 'uncommon',
        icon_color: 'pink'
      },
      hafiz_journey: {
        badge_type: 'hafiz_journey',
        title: 'Hafiz Journey',
        description: 'Memorized full Quran',
        requirement: 'Complete full Quran memorization',
        rarity: 'legendary',
        icon_color: 'gold'
      },
      quran_completer: {
        badge_type: 'quran_completer',
        title: 'Quran Completer',
        description: 'Read the entire Quran',
        requirement: 'Read all 30 juz',
        rarity: 'epic',
        icon_color: 'teal'
      },
      qiyam_champion: {
        badge_type: 'qiyam_champion',
        title: 'Qiyam Champion',
        description: 'Performed Qiyam every night',
        requirement: 'Night prayer all 30 nights',
        rarity: 'rare',
        icon_color: 'indigo'
      },
      consistency_king: {
        badge_type: 'consistency_king',
        title: 'Consistency King',
        description: '30-day challenge streak',
        requirement: 'Complete 30 consecutive daily challenges',
        rarity: 'common',
        icon_color: 'blue'
      },
      last_ten_legend: {
        badge_type: 'last_ten_legend',
        title: 'Last 10 Legend',
        description: 'Maximum points in last 10 days',
        requirement: '100% completion and bonus points in last 10 nights',
        rarity: 'legendary',
        icon_color: 'orange'
      }
    };

    const badge = badgeDefinitions[achievement_type];
    if (!badge) {
      return Response.json({ error: 'Badge type not found' }, { status: 400 });
    }

    // Check if already earned
    const existing = await base44.entities.RamadanBadge.filter({
      badge_type: achievement_type,
      ramadan_year: ramadanYear
    });

    if (existing.length > 0) {
      return Response.json({ 
        message: 'Badge already earned',
        badge: existing[0]
      });
    }

    // Create new badge
    const newBadge = await base44.entities.RamadanBadge.create({
      ...badge,
      earned_date: new Date().toISOString().split('T')[0],
      ramadan_year: ramadanYear
    });

    return Response.json({ 
      success: true,
      badge: newBadge,
      message: `Congratulations! You earned the ${badge.title} badge! 🎉`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});