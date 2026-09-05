import { createAdminClient } from '@/lib/supabase/admin';
import {
  detectArt9CategoriesFromText,
  mergeArt9Categories,
} from '@/lib/vp-gdpr/art9-ai-gate';
import type { VpArt9Category } from '@/lib/vp-gdpr/tables';
import type { VpFunctionHandler } from '../types';
import {
  aiUnavailableMessage,
  gateFeatureWithArt9,
  groqJson,
} from './calendar-ai';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
type Priority = (typeof PRIORITIES)[number];

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function scanArt9(...parts: unknown[]): VpArt9Category[] {
  return mergeArt9Categories(
    ...parts.map((part) => detectArt9CategoriesFromText(asString(part)))
  );
}

function normalizePriority(value: unknown): Priority {
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if ((PRIORITIES as readonly string[]).includes(lower)) return lower as Priority;
  }
  return 'medium';
}

function normalizeCategory(value: unknown): string {
  const raw = asString(value).toLowerCase();
  const allowed = [
    'work',
    'personal',
    'health',
    'shopping',
    'learning',
    'home',
    'spiritual',
    'other',
  ];
  return allowed.includes(raw) ? raw : raw || 'personal';
}

function asMinutes(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.min(480, Math.round(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.min(480, Math.round(n));
  }
  return undefined;
}

/** AITaskGenerator / QuickAITaskButton — break a goal into actionable tasks. */
export const generateTasksFromGoal: VpFunctionHandler = async ({ user, payload }) => {
  const goal = asString(payload.goal);
  if (!goal || goal.length < 3) {
    return { ok: false, error: 'goal is required (min 3 characters)', status: 400 };
  }
  const context = asString(payload.context);

  const art9Categories = scanArt9(goal, context);
  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const result = await groqJson<{
    success?: boolean;
    tasks?: Array<{
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
      estimated_minutes?: number;
      subtasks?: Array<{ title?: string } | string>;
      notes?: string;
    }>;
    tips?: unknown[];
  }>(
    `You break goals into concrete, actionable tasks for Vagus Planner.
Return 3-8 tasks. Prefer clear titles, short descriptions, realistic minutes, and optional subtasks.
Priorities: low, medium, high, urgent. Categories: work, personal, health, shopping, learning, home, spiritual, other.
${gate.art9Categories.length ? 'Goal may involve health or religious content — be respectful and do not invent medical advice.' : ''}
Return JSON only.`,
    `Goal: ${goal}
${context ? `Context: ${context}\n` : ''}
Return:
{
  "success": true,
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "category": "personal",
      "priority": "medium",
      "estimated_minutes": 30,
      "subtasks": [{ "title": "string" }],
      "notes": "optional tip"
    }
  ],
  "tips": ["short tip"]
}`,
    'vp-generateTasksFromGoal',
    gate.plan,
    gate.art9Categories
  );

  if (!result) {
    return {
      ok: false,
      error: aiUnavailableMessage(gate.art9Categories),
      status: 503,
    };
  }

  const tasks = Array.isArray(result.tasks)
    ? result.tasks
        .map((t) => {
          const title = asString(t?.title);
          if (!title) return null;
          const subtasks = Array.isArray(t.subtasks)
            ? t.subtasks
                .map((s) => {
                  if (typeof s === 'string' && s.trim()) return { title: s.trim() };
                  if (s && typeof s === 'object') {
                    const st = asString((s as { title?: unknown }).title);
                    return st ? { title: st } : null;
                  }
                  return null;
                })
                .filter((s): s is { title: string } => !!s)
                .slice(0, 8)
            : [];
          const minutes = asMinutes(t.estimated_minutes);
          const notes = asString(t.notes);
          return {
            title,
            description: asString(t.description) || title,
            category: normalizeCategory(t.category),
            priority: normalizePriority(t.priority),
            ...(minutes != null ? { estimated_minutes: minutes } : {}),
            ...(subtasks.length ? { subtasks } : {}),
            ...(notes ? { notes } : {}),
          };
        })
        .filter((t): t is NonNullable<typeof t> => !!t)
        .slice(0, 12)
    : [];

  if (tasks.length === 0) {
    return {
      ok: false,
      error: aiUnavailableMessage(gate.art9Categories),
      status: 503,
    };
  }

  const tips = Array.isArray(result.tips)
    ? result.tips.map((tip) => String(tip)).filter(Boolean).slice(0, 8)
    : [];

  return {
    ok: true,
    data: {
      success: true,
      tasks,
      ...(tips.length ? { tips } : {}),
    },
  };
};

type SmartReminderOut = {
  title: string;
  description: string;
  type: string;
  time_before_minutes: number;
};

/** SmartReminderBuilder — prep/travel/check-in reminders for an event. */
export const generateSmartReminders: VpFunctionHandler = async ({ user, payload }) => {
  const eventRaw =
    payload.event && typeof payload.event === 'object'
      ? (payload.event as Record<string, unknown>)
      : {};
  const title = asString(eventRaw.title) || asString(payload.title) || 'Event';
  const location = asString(eventRaw.location) || asString(payload.location);
  const startDate = asString(eventRaw.start_date) || asString(payload.start_date);
  const endDate = asString(eventRaw.end_date) || asString(payload.end_date);
  const eventType = asString(payload.event_type) || asString(eventRaw.category) || 'event';

  const art9Categories = scanArt9(title, location, eventType);
  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const userLocation =
    payload.user_location && typeof payload.user_location === 'object'
      ? (payload.user_location as Record<string, unknown>)
      : {};
  const availability =
    payload.user_availability && typeof payload.user_availability === 'object'
      ? (payload.user_availability as Record<string, unknown>)
      : {};

  const result = await groqJson<{
    reminders?: Array<{
      title?: string;
      description?: string;
      type?: string;
      time_before_minutes?: number;
    }>;
    total_prep_time_hours?: number;
    notes?: string;
  }>(
    `You generate practical pre-event reminders for Vagus Planner.
Types: prep, travel, check-in, packing, confirmation, general.
time_before_minutes must be a positive integer (minutes before the event start).
Suggest 3-6 reminders. Be realistic about travel and prep.
${gate.art9Categories.length ? 'Event may involve health or religious content — keep reminders respectful.' : ''}
Return JSON only.`,
    `Event:
title: ${title}
start: ${startDate || '(unknown)'}
end: ${endDate || '(unknown)'}
location: ${location || '(none)'}
event_type: ${eventType}
user_city: ${asString(userLocation.city) || 'unknown'}
work_hours: ${asString(availability.work_start) || '09:00'}-${asString(availability.work_end) || '17:00'}

Return:
{
  "reminders": [
    {
      "title": "string",
      "description": "string",
      "type": "prep|travel|check-in|packing|confirmation|general",
      "time_before_minutes": 60
    }
  ],
  "total_prep_time_hours": 2,
  "notes": "optional overall note"
}`,
    'vp-generateSmartReminders',
    gate.plan,
    gate.art9Categories
  );

  if (!result) {
    return {
      ok: false,
      error: aiUnavailableMessage(gate.art9Categories),
      status: 503,
    };
  }

  const reminders: SmartReminderOut[] = Array.isArray(result.reminders)
    ? result.reminders
        .map((r) => {
          const remTitle = asString(r?.title);
          if (!remTitle) return null;
          const minutes = asMinutes(r.time_before_minutes) ?? 60;
          return {
            title: remTitle,
            description: asString(r.description) || remTitle,
            type: asString(r.type) || 'general',
            time_before_minutes: minutes,
          };
        })
        .filter((r): r is SmartReminderOut => !!r)
        .slice(0, 8)
    : [];

  if (reminders.length === 0) {
    return {
      ok: false,
      error: aiUnavailableMessage(gate.art9Categories),
      status: 503,
    };
  }

  const totalFromReminders =
    reminders.reduce((sum, r) => sum + r.time_before_minutes, 0) / 60;
  const totalPrep =
    typeof result.total_prep_time_hours === 'number' &&
    Number.isFinite(result.total_prep_time_hours)
      ? Math.max(0.25, Math.round(result.total_prep_time_hours * 10) / 10)
      : Math.round(totalFromReminders * 10) / 10;

  const notes = asString(result.notes);

  return {
    ok: true,
    data: {
      reminders,
      total_prep_time_hours: totalPrep,
      ...(notes ? { notes } : {}),
    },
  };
};

/** AITaskDependencyAnalyzer — server-side task fetch + dependency analysis. */
export const analyzeTaskDependencies: VpFunctionHandler = async ({ user, payload }) => {
  const taskId = asString(payload.task_id);
  if (!taskId) {
    return { ok: false, error: 'task_id is required', status: 400 };
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .schema('firstparty')
    .from('vp_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(80);

  if (error) {
    console.warn('VP analyzeTaskDependencies fetch failed:', error.message);
    return { ok: false, error: 'Failed to load tasks', status: 500 };
  }

  const tasks = (rows ?? []).map((row) => ({
    id: String(row.id),
    title: asString(row.title) || 'Untitled',
    description: asString(row.description) || asString(row.notes),
    status: asString(row.status) || 'pending',
    priority:
      typeof row.priority === 'number'
        ? ({ 0: 'low', 1: 'low', 2: 'medium', 3: 'high' } as Record<number, string>)[
            row.priority
          ] ?? 'medium'
        : asString(row.priority) || 'medium',
    category: asString(row.category) || 'personal',
    due_date: row.due_date ? String(row.due_date) : null,
    estimated_minutes:
      typeof row.estimated_minutes === 'number' ? row.estimated_minutes : null,
  }));

  const focus = tasks.find((t) => t.id === taskId);
  if (!focus) {
    return { ok: false, error: 'Task not found', status: 404 };
  }

  const art9Categories = scanArt9(
    ...tasks.map((t) => t.title),
    ...tasks.map((t) => t.description)
  );
  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const catalog = tasks
    .map(
      (t, i) =>
        `${i + 1}. id=${t.id} | "${t.title}" | status=${t.status} | priority=${t.priority} | category=${t.category} | due=${t.due_date || 'none'} | minutes=${t.estimated_minutes ?? 'n/a'}`
    )
    .join('\n');

  const result = await groqJson<{
    analysis?: {
      dependencies?: Array<{
        task_id?: string;
        task_title?: string;
        blocked_by?: Array<{ task_id?: string; task_title?: string; reason?: string }>;
        blocks?: Array<{ task_id?: string; task_title?: string; reason?: string }>;
      }>;
      optimal_sequence?: Array<{ order?: number; task_id?: string; task_title?: string; reason?: string }>;
      critical_path?: string[];
      conflicts?: Array<{ description?: string; affected_tasks?: string[] }>;
      recommendations?: string[];
    };
  }>(
    `You analyze task dependencies for Vagus Planner.
Focus on the target task, but consider the full task list for blockers and sequencing.
Only reference task_ids that appear in the catalog. Prefer genuine dependencies over speculative ones.
If little evidence exists, return sparse dependencies and explain in recommendations.
${gate.art9Categories.length ? 'Tasks may involve health or religious content — stay factual.' : ''}
Return JSON only.`,
    `Target task_id: ${taskId}
Target title: ${focus.title}

Task catalog:
${catalog}

Return:
{
  "analysis": {
    "dependencies": [
      {
        "task_id": "uuid",
        "task_title": "string",
        "blocked_by": [{ "task_id": "uuid", "task_title": "string", "reason": "string" }],
        "blocks": [{ "task_id": "uuid", "task_title": "string", "reason": "string" }]
      }
    ],
    "optimal_sequence": [
      { "order": 1, "task_id": "uuid", "task_title": "string", "reason": "string" }
    ],
    "critical_path": ["task title"],
    "conflicts": [{ "description": "string", "affected_tasks": ["title"] }],
    "recommendations": ["string"]
  }
}`,
    'vp-analyzeTaskDependencies',
    gate.plan,
    gate.art9Categories
  );

  if (!result?.analysis) {
    return {
      ok: false,
      error: aiUnavailableMessage(gate.art9Categories),
      status: 503,
    };
  }

  const idSet = new Set(tasks.map((t) => t.id));
  const titleById = new Map(tasks.map((t) => [t.id, t.title]));

  const dependencies = Array.isArray(result.analysis.dependencies)
    ? result.analysis.dependencies
        .map((dep) => {
          const id = asString(dep.task_id);
          if (!id || !idSet.has(id)) return null;
          const mapEdge = (edge: {
            task_id?: string;
            task_title?: string;
            reason?: string;
          }) => {
            const eid = asString(edge.task_id);
            if (!eid || !idSet.has(eid)) return null;
            return {
              task_id: eid,
              task_title: asString(edge.task_title) || titleById.get(eid) || 'Task',
              reason: asString(edge.reason) || 'Related dependency',
            };
          };
          return {
            task_id: id,
            task_title: asString(dep.task_title) || titleById.get(id) || 'Task',
            blocked_by: Array.isArray(dep.blocked_by)
              ? dep.blocked_by.map(mapEdge).filter(Boolean)
              : [],
            blocks: Array.isArray(dep.blocks)
              ? dep.blocks.map(mapEdge).filter(Boolean)
              : [],
          };
        })
        .filter(Boolean)
    : [];

  const optimal_sequence = Array.isArray(result.analysis.optimal_sequence)
    ? result.analysis.optimal_sequence
        .map((seq, idx) => ({
          order: typeof seq.order === 'number' ? seq.order : idx + 1,
          task_id: asString(seq.task_id) || undefined,
          task_title: asString(seq.task_title) || 'Task',
          reason: asString(seq.reason) || '',
        }))
        .slice(0, 20)
    : [];

  return {
    ok: true,
    data: {
      analysis: {
        dependencies,
        optimal_sequence,
        critical_path: Array.isArray(result.analysis.critical_path)
          ? result.analysis.critical_path.map(String).filter(Boolean).slice(0, 20)
          : [],
        conflicts: Array.isArray(result.analysis.conflicts)
          ? result.analysis.conflicts
              .map((c) => ({
                description: asString(c.description) || 'Conflict',
                affected_tasks: Array.isArray(c.affected_tasks)
                  ? c.affected_tasks.map(String).filter(Boolean)
                  : [],
              }))
              .slice(0, 10)
          : [],
        recommendations: Array.isArray(result.analysis.recommendations)
          ? result.analysis.recommendations.map(String).filter(Boolean).slice(0, 10)
          : [],
      },
    },
  };
};
