export const SHIFT_PLANNER_ITEM_TYPES = ['class', 'homework', 'test', 'revision'] as const;

export type ShiftPlannerItemType = (typeof SHIFT_PLANNER_ITEM_TYPES)[number];

export type ShiftPlannerItem = {
  id: string;
  title: string;
  description: string | null;
  item_type: ShiftPlannerItemType;
  due_date: string;
  completed: boolean;
};

export const SHIFT_PLANNER_TYPE_ICONS: Record<ShiftPlannerItemType, string> = {
  class: '📚',
  homework: '✏️',
  test: '📝',
  revision: '🔁',
};

export function isShiftPlannerItemType(value: string): value is ShiftPlannerItemType {
  return (SHIFT_PLANNER_ITEM_TYPES as readonly string[]).includes(value);
}

export function todayDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function dueDateKey(iso: string): string {
  return iso.split('T')[0];
}

export function groupPlannerItems(items: ShiftPlannerItem[]) {
  const today = todayDateKey();
  const upcoming = items
    .filter((item) => !item.completed && dueDateKey(item.due_date) >= today)
    .slice(0, 20);
  const overdue = items.filter(
    (item) => !item.completed && dueDateKey(item.due_date) < today
  );
  const completed = items.filter((item) => item.completed).slice(0, 10);

  return { upcoming, overdue, completed };
}

export function buildPlannerDescription(subject?: string, notes?: string): string | null {
  const parts: string[] = [];
  const subjectTrimmed = subject?.trim();
  const notesTrimmed = notes?.trim();

  if (subjectTrimmed) {
    parts.push(`Subject: ${subjectTrimmed}`);
  }
  if (notesTrimmed) {
    parts.push(notesTrimmed);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

export function parsePlannerSubject(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/^Subject:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

export function parsePlannerNotes(description: string | null): string | null {
  if (!description) return null;
  const lines = description.split('\n');
  if (lines[0]?.startsWith('Subject:')) {
    const rest = lines.slice(1).join('\n').trim();
    return rest || null;
  }
  return description.trim() || null;
}

export function dueDateFromInput(dateValue: string): string | null {
  const trimmed = dateValue.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  return new Date(`${trimmed}T12:00:00.000Z`).toISOString();
}
