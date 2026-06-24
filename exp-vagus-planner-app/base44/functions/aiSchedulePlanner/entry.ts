import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      period = 'week',
      style = 'balanced',
      past_events = [],
      upcoming_events = [],
      pending_tasks = [],
      islamic_mode = false,
      prayer_method = 'MWL',
      working_hours_start = '09:00',
      working_hours_end = '17:00',
      working_days = [1, 2, 3, 4, 5],
      today,
    } = await req.json();

    const todayDate = today || new Date().toISOString().split('T')[0];

    // Analyse past event patterns
    const categoryFrequency = {};
    const categoryAvgDuration = {};
    for (const ev of past_events) {
      const cat = ev.category || 'other';
      categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
      if (ev.duration_minutes) {
        categoryAvgDuration[cat] = categoryAvgDuration[cat]
          ? Math.round((categoryAvgDuration[cat] + ev.duration_minutes) / 2)
          : ev.duration_minutes;
      }
    }

    const workingDayNames = working_days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ');

    const prayerNote = islamic_mode
      ? `The user is in Islamic mode (prayer method: ${prayer_method}). Include 5 daily prayer breaks (Fajr, Dhuhr, Asr, Maghrib, Isha) at appropriate times, and ensure no work/social events clash with prayer windows.`
      : '';

    const prompt = `You are an expert AI life scheduler. Analyse this user's history and create a smart ${period} schedule.

USER CONTEXT:
- Today: ${todayDate}
- Planning period: ${period} (${period === 'day' ? 'just today' : period === 'week' ? 'Mon-Sun this week' : 'full calendar month'})
- Scheduling style requested: ${style}
- Working hours: ${working_hours_start} – ${working_hours_end}
- Working days: ${workingDayNames}
${prayerNote}

HISTORY ANALYSIS (past ${past_events.length} events):
Category frequency: ${JSON.stringify(categoryFrequency)}
Average durations: ${JSON.stringify(categoryAvgDuration)}

UPCOMING EVENTS ALREADY BOOKED:
${upcoming_events.slice(0, 15).map(e => `- ${e.title} (${e.category}) on ${e.start_date}`).join('\n') || 'None'}

PENDING TASKS TO SCHEDULE:
${pending_tasks.slice(0, 10).map(t => `- ${t.title} [${t.priority || 'medium'} priority]${t.due_date ? ` due ${t.due_date}` : ''}`).join('\n') || 'None'}

SCHEDULING STYLES:
- balanced: Mix of work, health, personal, rest
- relaxed: Fewer events, more buffer time
- packed: Maximise productivity, dense scheduling
- spiritual: Prioritise prayer, reflection, Quran if islamic mode
- family: Prioritise family time and shared activities

CURRENT STYLE: ${style}

Generate a realistic, achievable schedule. For each event:
- Use specific dates (YYYY-MM-DDTHH:MM:00) from ${todayDate}
- Respect working hours and days
- Include a healthy mix based on the user's historical patterns
- Include task-derived focus blocks where relevant
- Add realistic buffer time between events
- For weekly plans: spread events across Mon-Sun
- For monthly plans: generate key anchor events (weekly reviews, health blocks, social time)

Also provide 3 distinct alternative schedule options with different styles/focuses.

Return a complete schedule plan.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string', description: 'Brief 1-2 sentence summary of the plan' },
          insights: {
            type: 'array',
            items: { type: 'string' },
            description: '3-4 key observations from the user\'s history'
          },
          suggested_events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                start_date: { type: 'string', description: 'ISO datetime YYYY-MM-DDTHH:MM:00' },
                end_date: { type: 'string', description: 'ISO datetime YYYY-MM-DDTHH:MM:00' },
                category: { type: 'string', enum: ['work', 'personal', 'health', 'prayer', 'family', 'social', 'holiday', 'other'] },
                is_all_day: { type: 'boolean' },
                notes: { type: 'string' },
              }
            }
          },
          alternatives: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                description: { type: 'string' },
                style_key: { type: 'string', enum: ['balanced', 'relaxed', 'packed', 'spiritual', 'family'] },
                focus_areas: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    });

    console.log(`[aiSchedulePlanner] Generated ${result.suggested_events?.length || 0} events for user ${user.email}, period: ${period}, style: ${style}`);

    return Response.json(result);
  } catch (error) {
    console.error('[aiSchedulePlanner] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});