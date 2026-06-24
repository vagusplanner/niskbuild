import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeframe = 'week' } = await req.json();

    // Fetch events and meetings
    const [events, meetings] = await Promise.all([
      base44.entities.Event.list('-start_date', 100),
      base44.entities.Meeting.list('-created_date', 50)
    ]);

    // Calculate metrics
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const thisWeekEvents = events.filter(e => new Date(e.start_date) >= weekAgo);
    const thisWeekMeetings = meetings.filter(m => m.confirmed_date && new Date(m.confirmed_date) >= weekAgo);

    // Meeting effectiveness analysis
    const meetingDurations = thisWeekMeetings.map(m => m.duration_minutes || 30);
    const avgDuration = meetingDurations.length > 0 ? meetingDurations.reduce((a, b) => a + b) / meetingDurations.length : 0;
    const under30Count = meetingDurations.filter(d => d < 30).length;
    const over60Count = meetingDurations.filter(d => d >= 60).length;

    // Time distribution by category
    const categoryStats = {};
    thisWeekEvents.forEach(event => {
      const cat = event.category || 'other';
      const duration = event.end_date ? (new Date(event.end_date) - new Date(event.start_date)) / 3600000 : 0;
      
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, hours: 0 };
      }
      categoryStats[cat].count += 1;
      categoryStats[cat].hours += duration;
    });

    // Clash detection
    const clashes = [];
    const sortedEvents = thisWeekEvents.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];
      const endTime = new Date(current.end_date || current.start_date);
      const nextStart = new Date(next.start_date);
      const gapMinutes = (nextStart - endTime) / (1000 * 60);

      if (gapMinutes > 0 && gapMinutes <= 30) {
        clashes.push({
          event1: current.title,
          event2: next.title,
          gapMinutes: Math.round(gapMinutes)
        });
      }
    }

    return Response.json({
      metrics: {
        totalEvents: thisWeekEvents.length,
        totalMeetings: thisWeekMeetings.length,
        avgMeetingDuration: Math.round(avgDuration * 10) / 10,
        under30Percentage: thisWeekMeetings.length > 0 ? Math.round((under30Count / thisWeekMeetings.length) * 100) : 0,
        over60Count,
        totalHours: Math.round(thisWeekEvents.reduce((sum, e) => sum + (e.end_date ? (new Date(e.end_date) - new Date(e.start_date)) / 3600000 : 0), 0) * 10) / 10
      },
      categoryStats,
      clashes,
      insights: {
        efficiency: under30Count > thisWeekMeetings.length * 0.4 ? 'high' : 'moderate',
        recommendation: clashes.length > 0 ? 'Consider consolidating back-to-back meetings' : 'Your schedule looks well-paced',
        busiest_category: Object.entries(categoryStats).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'none'
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});