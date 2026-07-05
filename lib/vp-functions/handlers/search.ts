import type { VpFunctionHandler } from '../types';
import { createClient } from '@/lib/supabase/server';

function escapeIlike(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&');
}

async function searchTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  userId: string,
  columns: string[],
  query: string,
  limit = 8
) {
  const pattern = `%${escapeIlike(query)}%`;
  let builder = supabase.schema('firstparty').from(table).select('*').eq('user_id', userId).limit(limit);

  if (columns.length === 1) {
    builder = builder.ilike(columns[0], pattern);
  } else {
    const orClause = columns.map((c) => `${c}.ilike.${pattern}`).join(',');
    builder = builder.or(orClause);
  }

  const { data, error } = await builder;
  if (error) {
    console.warn(`[globalSearch] ${table}:`, error.message);
    return [];
  }
  return data ?? [];
}

export const globalSearch: VpFunctionHandler = async ({ user, payload }) => {
  const query = typeof payload.query === 'string' ? payload.query.trim() : '';
  if (query.length < 2) {
    return { ok: false, error: 'query must be at least 2 characters', status: 400 };
  }

  const filters =
    payload.filters && typeof payload.filters === 'object' && !Array.isArray(payload.filters)
      ? (payload.filters as Record<string, unknown>)
      : {};

  const typeFilter = typeof filters.type === 'string' ? filters.type : undefined;

  const supabase = await createClient();
  const userId = user.id;

  const [events, tasks, goals, holidays] = await Promise.all([
    typeFilter && typeFilter !== 'events'
      ? Promise.resolve([])
      : searchTable(supabase, 'vp_events', userId, ['title', 'description', 'location'], query),
    typeFilter && typeFilter !== 'tasks'
      ? Promise.resolve([])
      : searchTable(supabase, 'vp_tasks', userId, ['title', 'notes'], query),
    typeFilter && typeFilter !== 'goals'
      ? Promise.resolve([])
      : searchTable(supabase, 'vp_goals', userId, ['title', 'description'], query),
    typeFilter && typeFilter !== 'holidays'
      ? Promise.resolve([])
      : searchTable(supabase, 'vp_holidays', userId, ['name', 'notes'], query),
  ]);

  const results: Record<string, unknown[]> = {};

  if (events.length) {
    results.events = events.map((e) => ({
      id: e.id,
      type: 'event',
      title: e.title,
      description: e.description,
      location: e.location,
      start_date: e.event_date,
      category: 'other',
    }));
  }

  if (tasks.length) {
    results.tasks = tasks.map((t) => ({
      id: t.id,
      type: 'task',
      title: t.title,
      description: t.notes,
      status: t.status === 'pending' ? 'todo' : t.status,
      priority: t.priority >= 2 ? 'high' : t.priority === 1 ? 'medium' : 'low',
      due_date: t.due_date,
    }));
  }

  if (goals.length) {
    results.goals = goals.map((g) => ({
      id: g.id,
      type: 'goal',
      title: g.title,
      description: g.description,
      progress: g.progress ?? 0,
      category: 'personal',
      status: g.status,
    }));
  }

  if (holidays.length) {
    results.holidays = holidays.map((h) => ({
      id: h.id,
      type: 'holiday',
      title: h.name,
      destination: h.notes || '',
      date: h.holiday_date,
      status: 'planned',
    }));
  }

  return { ok: true, data: { results } };
};
