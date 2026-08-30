import type { VpFunctionHandler } from '../types';
import { createClient } from '@/lib/supabase/server';

function escapeIlike(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&');
}

function tokenizeQuery(query: string): string[] {
  const tokens = query
    .split(/[/,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  const unique = [...new Set(tokens)];
  if (unique.length === 0 && query.length >= 2) return [query];
  return unique;
}

async function searchTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  userId: string,
  columns: string[],
  query: string,
  limit = 8
) {
  const tokens = tokenizeQuery(query);
  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];

  for (const token of tokens) {
    const pattern = `%${escapeIlike(token)}%`;
    let builder = supabase.schema('firstparty').from(table).select('*').eq('user_id', userId).limit(limit);

    if (columns.length === 1) {
      builder = builder.ilike(columns[0], pattern);
    } else {
      const orClause = columns.map((c) => `${c}.ilike.${pattern}`).join(',');
      builder = builder.or(orClause);
    }

    const { data, error } = await builder;
    if (error) {
      console.warn(`[globalSearch] ${table} (${token}):`, error.message);
      continue;
    }

    for (const row of data ?? []) {
      const id = String((row as { id?: string }).id ?? '');
      if (id && !seen.has(id)) {
        seen.add(id);
        merged.push(row);
      }
    }
  }

  return merged.slice(0, limit);
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
    results.events = events.map((row) => {
      const e = row as Record<string, unknown>;
      return {
        id: e.id,
        type: 'event',
        title: e.title,
        description: e.description,
        location: e.location,
        start_date: e.event_date,
        category: 'other',
      };
    });
  }

  if (tasks.length) {
    results.tasks = tasks.map((row) => {
      const t = row as Record<string, unknown>;
      const priorityNum = typeof t.priority === 'number' ? t.priority : Number(t.priority) || 0;
      return {
        id: t.id,
        type: 'task',
        title: t.title,
        description: t.notes ?? t.description,
        status: t.status === 'pending' ? 'todo' : t.status,
        priority: priorityNum >= 2 ? 'high' : priorityNum === 1 ? 'medium' : 'low',
        due_date: t.due_date,
      };
    });
  }

  if (goals.length) {
    results.goals = goals.map((row) => {
      const g = row as Record<string, unknown>;
      return {
        id: g.id,
        type: 'goal',
        title: g.title,
        description: g.description,
        progress: g.progress ?? 0,
        category: 'personal',
        status: g.status,
      };
    });
  }

  if (holidays.length) {
    results.holidays = holidays.map((row) => {
      const h = row as Record<string, unknown>;
      return {
        id: h.id,
        type: 'holiday',
        title: h.name,
        destination: h.notes || '',
        date: h.holiday_date,
        status: 'planned',
      };
    });
  }

  return { ok: true, data: { results } };
};
