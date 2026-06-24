import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get last 30 days of sleep data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [sleepData, energyLogs] = await Promise.all([
      base44.entities.Sleep.filter({ 
        date: { $gte: dateStr },
        created_by: user.email 
      }, '-date'),
      base44.entities.EnergyLog.filter({ 
        date: { $gte: dateStr },
        created_by: user.email 
      }, '-date')
    ]);

    if (sleepData.length < 3) {
      return Response.json({
        success: false,
        message: 'Need at least 3 days of sleep data for analysis'
      });
    }

    // Calculate averages
    const avgDuration = sleepData.reduce((sum, s) => sum + s.duration_hours, 0) / sleepData.length;
    const avgScore = sleepData.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / sleepData.length;
    const avgDeepSleep = sleepData.reduce((sum, s) => sum + (s.deep_sleep_minutes || 0), 0) / sleepData.length;

    // Use AI to analyze patterns
    const context = `
Analyze sleep patterns for health optimization:

Sleep Data (last ${sleepData.length} days):
- Average duration: ${avgDuration.toFixed(1)} hours
- Average sleep score: ${avgScore.toFixed(0)}
- Average deep sleep: ${avgDeepSleep.toFixed(0)} minutes
- Best sleep: ${Math.max(...sleepData.map(s => s.sleep_score || 0))}
- Worst sleep: ${Math.min(...sleepData.map(s => s.sleep_score || 0))}

Recent sleep quality trend: ${sleepData.slice(-7).map(s => s.quality).join(', ')}

Energy logs available: ${energyLogs.length} entries
Average energy level: ${energyLogs.length > 0 ? (energyLogs.reduce((s, e) => s + e.energy_level, 0) / energyLogs.length).toFixed(1) : 'N/A'}

Provide:
1. Overall sleep health assessment (1-5 scale)
2. Key patterns identified (e.g., consistency, quality trends)
3. Specific recommendations to improve sleep
4. Correlation between sleep and energy levels (if data available)
5. Optimal sleep window based on patterns
    `;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: context,
      response_json_schema: {
        type: 'object',
        properties: {
          sleep_health_score: { type: 'number' },
          assessment: { type: 'string' },
          patterns: {
            type: 'array',
            items: { type: 'string' }
          },
          recommendations: {
            type: 'array',
            items: { type: 'string' }
          },
          sleep_energy_correlation: { type: 'string' },
          optimal_sleep_window: { type: 'string' }
        }
      }
    });

    // Create insight
    await base44.entities.HealthInsight.create({
      date: new Date().toISOString().split('T')[0],
      type: 'sleep_analysis',
      title: 'Sleep Pattern Analysis',
      description: aiAnalysis.assessment,
      recommendations: aiAnalysis.recommendations,
      data_points: {
        sleep_health_score: aiAnalysis.sleep_health_score,
        avg_duration: avgDuration,
        avg_score: avgScore,
        patterns: aiAnalysis.patterns,
        optimal_window: aiAnalysis.optimal_sleep_window
      },
      priority: aiAnalysis.sleep_health_score < 3 ? 'high' : 'medium'
    });

    return Response.json({
      success: true,
      analysis: aiAnalysis,
      stats: {
        days_tracked: sleepData.length,
        avg_duration: avgDuration,
        avg_score: avgScore
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});