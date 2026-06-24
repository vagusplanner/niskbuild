import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    
    // Get past 30 days of events to analyze patterns
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString();
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${thirtyDaysAgo}&timeMax=${today}&maxResults=250&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    const data = await response.json();
    const events = data.items || [];
    
    // Analyze productivity patterns by hour
    const hourlyProductivity = {};
    
    events.forEach(event => {
      if (event.start?.dateTime) {
        const hour = new Date(event.start.dateTime).getHours();
        const isFocusWork = event.summary?.toLowerCase().includes('deep work') ||
                           event.summary?.toLowerCase().includes('focus') ||
                           event.summary?.toLowerCase().includes('development');
        
        hourlyProductivity[hour] = (hourlyProductivity[hour] || 0) + (isFocusWork ? 2 : 1);
      }
    });
    
    // Find peak hours
    const sortedHours = Object.entries(hourlyProductivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
    
    // Get upcoming events for recommendations
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    
    const upcomingResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${tomorrow.toISOString()}&timeMax=${weekFromNow.toISOString()}&maxResults=50&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    const upcomingData = await upcomingResponse.json();
    const upcomingEvents = upcomingData.items || [];
    
    return Response.json({
      peakProductivityHours: sortedHours,
      recommendation: `You're most productive ${sortedHours.map(h => `${h}:00`).join(', ')}. Schedule deep work during these hours.`,
      upcomingEvents: upcomingEvents.map(e => ({
        title: e.summary,
        start: e.start?.dateTime || e.start?.date,
        duration: e.end && e.start ? new Date(e.end.dateTime) - new Date(e.start.dateTime) : null
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});