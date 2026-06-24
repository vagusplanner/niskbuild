import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workout_duration = 60 } = await req.json();

    // Get next 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    // Get user data
    const [events, energyLogs, sleepData, periods] = await Promise.all([
      base44.entities.Event.filter({ 
        date: { $in: dates },
        created_by: user.email 
      }),
      base44.entities.EnergyLog.list('-created_date', 30),
      base44.entities.Sleep.list('-date', 14),
      base44.entities.Period.list('-start_date', 6)
    ]);

    // Analyze energy patterns by time of day
    const energyByHour = {};
    energyLogs.forEach(log => {
      if (log.time) {
        const hour = parseInt(log.time.split(':')[0]);
        if (!energyByHour[hour]) energyByHour[hour] = [];
        energyByHour[hour].push(log.energy_level);
      }
    });

    // Calculate average energy for each hour
    const avgEnergyByHour = {};
    Object.keys(energyByHour).forEach(hour => {
      avgEnergyByHour[hour] = energyByHour[hour].reduce((a, b) => a + b, 0) / energyByHour[hour].length;
    });

    // Find high energy windows
    const highEnergyHours = Object.entries(avgEnergyByHour)
      .filter(([_, energy]) => energy >= 7)
      .map(([hour, _]) => parseInt(hour))
      .sort((a, b) => avgEnergyByHour[b] - avgEnergyByHour[a]);

    // Use AI to suggest optimal workout times
    const context = `
Suggest optimal workout times for the next 7 days:

Energy Patterns:
- High energy hours: ${highEnergyHours.join(', ')}
- Average sleep duration: ${sleepData.length > 0 ? (sleepData.reduce((s, d) => s + d.duration_hours, 0) / sleepData.length).toFixed(1) : 'N/A'} hours
- Recent sleep quality: ${sleepData.slice(0, 3).map(s => s.quality).join(', ')}

Calendar events for next 7 days: ${events.length} scheduled
Busy hours: ${events.map(e => e.start_time).filter(t => t).join(', ')}

Period tracking: ${periods.length > 0 ? 'Active data available' : 'No data'}
${periods.length > 0 ? `Last period: ${periods[0].start_date}, Cycle: ${periods[0].cycle_length} days` : ''}

Workout duration needed: ${workout_duration} minutes

Consider:
1. Energy peaks (best times for intense workouts)
2. Calendar availability (no conflicts)
3. Sleep quality (avoid workouts after poor sleep)
4. Period phase (adjust intensity recommendations)
5. Recovery time (not too late to affect sleep)

Provide top 5 workout time suggestions with:
- Date and time slot
- Energy level expected
- Workout intensity recommendation
- Reasoning
    `;

    const aiSuggestions = await base44.integrations.Core.InvokeLLM({
      prompt: context,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                time_slot: { type: 'string' },
                expected_energy: { type: 'number' },
                intensity: { type: 'string' },
                workout_type: { type: 'string' },
                reasoning: { type: 'string' }
              }
            }
          },
          weekly_plan: { type: 'string' }
        }
      }
    });

    // Create insight
    await base44.entities.HealthInsight.create({
      date: new Date().toISOString().split('T')[0],
      type: 'workout_suggestion',
      title: 'Optimal Workout Times This Week',
      description: aiSuggestions.weekly_plan,
      recommendations: aiSuggestions.suggestions.map(s => 
        `${s.date} at ${s.time_slot}: ${s.workout_type} (${s.intensity})`
      ),
      data_points: {
        suggestions: aiSuggestions.suggestions,
        high_energy_hours: highEnergyHours
      },
      priority: 'medium'
    });

    return Response.json({
      success: true,
      suggestions: aiSuggestions.suggestions,
      weekly_plan: aiSuggestions.weekly_plan
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});