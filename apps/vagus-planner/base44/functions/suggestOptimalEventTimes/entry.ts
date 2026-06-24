import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { startOfDay, endOfDay, addDays, format, parse, isWithinInterval, addMinutes } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_duration = 60, event_category = 'personal', days_ahead = 7, preferences = {} } = await req.json();

    // Fetch user's events and settings
    const [events, settings] = await Promise.all([
      base44.entities.Event.list(),
      base44.entities.UserSettings.list()
    ]);

    const userSettings = settings[0] || {};
    
    // Define working hours based on user work style
    const workingHours = {
      'early-bird': { start: 7, end: 15 },
      'night-owl': { start: 11, end: 19 },
      'flexible': { start: 9, end: 17 }
    };
    
    const hours = workingHours[userSettings.work_style || 'flexible'];

    // Analyze existing schedule patterns
    const analyzeSchedulePatterns = () => {
      const patterns = {
        busyDays: {},
        preferredTimes: {},
        meetingDays: [],
        focusBlocks: []
      };

      events.forEach(event => {
        const date = new Date(event.start_date);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();

        // Track busy days
        patterns.busyDays[dayOfWeek] = (patterns.busyDays[dayOfWeek] || 0) + 1;

        // Track preferred times by category
        if (!patterns.preferredTimes[event.category]) {
          patterns.preferredTimes[event.category] = [];
        }
        patterns.preferredTimes[event.category].push(hour);

        // Track meeting patterns
        if (event.category === 'work' && event.title.toLowerCase().includes('meeting')) {
          patterns.meetingDays.push(dayOfWeek);
        }
      });

      return patterns;
    };

    const patterns = analyzeSchedulePatterns();

    // Generate time slots for next N days
    const generateTimeSlots = () => {
      const slots = [];
      const now = new Date();

      for (let i = 0; i < days_ahead; i++) {
        const day = addDays(startOfDay(now), i);
        const dayOfWeek = day.getDay();

        // Skip if it's a traditionally busy day for this user
        const busyScore = patterns.busyDays[dayOfWeek] || 0;
        
        for (let hour = hours.start; hour < hours.end; hour++) {
          const slotStart = new Date(day);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = addMinutes(slotStart, event_duration);

          // Check if slot conflicts with existing events
          const hasConflict = events.some(event => {
            const eventStart = new Date(event.start_date);
            const eventEnd = new Date(event.end_date);
            return (
              isWithinInterval(slotStart, { start: eventStart, end: eventEnd }) ||
              isWithinInterval(slotEnd, { start: eventStart, end: eventEnd }) ||
              isWithinInterval(eventStart, { start: slotStart, end: slotEnd })
            );
          });

          if (!hasConflict) {
            // Calculate score based on various factors
            let score = 100;

            // Penalize busy days
            score -= busyScore * 5;

            // Prefer times that match category patterns
            const categoryPreferredHours = patterns.preferredTimes[event_category] || [];
            const avgPreferredHour = categoryPreferredHours.length > 0
              ? categoryPreferredHours.reduce((a, b) => a + b, 0) / categoryPreferredHours.length
              : hour;
            const timeDiff = Math.abs(hour - avgPreferredHour);
            score -= timeDiff * 3;

            // Prefer morning for work, afternoon for personal
            if (event_category === 'work' && hour >= 9 && hour <= 12) score += 20;
            if (event_category === 'personal' && hour >= 14 && hour <= 17) score += 15;

            // Prefer Monday-Thursday for meetings
            if (event_category === 'work' && dayOfWeek >= 1 && dayOfWeek <= 4) score += 10;

            // Avoid Friday afternoons
            if (dayOfWeek === 5 && hour >= 15) score -= 20;

            // Prefer slots with buffer time before/after
            const hasBufferBefore = !events.some(e => {
              const end = new Date(e.end_date);
              return Math.abs(end.getTime() - slotStart.getTime()) < 15 * 60 * 1000;
            });
            const hasBufferAfter = !events.some(e => {
              const start = new Date(e.start_date);
              return Math.abs(start.getTime() - slotEnd.getTime()) < 15 * 60 * 1000;
            });
            if (hasBufferBefore && hasBufferAfter) score += 15;

            // Apply user preferences
            if (preferences.prefer_mornings && hour < 12) score += 10;
            if (preferences.prefer_afternoons && hour >= 12) score += 10;
            if (preferences.avoid_mondays && dayOfWeek === 1) score -= 30;
            if (preferences.avoid_fridays && dayOfWeek === 5) score -= 30;

            slots.push({
              start: format(slotStart, 'yyyy-MM-dd HH:mm'),
              end: format(slotEnd, 'yyyy-MM-dd HH:mm'),
              date: format(day, 'yyyy-MM-dd'),
              time: format(slotStart, 'HH:mm'),
              dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
              score: Math.max(0, Math.round(score)),
              reason: generateReason(score, hour, dayOfWeek, hasBufferBefore && hasBufferAfter)
            });
          }
        }
      }

      return slots.sort((a, b) => b.score - a.score).slice(0, 10);
    };

    const generateReason = (score, hour, dayOfWeek, hasBuffer) => {
      const reasons = [];
      if (score >= 100) reasons.push('Optimal time based on your schedule');
      if (hour >= 9 && hour <= 11) reasons.push('Peak productivity hours');
      if (hasBuffer) reasons.push('Good buffer time around this slot');
      if (dayOfWeek >= 1 && dayOfWeek <= 4) reasons.push('Mid-week availability');
      if (score < 70) reasons.push('Consider alternative if possible');
      return reasons.join(' • ');
    };

    const suggestions = generateTimeSlots();

    return Response.json({
      suggestions,
      analysis: {
        total_events: events.length,
        busiest_day: Object.entries(patterns.busyDays).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
        working_hours: hours,
        patterns_detected: {
          has_meeting_pattern: patterns.meetingDays.length > 3,
          preferred_categories: Object.keys(patterns.preferredTimes)
        }
      }
    });

  } catch (error) {
    console.error('Error suggesting optimal times:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});