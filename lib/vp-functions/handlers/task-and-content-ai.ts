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

function normalizeConfidence(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  }
  return 'medium';
}

/** TaskForm AIPrioritySuggester — suggest low/medium/high/urgent with reasoning. */
export const suggestTaskPriority: VpFunctionHandler = async ({ user, payload }) => {
  const title = asString(payload.title);
  if (!title || title.length < 3) {
    return { ok: false, error: 'title is required (min 3 characters)', status: 400 };
  }

  const description = asString(payload.description);
  const dueDate = asString(payload.due_date);
  const dueTime = asString(payload.due_time);
  const category = asString(payload.category);

  const art9Categories = scanArt9(title, description, category);
  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const result = await groqJson<{
    success?: boolean;
    suggested_priority?: string;
    confidence?: string | number;
    reasoning?: string;
    urgency_factors?: unknown[];
  }>(
    `You are a task priority assistant for Vagus Planner.
Suggest one priority from: low, medium, high, urgent.
Be practical. Prefer medium unless clear urgency (deadlines, blockers, safety, time-sensitive commitments).
${gate.art9Categories.length ? 'Content may involve health or religious topics — treat respectfully and do not invent medical advice.' : ''}
Return JSON only.`,
    `Task:
title: ${title}
description: ${description || '(none)'}
due_date: ${dueDate || '(none)'}
due_time: ${dueTime || '(none)'}
category: ${category || '(none)'}

Return:
{
  "success": true,
  "suggested_priority": "low|medium|high|urgent",
  "confidence": "high|medium|low or a percent string",
  "reasoning": "1-3 sentences explaining the suggestion",
  "urgency_factors": ["short factor", "short factor"]
}`,
    'vp-suggestTaskPriority',
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

  const factors = Array.isArray(result.urgency_factors)
    ? result.urgency_factors.map((f) => String(f)).filter(Boolean).slice(0, 6)
    : [];

  return {
    ok: true,
    data: {
      success: true,
      suggested_priority: normalizePriority(result.suggested_priority),
      confidence: normalizeConfidence(result.confidence),
      reasoning:
        typeof result.reasoning === 'string' && result.reasoning.trim()
          ? result.reasoning.trim()
          : 'Suggested based on title, timing, and category.',
      urgency_factors: factors,
    },
  };
};

/** TranslateButton — translate arbitrary UI text. */
export const translateContent: VpFunctionHandler = async ({ user, payload }) => {
  const text = asString(payload.text);
  if (!text) {
    return { ok: false, error: 'text is required', status: 400 };
  }

  const targetLanguage = asString(payload.target_language) || 'English';
  const sourceLanguage = asString(payload.source_language) || 'auto';

  const art9Categories = scanArt9(text);
  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const result = await groqJson<{
    success?: boolean;
    translated_text?: string;
  }>(
    `You are a precise translator for Vagus Planner.
Translate the user text into the requested target language.
Preserve meaning, tone, and formatting (line breaks, bullet points).
Do not add commentary — return only the translation in JSON.
${gate.art9Categories.length ? 'Content may involve health or religious topics — translate faithfully without adding advice.' : ''}`,
    `Source language: ${sourceLanguage}
Target language: ${targetLanguage}

Text to translate:
"""
${text}
"""

Return:
{
  "success": true,
  "translated_text": "the full translation"
}`,
    'vp-translateContent',
    gate.plan,
    gate.art9Categories
  );

  if (!result || typeof result.translated_text !== 'string' || !result.translated_text.trim()) {
    return {
      ok: false,
      error: aiUnavailableMessage(gate.art9Categories),
      status: 503,
    };
  }

  return {
    ok: true,
    data: {
      success: true,
      translated_text: result.translated_text.trim(),
    },
  };
};

type ChatMessageIn = { sender?: string; text?: string; timestamp?: string };

/** Event/travel group chat — extract actionable suggestions from conversation. */
export const analyzeChatForActions: VpFunctionHandler = async ({ user, payload }) => {
  const eventTitle = asString(payload.event_title) || 'Untitled event';
  const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
  if (rawMessages.length === 0) {
    return { ok: false, error: 'messages are required', status: 400 };
  }

  const messages: ChatMessageIn[] = rawMessages.slice(-40).map((m) => {
    const row = m && typeof m === 'object' ? (m as Record<string, unknown>) : {};
    return {
      sender: asString(row.sender) || 'Unknown',
      text: asString(row.text),
      timestamp: asString(row.timestamp) || undefined,
    };
  }).filter((m) => m.text);

  if (messages.length === 0) {
    return { ok: false, error: 'messages must include non-empty text', status: 400 };
  }

  const transcript = messages
    .map((m) => `${m.sender}: ${m.text}`)
    .join('\n');

  const art9Categories = scanArt9(eventTitle, transcript);
  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const conversationId = asString(payload.conversation_id);

  const result = await groqJson<{
    suggestions?: Array<{
      type?: string;
      description?: string;
      suggested_date?: string | null;
    }>;
  }>(
    `You analyze group chat conversations for Vagus Planner and extract actionable follow-ups.
Suggest concrete actions only when clearly implied (tasks, bookings, decisions, reminders, expenses, research).
Prefer types: task, event, reminder, booking, expense, decision, note.
If nothing actionable, return an empty suggestions array.
${gate.art9Categories.length ? 'Conversation may include health or religious content — extract actions carefully without inventing medical/religious guidance.' : ''}
Return JSON only.`,
    `Event/context title: ${eventTitle}
${conversationId ? `Conversation id: ${conversationId}\n` : ''}
Transcript:
${transcript}

Return:
{
  "suggestions": [
    {
      "type": "task|event|reminder|booking|expense|decision|note",
      "description": "clear actionable description",
      "suggested_date": "YYYY-MM-DD or null if not applicable"
    }
  ]
}`,
    'vp-analyzeChatForActions',
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

  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions
        .map((s) => {
          const description = asString(s?.description);
          if (!description) return null;
          const type = asString(s?.type) || 'task';
          const suggestedDate = asString(s?.suggested_date);
          return {
            type,
            description,
            ...(suggestedDate ? { suggested_date: suggestedDate } : {}),
          };
        })
        .filter((s): s is { type: string; description: string; suggested_date?: string } => !!s)
        .slice(0, 12)
    : [];

  return {
    ok: true,
    data: { suggestions },
  };
};

/** Recurring task AI helper — description, minutes, subtasks, tips. */
export const generateRecurringTaskDescription: VpFunctionHandler = async ({
  user,
  payload,
}) => {
  const taskTitle = asString(payload.task_title) || asString(payload.title);
  if (!taskTitle || taskTitle.length < 3) {
    return { ok: false, error: 'task_title is required (min 3 characters)', status: 400 };
  }

  const category = asString(payload.category) || 'personal';
  const recurrenceType = asString(payload.recurrence_type) || 'weekly';

  const art9Categories = scanArt9(taskTitle, category);
  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const result = await groqJson<{
    description?: string;
    estimated_minutes?: number;
    subtasks?: Array<{ title?: string } | string>;
    tips?: unknown[];
  }>(
    `You help users flesh out recurring tasks in Vagus Planner.
Write a concise description, estimate duration, suggest a few subtasks, and practical tips.
Keep subtasks short and actionable.
${gate.art9Categories.length ? 'Task may involve health or religious practice — be respectful and avoid inventing medical advice.' : ''}
Return JSON only.`,
    `Recurring task:
title: ${taskTitle}
category: ${category}
recurrence: ${recurrenceType}

Return:
{
  "description": "2-4 sentence description tailored to this recurring task",
  "estimated_minutes": 15,
  "subtasks": [{ "title": "short subtask" }],
  "tips": ["practical tip"]
}`,
    'vp-generateRecurringTaskDescription',
    gate.plan,
    gate.art9Categories
  );

  if (!result || typeof result.description !== 'string' || !result.description.trim()) {
    return {
      ok: false,
      error: aiUnavailableMessage(gate.art9Categories),
      status: 503,
    };
  }

  let estimatedMinutes: number | undefined;
  if (typeof result.estimated_minutes === 'number' && Number.isFinite(result.estimated_minutes)) {
    estimatedMinutes = Math.min(480, Math.max(5, Math.round(result.estimated_minutes)));
  }

  const subtasks = Array.isArray(result.subtasks)
    ? result.subtasks
        .map((s) => {
          if (typeof s === 'string' && s.trim()) return { title: s.trim() };
          if (s && typeof s === 'object' && typeof (s as { title?: unknown }).title === 'string') {
            const t = String((s as { title: string }).title).trim();
            return t ? { title: t } : null;
          }
          return null;
        })
        .filter((s): s is { title: string } => !!s)
        .slice(0, 8)
    : [];

  const tips = Array.isArray(result.tips)
    ? result.tips.map((t) => String(t)).filter(Boolean).slice(0, 6)
    : [];

  return {
    ok: true,
    data: {
      description: result.description.trim(),
      ...(estimatedMinutes != null ? { estimated_minutes: estimatedMinutes } : {}),
      ...(subtasks.length ? { subtasks } : {}),
      ...(tips.length ? { tips } : {}),
    },
  };
};
