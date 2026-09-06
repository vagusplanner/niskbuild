/**
 * Shared client for the registered `suggestTaskPriority` VP handler.
 * Used by AIPrioritySuggester (single), AITaskPrioritizer + BulkReprioritizeButton (batch).
 */
import { base44 } from '@/api/base44Client';

const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

export function normalizePriority(value, fallback = 'medium') {
  if (typeof value !== 'string') return fallback;
  const lower = value.toLowerCase().trim();
  return PRIORITIES.has(lower) ? lower : fallback;
}

/**
 * @param {{ title: string, description?: string, due_date?: string, due_time?: string, category?: string }} fields
 * @returns {Promise<{ success: boolean, suggested_priority?: string, confidence?: string, reasoning?: string, urgency_factors?: string[], limit_exceeded?: boolean, error?: string }>}
 */
export async function suggestTaskPriority(fields) {
  const title = String(fields?.title || '').trim();
  if (title.length < 3) {
    return { success: false, error: 'title is required (min 3 characters)' };
  }

  const { data } = await base44.functions.invoke('suggestTaskPriority', {
    title,
    description: fields.description || '',
    due_date: fields.due_date || '',
    due_time: fields.due_time || '',
    category: fields.category || '',
  });

  if (!data) {
    return { success: false, error: 'Empty response from suggestTaskPriority' };
  }

  if (data.limit_exceeded) {
    return { success: false, limit_exceeded: true, error: data.error || 'AI limit exceeded' };
  }

  if (data.success === false || data.error) {
    return { success: false, error: data.error || 'Priority suggestion failed' };
  }

  const suggested = normalizePriority(data.suggested_priority);
  return {
    success: true,
    suggested_priority: suggested,
    confidence: data.confidence || 'medium',
    reasoning: typeof data.reasoning === 'string' ? data.reasoning : '',
    urgency_factors: Array.isArray(data.urgency_factors)
      ? data.urgency_factors.map(String).filter(Boolean)
      : [],
  };
}

/**
 * Batch: call suggestTaskPriority once per incomplete task.
 * Does not persist — caller applies updates.
 *
 * @param {Array<{ id?: string, title: string, description?: string, due_date?: string, due_time?: string, category?: string, priority?: string, status?: string }>} tasks
 * @param {{ context?: string, concurrency?: number }} [options]
 */
export async function batchSuggestTaskPriorities(tasks, options = {}) {
  const incomplete = (tasks || []).filter((t) => t && t.status !== 'completed' && t.status !== 'done');
  const context = String(options.context || '').trim();
  const results = [];
  const updates = [];
  let changesMade = 0;

  for (const task of incomplete) {
    const description = [task.description || '', context ? `Context: ${context}` : '']
      .filter(Boolean)
      .join('\n');

    const suggestion = await suggestTaskPriority({
      title: task.title,
      description,
      due_date: task.due_date,
      due_time: task.due_time,
      category: task.category,
    });

    if (!suggestion.success) {
      results.push({ task, suggestion, skipped: true });
      if (suggestion.limit_exceeded) {
        return {
          success: false,
          limit_exceeded: true,
          error: suggestion.error,
          results,
          updates,
          changes_made: changesMade,
          recommendations: [],
        };
      }
      continue;
    }

    const oldPriority = normalizePriority(task.priority || 'medium');
    const newPriority = suggestion.suggested_priority;
    const changed = oldPriority !== newPriority;

    const row = {
      task_id: task.id,
      task_title: task.title,
      old_priority: oldPriority,
      new_priority: newPriority,
      reasoning: suggestion.reasoning,
      confidence: suggestion.confidence,
      urgency_factors: suggestion.urgency_factors,
      best_time: inferBestTime(suggestion),
      estimated_minutes: 30,
      changed,
    };

    results.push({ task, suggestion, row });
    if (changed) {
      changesMade += 1;
      updates.push(row);
    }
  }

  const recommendations = [];
  if (context) recommendations.push(`Priorities considered your context: “${context}”`);
  if (changesMade === 0 && incomplete.length > 0) {
    recommendations.push('Current priorities already look appropriate for the selected tasks.');
  }

  return {
    success: true,
    results,
    updates,
    changes_made: changesMade,
    recommendations,
    prioritized_tasks: results
      .filter((r) => r.row)
      .map((r, index) => ({
        task_index: index,
        task_id: r.task.id,
        recommended_priority: r.row.new_priority,
        reasoning: r.row.reasoning,
        confidence: r.row.confidence,
        best_time: r.row.best_time,
        estimated_minutes: r.row.estimated_minutes,
        suggested_due_date: r.task.due_date || null,
      })),
    overall_advice:
      changesMade > 0
        ? `Suggested priority changes for ${changesMade} of ${incomplete.length} tasks.`
        : `Reviewed ${incomplete.length} tasks — priorities look solid.`,
  };
}

function inferBestTime(suggestion) {
  const text = `${suggestion.reasoning || ''} ${(suggestion.urgency_factors || []).join(' ')}`.toLowerCase();
  if (/morning|fajr|early/.test(text)) return 'morning';
  if (/evening|night|isha|maghrib/.test(text)) return 'evening';
  return 'afternoon';
}
