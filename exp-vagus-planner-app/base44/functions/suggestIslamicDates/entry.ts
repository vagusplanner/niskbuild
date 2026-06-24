import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { current_hijri_month, current_hijri_year } = await req.json();

    // Important Islamic dates patterns
    const importantDates = [
      { month: 1, day: 1, name: 'Islamic New Year', type: 'sacred_month', recurring: true },
      { month: 1, day: 10, name: 'Day of Ashura', type: 'ashura', recurring: true },
      { month: 3, day: 12, name: 'Mawlid al-Nabi (Prophet Muhammad Birth)', type: 'mawlid', recurring: true },
      { month: 7, day: 1, name: 'Rajab Begins - Sacred Month', type: 'sacred_month', recurring: true },
      { month: 7, day: 27, name: 'Laylat al-Isra wa al-Miraj', type: 'special_night', recurring: true },
      { month: 8, day: 15, name: "Sha'ban Mid-Month (Laylat al-Bara'ah)", type: 'special_night', recurring: true },
      { month: 9, day: 1, name: 'Ramadan Begins', type: 'ramadan', recurring: true },
      { month: 9, day: 27, name: 'Laylat al-Qadr (Night of Power)', type: 'special_night', recurring: true },
      { month: 10, day: 1, name: 'Eid al-Fitr', type: 'eid', recurring: true },
      { month: 12, day: 8, name: 'Arafat Day', type: 'hajj_phase', recurring: true },
      { month: 12, day: 10, name: 'Eid al-Adha', type: 'eid', recurring: true },
      { month: 12, day: 11, name: 'Tashreeq Days Begin', type: 'hajj_phase', recurring: true }
    ];

    const upcomingDates = importantDates
      .filter(date => {
        if (date.month > current_hijri_month) return true;
        if (date.month === current_hijri_month && date.day >= 1) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      })
      .slice(0, 5);

    return Response.json({
      success: true,
      current_month: current_hijri_month,
      current_year: current_hijri_year,
      upcoming_dates: upcomingDates,
      all_important_dates: importantDates
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});