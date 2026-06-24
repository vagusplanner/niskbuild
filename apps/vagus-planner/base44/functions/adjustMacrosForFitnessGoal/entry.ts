/**
 * adjustMacrosForFitnessGoal
 * Reads user's fitness goal + last 7 days of Exercise records + calendar workout events,
 * then uses AI to compute adjusted calorie & macro targets for the coming week's meal plan.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fitness_goal_id } = await req.json();

    // ── 1. Load fitness goal ─────────────────────────────────────────────────
    const goals = fitness_goal_id
      ? await base44.entities.FitnessGoal.filter({ id: fitness_goal_id })
      : await base44.entities.FitnessGoal.filter({ status: 'active' });

    const goal = goals[0];
    if (!goal) return Response.json({ error: 'No active fitness goal found' }, { status: 404 });

    // ── 2. Load last 14 days of exercise logs ───────────────────────────────
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const cutoff = twoWeeksAgo.toISOString().split('T')[0];

    let exercises = [];
    try {
      const allExercises = await base44.entities.Exercise.list('-date', 30);
      exercises = allExercises.filter(e => e.date >= cutoff);
    } catch {}

    // ── 3. Load recent calendar events tagged as workout/exercise ───────────
    let calendarWorkouts = [];
    try {
      const events = await base44.entities.Event.list('-start_date', 50);
      const workoutKeywords = ['gym', 'workout', 'run', 'cycle', 'swim', 'yoga', 'training', 'exercise', 'sport', 'football', 'tennis', 'boxing'];
      calendarWorkouts = events.filter(e =>
        e.start_date >= `${cutoff}T00:00:00` &&
        workoutKeywords.some(kw => (e.title || '').toLowerCase().includes(kw) || (e.category || '') === 'health')
      ).map(e => ({
        title: e.title,
        date: e.start_date?.split('T')[0],
        duration_minutes: e.start_date && e.end_date
          ? Math.round((new Date(e.end_date) - new Date(e.start_date)) / 60000)
          : 60,
      }));
    } catch {}

    // ── 4. Compute totals for AI context ────────────────────────────────────
    const totalCalsBurned = exercises.reduce((s, e) => s + (e.calories_burned || 0), 0);
    const totalMinutes    = exercises.reduce((s, e) => s + (e.duration_minutes || 0), 0);
    const workoutDays     = new Set(exercises.map(e => e.date)).size + calendarWorkouts.length;

    // BMR estimate (Mifflin-St Jeor)
    const w = goal.current_weight_kg || 70;
    const h = goal.height_cm || 170;
    const a = goal.age || 30;
    const isMale = goal.sex !== 'female';
    const bmr = isMale ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    const tdeeMultipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extremely_active: 1.9 };
    const tdee = Math.round(bmr * (tdeeMultipliers[goal.activity_level] || 1.55));

    // ── 5. AI macro adjustment ──────────────────────────────────────────────
    const exerciseSummary = exercises.length > 0
      ? exercises.slice(0, 10).map(e => `${e.date}: ${e.activity_name || e.activity_type} (${e.duration_minutes}min, ${e.intensity || 'moderate'}, ~${e.calories_burned || '?'} kcal burned)`).join('\n')
      : 'No logged exercises found.';

    const calendarSummary = calendarWorkouts.length > 0
      ? calendarWorkouts.map(e => `${e.date}: ${e.title} (~${e.duration_minutes}min)`).join('\n')
      : 'No workout events in calendar.';

    const prompt = `You are a certified sports nutritionist and dietitian. Analyse this user's fitness goal and recent activity, then provide precise daily calorie and macro targets for next week's meal plan.

FITNESS GOAL:
- Type: ${goal.goal_type}
- Current weight: ${goal.current_weight_kg || '?'} kg
- Target weight: ${goal.target_weight_kg || 'not set'} kg
- Height: ${goal.height_cm || '?'} cm
- Age: ${goal.age || '?'}, Sex: ${goal.sex || 'not specified'}
- Activity level (self-reported): ${goal.activity_level}
- Weekly workout target: ${goal.weekly_workout_target || 3} sessions
- Target date: ${goal.target_date || 'not set'}

BIOMETRICS:
- Estimated BMR: ${Math.round(bmr)} kcal/day
- Estimated TDEE: ${tdee} kcal/day

LAST 14 DAYS EXERCISE LOGS:
${exerciseSummary}

CALENDAR WORKOUT EVENTS:
${calendarSummary}

ACTUAL ACTIVITY SUMMARY (last 14 days):
- Total workout sessions: ${workoutDays}
- Total calories burned from exercise: ${totalCalsBurned}
- Total exercise minutes: ${totalMinutes}

Based on actual activity vs target, adjust macros for next week:
- For weight_loss: create a moderate deficit (300-500 kcal below TDEE). More activity = slightly higher calories allowed.
- For muscle_gain: create a moderate surplus (200-350 kcal above TDEE). Higher protein (1.8-2.2g/kg body weight).
- For maintenance: match TDEE exactly, adjust for actual activity.
- For endurance: higher carbs (50-60%), moderate protein.
- For general_health: balanced macros, no extreme deficits.

Factor in actual vs intended activity: if they exercised more than planned, allow slightly more calories. If less, be more conservative.

Return specific targets for next week only.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          daily_calories: { type: 'number', description: 'Recommended daily calories' },
          daily_protein_g: { type: 'number', description: 'Daily protein in grams' },
          daily_carbs_g: { type: 'number', description: 'Daily carbohydrates in grams' },
          daily_fats_g: { type: 'number', description: 'Daily fats in grams' },
          calorie_adjustment_reason: { type: 'string', description: 'Why this calorie target was set' },
          weekly_deficit_surplus: { type: 'number', description: 'Net weekly calorie deficit (negative) or surplus (positive)' },
          activity_assessment: { type: 'string', description: '1-2 sentences assessing last week\'s activity vs goal' },
          next_week_recommendations: {
            type: 'array',
            items: { type: 'string' },
            description: '3-4 specific actionable recommendations for next week'
          },
          meal_timing_tips: {
            type: 'array',
            items: { type: 'string' },
            description: '2-3 meal timing tips specific to this goal type'
          },
          protein_focus_foods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Top 5 recommended protein sources for this goal'
          },
          estimated_progress: { type: 'string', description: 'Expected progress this week if targets are followed' }
        }
      }
    });

    // ── 6. Persist updated macros back to goal ──────────────────────────────
    await base44.entities.FitnessGoal.update(goal.id, {
      recommended_calories: result.daily_calories,
      recommended_protein_g: result.daily_protein_g,
      recommended_carbs_g: result.daily_carbs_g,
      recommended_fats_g: result.daily_fats_g,
    });

    console.log(`[adjustMacrosForFitnessGoal] Updated macros for goal ${goal.id}: ${result.daily_calories} kcal, P:${result.daily_protein_g}g C:${result.daily_carbs_g}g F:${result.daily_fats_g}g`);

    return Response.json({
      goal_id: goal.id,
      goal_type: goal.goal_type,
      macros: result,
      activity_summary: {
        workout_sessions: workoutDays,
        total_calories_burned: totalCalsBurned,
        total_minutes: totalMinutes,
        calendar_workouts: calendarWorkouts.length,
      },
      bmr: Math.round(bmr),
      tdee,
    });

  } catch (error) {
    console.error('[adjustMacrosForFitnessGoal] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});