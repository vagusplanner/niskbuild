import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user data for analysis
    const [events, donations, zakatCalcs, quranReadings, settings] = await Promise.all([
      base44.entities.Event.list('-created_date', 50),
      base44.entities.CharitableGiving.list('-created_date', 50),
      base44.entities.ZakatCalculation.list('-created_date', 10),
      base44.entities.QuranReading.list('-created_date', 30),
      base44.entities.UserSettings.list()
    ]);

    // Analyze patterns
    const analysis = {
      charity_patterns: {
        favorite_categories: {},
        donation_frequency: donations.length > 0 ? 'regular' : 'occasional',
        avg_donation: donations.length > 0 
          ? donations.reduce((sum, d) => sum + d.amount, 0) / donations.length 
          : 0,
        recurring_donations: donations.filter(d => d.recurring).length
      },
      islamic_engagement: {
        quran_reading_frequency: quranReadings.length > 0 ? 'active' : 'inactive',
        prayer_tracking: events.filter(e => e.category === 'prayer').length > 0,
        preferred_times: []
      },
      event_patterns: {
        common_categories: {},
        planning_horizon_days: 0
      },
      location_context: {
        city: settings[0]?.location_city || null,
        country: settings[0]?.location_country || null
      }
    };

    // Analyze charity categories
    donations.forEach(d => {
      if (d.category) {
        analysis.charity_patterns.favorite_categories[d.category] = 
          (analysis.charity_patterns.favorite_categories[d.category] || 0) + 1;
      }
    });

    // Analyze event categories
    events.forEach(e => {
      if (e.category) {
        analysis.event_patterns.common_categories[e.category] = 
          (analysis.event_patterns.common_categories[e.category] || 0) + 1;
      }
    });

    // Generate personalized suggestions
    const suggestions = [];

    // Charity suggestions
    if (analysis.charity_patterns.favorite_categories.orphans > 2) {
      suggestions.push({
        type: 'sadaqah_recipients',
        message: 'You frequently donate to orphanages. Would you like me to find local orphan support organizations?',
        action: 'create_goal'
      });
    }

    // Islamic events
    if (analysis.location_context.city) {
      suggestions.push({
        type: 'islamic_events',
        message: `Would you like me to notify you about Islamic events and lectures in ${analysis.location_context.city}?`,
        action: 'create_goal'
      });
    }

    // Hajj/Umrah planning
    const hasHajjInterest = events.some(e => 
      e.title?.toLowerCase().includes('hajj') || 
      e.title?.toLowerCase().includes('umrah')
    );
    if (hasHajjInterest && !zakatCalcs.some(z => z.year === new Date().getFullYear())) {
      suggestions.push({
        type: 'hajj_umrah_planning',
        message: 'I noticed you have Hajj/Umrah plans. Would you like help with budgeting and preparation?',
        action: 'create_goal'
      });
    }

    return Response.json({ 
      analysis,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Personalization analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});