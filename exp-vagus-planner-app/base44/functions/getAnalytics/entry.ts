import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeRange = '30d' } = await req.json();
    
    // Calculate date range
    const now = new Date();
    const daysAgo = parseInt(timeRange) || 30;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Fetch analytics events
    const events = await base44.asServiceRole.entities.AnalyticsEvent.filter({
      user_email: user.email
    });

    const filteredEvents = events.filter(e => 
      new Date(e.created_date) >= startDate
    );

    // Calculate metrics
    const eventMetrics = {
      total_events_created: filteredEvents.filter(e => e.event_type === 'event_created').length,
      total_events_completed: filteredEvents.filter(e => e.event_type === 'event_completed').length,
      completion_rate: 0
    };
    
    if (eventMetrics.total_events_created > 0) {
      eventMetrics.completion_rate = 
        (eventMetrics.total_events_completed / eventMetrics.total_events_created * 100).toFixed(1);
    }

    const chatMetrics = {
      messages_sent: filteredEvents.filter(e => e.event_type === 'message_sent').length,
      messages_received: filteredEvents.filter(e => e.event_type === 'message_received').length,
      total_messages: 0
    };
    chatMetrics.total_messages = chatMetrics.messages_sent + chatMetrics.messages_received;

    const aiMetrics = {
      suggestions_accepted: filteredEvents.filter(e => e.event_type === 'ai_suggestion_accepted').length,
      suggestions_rejected: filteredEvents.filter(e => e.event_type === 'ai_suggestion_rejected').length,
      schedule_success: filteredEvents.filter(e => e.event_type === 'ai_schedule_success').length,
      schedule_failed: filteredEvents.filter(e => e.event_type === 'ai_schedule_failed').length,
      acceptance_rate: 0,
      success_rate: 0,
      avg_response_time: 0
    };

    const totalSuggestions = aiMetrics.suggestions_accepted + aiMetrics.suggestions_rejected;
    if (totalSuggestions > 0) {
      aiMetrics.acceptance_rate = (aiMetrics.suggestions_accepted / totalSuggestions * 100).toFixed(1);
    }

    const totalSchedules = aiMetrics.schedule_success + aiMetrics.schedule_failed;
    if (totalSchedules > 0) {
      aiMetrics.success_rate = (aiMetrics.schedule_success / totalSchedules * 100).toFixed(1);
    }

    // Calculate average response time
    const aiEvents = filteredEvents.filter(e => e.duration_ms);
    if (aiEvents.length > 0) {
      const avgMs = aiEvents.reduce((sum, e) => sum + e.duration_ms, 0) / aiEvents.length;
      aiMetrics.avg_response_time = (avgMs / 1000).toFixed(2);
    }

    // Daily trends
    const dailyData = {};
    filteredEvents.forEach(event => {
      const date = new Date(event.created_date).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          events: 0,
          messages: 0,
          ai_interactions: 0
        };
      }
      
      if (event.category === 'events') dailyData[date].events++;
      if (event.category === 'communication') dailyData[date].messages++;
      if (event.category === 'ai_assistant') dailyData[date].ai_interactions++;
    });

    const dailyTrends = Object.values(dailyData).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    return Response.json({
      eventMetrics,
      chatMetrics,
      aiMetrics,
      dailyTrends,
      timeRange: `${daysAgo}d`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});