import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { period = 'weekly' } = await req.json();
    
    const daysBack = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 7;

    // Fetch all health data
    const [sleepData, nutritionData, exerciseData, moodData, periodData] = await Promise.all([
      base44.entities.Sleep.list('-date', daysBack * 2),
      base44.entities.Nutrition.list('-date', daysBack * 2),
      base44.entities.Exercise.list('-date', daysBack * 2),
      base44.entities.Mood.list('-date', daysBack * 2),
      base44.entities.Period.list('-date', daysBack * 2).catch(() => [])
    ]);

    // Calculate statistics
    const calculateStats = (arr, field) => {
      if (!arr.length) return { avg: 0, min: 0, max: 0 };
      const values = arr.map(item => item[field]).filter(v => v != null);
      return {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    };

    const stats = {
      sleep: {
        hours: calculateStats(sleepData, 'sleep_hours'),
        quality: calculateStats(sleepData, 'sleep_quality'),
        count: sleepData.length
      },
      nutrition: {
        calories: calculateStats(nutritionData, 'calories'),
        protein: calculateStats(nutritionData, 'protein'),
        water: calculateStats(nutritionData, 'water_ml'),
        count: nutritionData.length
      },
      exercise: {
        duration: calculateStats(exerciseData, 'duration_minutes'),
        sessions: exerciseData.length,
        totalMinutes: exerciseData.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
      },
      mood: {
        rating: calculateStats(moodData, 'mood_rating'),
        stress: calculateStats(moodData, 'stress_level'),
        energy: calculateStats(moodData, 'energy_level'),
        entries: moodData.length
      }
    };

    return Response.json({
      success: true,
      period,
      stats,
      dataPoints: {
        sleep: sleepData.length,
        nutrition: nutritionData.length,
        exercise: exerciseData.length,
        mood: moodData.length,
        period: periodData.length
      }
    });
  } catch (error) {
    console.error('Trend analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});