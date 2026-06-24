/**
 * suggestTaskTimeSlots
 * Given a task (title, duration, category, priority, due_date),
 * fetches today's prayer times and returns AI-ranked time slots
 * that fit between prayer windows and around peak productivity periods.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const METHOD_MAP = { MWL: 3, ISNA: 2, Egypt: 5, Makkah: 4, Karachi: 1, Tehran: 7, Jafari: 0 };

// Convert "HH:MM" → total minutes since midnight
function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Format minutes → "HH:MM"
function fromMin(min) {
  const h = Math.floor(((min % 1440) + 1440) % 1440 / 60);
  const m = ((min % 1440) + 1440) % 1440 % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      title,
      description = '',
      category = 'personal',
      priority = 'medium',
      estimated_minutes = 60,
      due_date,
      target_date, // YYYY-MM-DD, defaults to today
    } = await req.json();

    const date = target_date || new Date().toISOString().split('T')[0];

    // ── 1. Fetch user settings ───────────────────────────────────────────────
    const settingsList = await base44.entities.UserSettings.filter({ created_by: user.email });
    const settings = settingsList[0] || {};

    const lat = settings.latitude;
    const lng = settings.longitude;
    const islamicMode = settings.islamic_mode ?? false;
    const workStart = toMin(settings.working_hours_start || '09:00');
    const workEnd   = toMin(settings.working_hours_end   || '18:00');
    const offsets   = settings.prayer_time_offsets || {};
    const method    = METHOD_MAP[settings.prayer_method] ?? 3;

    // ── 2. Fetch prayer times (only if location set + islamic mode or user has location) ──
    let prayers = {};
    let prayerAvailable = false;

    if (lat && lng) {
      try {
        const [d, mo, y] = [new Date(date).getDate(), new Date(date).getMonth()+1, new Date(date).getFullYear()];
        const dateStr = `${String(d).padStart(2,'0')}-${String(mo).padStart(2,'0')}-${y}`;
        const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.code === 200) {
            const t = data.data.timings;
            for (const [name, rawTime] of Object.entries({ Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha })) {
              if (!rawTime) continue;
              const [h, m] = rawTime.split(':').map(Number);
              const off = offsets[name.toLowerCase()] || 0;
              const total = h * 60 + m + off;
              prayers[name] = fromMin(total);
            }
            prayerAvailable = true;
          }
        }
      } catch (e) {
        console.warn('[suggestTaskTimeSlots] Prayer fetch failed:', e.message);
      }
    }

    // ── 3. Fetch today's existing events to find busy slots ─────────────────
    let busySlots = [];
    try {
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const events = await base44.entities.Event.filter({ created_by: user.email });
      busySlots = events
        .filter(e => e.start_date && e.start_date.startsWith(date))
        .map(e => ({
          title: e.title,
          start: toMin(e.start_date.split('T')[1]?.slice(0,5) || '09:00'),
          end:   toMin(e.end_date?.split('T')[1]?.slice(0,5) || '10:00'),
        }));
    } catch {}

    // ── 4. Build prayer blocks (15-min buffer each side) ────────────────────
    const prayerBlocks = [];
    for (const [name, time] of Object.entries(prayers)) {
      const start = toMin(time) - 15;
      const end   = toMin(time) + 20; // avg prayer duration ~5-10min + buffer
      prayerBlocks.push({ name, start, end, time });
    }

    // ── 5. AI prompt for intelligent slot suggestion ─────────────────────────
    const prayerContext = prayerAvailable
      ? `Prayer times for ${date}:\n${Object.entries(prayers).map(([n,t]) => `  ${n}: ${t}`).join('\n')}\n\nTreat each prayer + 15 min before + 15 min after as a blocked window (do not schedule tasks here).`
      : 'No prayer times available (user has not set location).';

    const busyContext = busySlots.length
      ? `Existing events already blocking time:\n${busySlots.map(b => `  ${b.title}: ${fromMin(b.start)}–${fromMin(b.end)}`).join('\n')}`
      : 'No existing events today.';

    const prompt = `You are an expert productivity and Islamic life balance coach. Suggest the 3 best time slots to schedule this task on ${date}.

TASK:
- Title: "${title}"
- Description: "${description}"
- Category: ${category}
- Priority: ${priority}
- Duration needed: ${estimated_minutes} minutes
${due_date ? `- Due date: ${due_date}` : ''}

USER'S DAY:
- Working hours: ${fromMin(workStart)} – ${fromMin(workEnd)}
- Islamic mode: ${islamicMode}
${prayerContext}

${busyContext}

PEAK PRODUCTIVITY SCIENCE:
- Cognitive peak 1: ~09:00–11:30 (deep work, creative thinking, complex tasks)
- Post-lunch dip: ~13:00–14:30 (avoid high-focus tasks)
- Afternoon recovery: ~15:00–17:00 (good for meetings, admin, lighter tasks)
- Evening wind-down: ~19:00–21:00 (learning, reflection, personal tasks)

RULES:
1. Never overlap with prayer windows (±15 min of prayer times)
2. Never overlap with existing events
3. Match task category to productivity period (work tasks → morning peak; personal/learning → afternoon/evening)
4. For urgent/high priority: prefer morning peak
5. Leave at least 10 min gap between task and prayer times as transition
6. Ensure task fits within working hours (unless personal/evening category)
7. Suggest slots starting from now if scheduling for today

Return exactly 3 slot suggestions ordered from best to least ideal.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          slots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rank: { type: 'number', description: '1=best, 3=least ideal' },
                start_time: { type: 'string', description: 'HH:MM' },
                end_time: { type: 'string', description: 'HH:MM' },
                label: { type: 'string', description: 'Short label e.g. "Morning Peak", "After Asr"' },
                reason: { type: 'string', description: 'Why this slot is good for this task' },
                productivity_period: { type: 'string', enum: ['morning_peak', 'mid_morning', 'post_lunch', 'afternoon', 'evening', 'night'] },
                prayer_gap: { type: 'string', description: 'Which prayer this slot follows or precedes, e.g. "After Dhuhr"' },
                score: { type: 'number', description: 'Fit score 0-100' }
              }
            }
          },
          balance_tip: { type: 'string', description: 'One sentence tip about scheduling this task type in a balanced Islamic day' },
          best_day_summary: { type: 'string', description: 'Brief summary of how the suggested scheduling fits into a balanced day' }
        }
      }
    });

    console.log(`[suggestTaskTimeSlots] Generated ${result.slots?.length || 0} slots for "${title}" on ${date}, prayer-aware: ${prayerAvailable}`);

    return Response.json({
      slots: result.slots || [],
      balance_tip: result.balance_tip || '',
      best_day_summary: result.best_day_summary || '',
      prayer_times: prayers,
      prayer_available: prayerAvailable,
      date,
    });

  } catch (error) {
    console.error('[suggestTaskTimeSlots] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});