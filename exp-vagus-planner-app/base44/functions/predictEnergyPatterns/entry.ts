import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get comprehensive health data
    const [sleepData, energyLogs, periods] = await Promise.all([
      base44.entities.Sleep.list('-date', 30),
      base44.entities.EnergyLog.list('-created_date', 60),
      base44.entities.Period.list('-start_date', 6)
    ]);

    if (energyLogs.length < 5) {
      return Response.json({
        success: false,
        message: 'Need at least 5 energy logs for pattern prediction'
      });
    }

    // Calculate cycle day if period data available
    let cycleDay = null;
    let cyclePhase = null;
    if (periods.length > 0) {
      const lastPeriod = periods[0];
      const daysSinceStart = Math.floor((new Date() - new Date(lastPeriod.start_date)) / (1000 * 60 * 60 * 24));
      const cycleLength = lastPeriod.cycle_length || 28;
      cycleDay = (daysSinceStart % cycleLength) + 1;
      
      if (cycleDay <= 5) cyclePhase = 'menstrual';
      else if (cycleDay <= 14) cyclePhase = 'follicular';
      else if (cycleDay <= 17) cyclePhase = 'ovulation';
      else cyclePhase = 'luteal';
    }

    // Correlate energy with sleep
    const recentEnergy = energyLogs.slice(0, 14);
    const sleepEnergyCorrelation = [];
    
    recentEnergy.forEach(log => {
      const matchingSleep = sleepData.find(s => s.date === log.date);
      if (matchingSleep) {
        sleepEnergyCorrelation.push({
          date: log.date,
          sleep_hours: matchingSleep.duration_hours,
          sleep_quality: matchingSleep.quality,
          energy_level: log.energy_level
        });
      }
    });

    const context = `
Predict energy patterns and provide personalized insights:

Energy Data:
- Total logs: ${energyLogs.length}
- Average energy: ${(energyLogs.reduce((s, e) => s + e.energy_level, 0) / energyLogs.length).toFixed(1)}/10
- Recent trend (last 7 days): ${recentEnergy.slice(0, 7).map(e => e.energy_level).join(', ')}

Sleep-Energy Correlation:
${sleepEnergyCorrelation.map(c => `${c.date}: ${c.sleep_hours}h (${c.sleep_quality}) → Energy: ${c.energy_level}/10`).join('\n')}

Period Tracking:
${periods.length > 0 ? `
- Cycle day: ${cycleDay}
- Current phase: ${cyclePhase}
- Last period: ${periods[0].start_date}
- Cycle length: ${periods[0].cycle_length} days
` : 'No period data available'}

Analyze and provide:
1. Energy pattern insights (daily rhythm, weekly trends)
2. Sleep impact on energy (correlation strength)
3. Period phase impact on energy (if applicable)
4. Predicted high/low energy days in next week
5. Personalized tips to maintain high energy
6. Warning signs of burnout or fatigue
    `;

    const aiPrediction = await base44.integrations.Core.InvokeLLM({
      prompt: context,
      response_json_schema: {
        type: 'object',
        properties: {
          energy_pattern: { type: 'string' },
          sleep_correlation: { type: 'string' },
          period_impact: { type: 'string' },
          predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                predicted_energy: { type: 'string' },
                reason: { type: 'string' }
              }
            }
          },
          optimization_tips: {
            type: 'array',
            items: { type: 'string' }
          },
          warning_signs: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    // Create insight
    await base44.entities.HealthInsight.create({
      date: new Date().toISOString().split('T')[0],
      type: 'energy_pattern',
      title: 'Energy Pattern Prediction',
      description: aiPrediction.energy_pattern,
      recommendations: aiPrediction.optimization_tips,
      data_points: {
        predictions: aiPrediction.predictions,
        sleep_correlation: aiPrediction.sleep_correlation,
        period_impact: aiPrediction.period_impact,
        cycle_phase: cyclePhase
      },
      priority: aiPrediction.warning_signs.length > 0 ? 'high' : 'medium'
    });

    return Response.json({
      success: true,
      prediction: aiPrediction,
      current_state: {
        avg_energy: (energyLogs.reduce((s, e) => s + e.energy_level, 0) / energyLogs.length).toFixed(1),
        cycle_phase: cyclePhase,
        cycle_day: cycleDay
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});