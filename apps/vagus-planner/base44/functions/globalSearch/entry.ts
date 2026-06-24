import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { query, filters = {} } = body;

    if (!query || query.trim().length < 2) {
      return Response.json({ error: 'Query too short' }, { status: 400 });
    }

    const searchTerm = query.trim().toLowerCase();
    const { type, dateFrom, dateTo, status, category, participant } = filters;

    // Helper: text match
    const matches = (...fields) => fields.some(f => f?.toLowerCase().includes(searchTerm));

    // Helper: date range filter
    const inDateRange = (dateStr) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo   && d > new Date(dateTo))   return false;
      return true;
    };

    // Helper: participant filter
    const hasParticipant = (attendees) => {
      if (!participant) return true;
      const pf = participant.toLowerCase();
      return Array.isArray(attendees) && attendees.some(a => a.toLowerCase().includes(pf));
    };

    const shouldFetch = (entityType) => !type || type === 'all' || type === entityType;

    // Run all searches in parallel (skip entity types excluded by filter)
    const [events, tasks, goals, holidays, meetings, habits, quranVerses, hadiths, prayerLogs] =
      await Promise.all([
        // Events
        shouldFetch('events')
          ? base44.entities.Event.list().then(items =>
              items.filter(i =>
                matches(i.title, i.description, i.location) &&
                inDateRange(i.start_date) &&
                (!category || i.category === category) &&
                (!status || i.status === status)
              ).slice(0, 12)
            )
          : [],

        // Tasks
        shouldFetch('tasks')
          ? base44.entities.Task.list().then(items =>
              items.filter(i =>
                matches(i.title, i.description, i.notes) &&
                inDateRange(i.due_date) &&
                (!category || i.category === category) &&
                (!status || i.status === status) &&
                (!participant || i.assigned_to?.toLowerCase().includes(participant.toLowerCase()))
              ).slice(0, 12)
            )
          : [],

        // Goals
        shouldFetch('goals')
          ? base44.entities.Goal.list().then(items =>
              items.filter(i =>
                matches(i.title, i.description, i.notes) &&
                inDateRange(i.target_date) &&
                (!category || i.category === category) &&
                (!status || i.status === status)
              ).slice(0, 12)
            )
          : [],

        // Holidays
        shouldFetch('holidays')
          ? base44.entities.Holiday.list().then(items =>
              items.filter(i =>
                matches(i.title, i.destination, i.notes, i.accommodation) &&
                inDateRange(i.start_date) &&
                (!status || i.status === status)
              ).slice(0, 8)
            )
          : [],

        // Meetings
        shouldFetch('meetings')
          ? base44.entities.Meeting.list().then(items =>
              items.filter(i =>
                matches(i.title, i.description) &&
                inDateRange(i.confirmed_date) &&
                (!status || i.status === status) &&
                (!participant || hasParticipant(i.attendees) || i.organizer_email?.toLowerCase().includes(participant.toLowerCase()))
              ).slice(0, 8)
            )
          : [],

        // Habits
        shouldFetch('habits')
          ? base44.entities.Habit.list().then(items =>
              items.filter(i =>
                matches(i.name, i.description, i.category)
              ).slice(0, 8)
            ).catch(() => [])
          : [],

        // Quran Verses
        shouldFetch('prayers')
          ? base44.entities.QuranVerse.list().then(items =>
              items.filter(i =>
                matches(i.surah_name, i.translation) || i.arabic_text?.includes(searchTerm)
              ).slice(0, 6)
            ).catch(() => [])
          : [],

        // Hadiths
        shouldFetch('prayers')
          ? base44.entities.Hadith.list().then(items =>
              items.filter(i =>
                matches(i.hadith_text, i.translation, i.narrator, i.book)
              ).slice(0, 6)
            ).catch(() => [])
          : [],

        // Prayer Logs
        shouldFetch('prayers')
          ? base44.entities.PrayerLog.list().then(items =>
              items.filter(i =>
                matches(i.prayer_name, i.notes) &&
                inDateRange(i.date)
              ).slice(0, 8)
            ).catch(() => [])
          : [],
      ]);

    const results = {
      events:       events.map(e => ({ ...e, type: 'event' })),
      tasks:        tasks.map(t => ({ ...t, type: 'task' })),
      goals:        goals.map(g => ({ ...g, type: 'goal' })),
      holidays:     holidays.map(h => ({ ...h, type: 'holiday' })),
      meetings:     meetings.map(m => ({ ...m, type: 'meeting' })),
      habits:       habits.map(h => ({ ...h, type: 'habit', title: h.name })),
      quran_verses: quranVerses.map(v => ({ ...v, type: 'quran_verse' })),
      hadiths:      hadiths.map(h => ({ ...h, type: 'hadith' })),
      prayers:      prayerLogs.map(p => ({ ...p, type: 'prayer', title: p.prayer_name })),
    };

    const totalResults = Object.values(results).reduce((s, a) => s + a.length, 0);

    return Response.json({ success: true, results, query, totalResults });

  } catch (error) {
    console.error('Global search error:', error.message);
    return Response.json({ error: 'Search failed', details: error.message }, { status: 500 });
  }
});