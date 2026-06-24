import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { startDate, ramadanYear } = payload;

    const recommendedActivities = {
      1: [
        { activity: 'Qiyam al-Layl (Night Prayer)', duration_minutes: 60, description: 'Perform extended night prayer with focus and humility' },
        { activity: 'Quran Recitation', duration_minutes: 45, description: 'Read with reflection and contemplation' },
        { activity: 'Du\'a & Supplication', duration_minutes: 30, description: 'Make sincere supplications for yourself and ummah' }
      ],
      2: [
        { activity: 'Tafsir Study', duration_minutes: 40, description: 'Study interpretation of selected verses' },
        { activity: 'Qiyam', duration_minutes: 90, description: 'Extended night prayer with increased focus' },
        { activity: 'Istighfar', duration_minutes: 30, description: 'Seek forgiveness abundantly' }
      ],
      3: [
        { activity: 'Memorization Practice', duration_minutes: 60, description: 'Practice memorizing verses or Surahs' },
        { activity: 'Qiyam', duration_minutes: 75, description: 'Night prayer with reflection' },
        { activity: 'Dhikr Circle', duration_minutes: 45, description: 'Engage in remembrance of Allah' }
      ]
    };

    const nights = [];
    const nightStart = new Date(startDate);
    nightStart.setDate(nightStart.getDate() + 20); // Start from 21st day (night 1 of last 10)

    for (let i = 1; i <= 10; i++) {
      const nightDate = new Date(nightStart);
      nightDate.setDate(nightDate.getDate() + (i - 1));

      const activities = recommendedActivities[i] || recommendedActivities[1];

      nights.push({
        night_number: i,
        date: nightDate.toISOString().split('T')[0],
        recommended_worship: activities,
        activities_completed: [],
        qiyam_performed: false,
        completion_percentage: 0,
        energy_level: 5,
        reflection_notes: '',
        is_laylat_qadr_suspected: false,
        ramadan_year: ramadanYear
      });
    }

    await base44.entities.NightOfPower.bulkCreate(nights);

    return Response.json({ 
      success: true,
      message: 'Generated Last 10 Nights schedule',
      nights
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});