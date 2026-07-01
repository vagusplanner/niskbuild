'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, Plus, Trash2 } from 'lucide-react';
import {
  groupPlannerItems,
  parsePlannerNotes,
  parsePlannerSubject,
  SHIFT_PLANNER_ITEM_TYPES,
  SHIFT_PLANNER_TYPE_ICONS,
  type ShiftPlannerItem,
  type ShiftPlannerItemType,
} from '@/lib/shift-ai/planner';

const TYPE_BADGE_CLASS: Record<ShiftPlannerItemType, string> = {
  class: 'border-[#9a6530]/40 bg-[#9a6530]/15 text-[#e8dcc8]',
  homework: 'border-[#857664]/40 bg-[#857664]/15 text-[#e8dcc8]',
  test: 'border-red-500/30 bg-red-500/10 text-[#e8dcc8]',
  revision: 'border-[#9a6530]/30 bg-[#1a1612] text-[#e8dcc8]',
};

type PlannerFormState = {
  itemType: ShiftPlannerItemType;
  subject: string;
  title: string;
  dueDate: string;
  notes: string;
};

const emptyForm = (): PlannerFormState => ({
  itemType: 'homework',
  subject: '',
  title: '',
  dueDate: '',
  notes: '',
});

function formatDueDate(iso: string): string {
  const dateKey = iso.split('T')[0];
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function ShiftAiPlannerClient({
  initialItems,
  subjectOptions,
}: {
  initialItems: ShiftPlannerItem[];
  subjectOptions: string[];
}) {
  const [items, setItems] = useState<ShiftPlannerItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PlannerFormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { upcoming, overdue, completed } = useMemo(() => groupPlannerItems(items), [items]);

  const handleCreate = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/shift-ai/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          itemType: form.itemType,
          dueDate: form.dueDate,
          subject: form.subject,
          notes: form.notes,
        }),
      });

      const data = (await res.json()) as { error?: string; item?: ShiftPlannerItem };
      if (!res.ok || !data.item) {
        throw new Error(data.error || 'Could not save planner item');
      }

      setItems((current) =>
        [...current, data.item!].sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
      );
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save planner item');
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (item: ShiftPlannerItem) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/shift-ai/planner/${item.id}`, {
        method: 'PATCH',
        credentials: 'include',
      });

      const data = (await res.json()) as { error?: string; item?: ShiftPlannerItem };
      if (!res.ok || !data.item) {
        throw new Error(data.error || 'Could not update planner item');
      }

      setItems((current) =>
        current.map((row) => (row.id === data.item!.id ? data.item! : row))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update planner item');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/shift-ai/planner/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not delete planner item');
      }

      setItems((current) => current.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete planner item');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1a1612] text-[#e8dcc8]">
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9a6530]">
              <CalendarDays className="h-5 w-5 text-[#1a1612]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#e8dcc8]">Planner</h1>
              <p className="text-sm text-[#857664]">Classes, homework, tests & revision</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/builder/shift-ai/dashboard"
              className="hidden text-sm text-[#857664] hover:text-[#e8dcc8] sm:inline"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => setShowForm((open) => !open)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#9a6530] px-4 py-2 text-sm font-semibold text-[#1a1612] hover:opacity-90 disabled:opacity-60"
              disabled={busy}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-[#e8dcc8]">
            {error}
          </p>
        ) : null}

        {showForm ? (
          <div className="mb-6 space-y-3 rounded-2xl border border-[#857664]/30 bg-[#1a1612] p-5">
            <h3 className="font-semibold text-[#e8dcc8]">New planner item</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={form.itemType}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    itemType: e.target.value as ShiftPlannerItemType,
                  }))
                }
                className="rounded-lg border border-[#857664]/40 bg-[#1a1612] px-3 py-2 text-sm text-[#e8dcc8]"
              >
                {SHIFT_PLANNER_ITEM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SHIFT_PLANNER_TYPE_ICONS[type]}{' '}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={form.subject}
                onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                className="rounded-lg border border-[#857664]/40 bg-[#1a1612] px-3 py-2 text-sm text-[#e8dcc8]"
              >
                <option value="">Subject (optional)</option>
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Title, e.g. Algebra homework due"
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              className="w-full rounded-lg border border-[#857664]/40 bg-[#1a1612] px-3 py-2 text-sm text-[#e8dcc8] placeholder:text-[#857664]"
            />
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((current) => ({ ...current, dueDate: e.target.value }))}
              className="w-full rounded-lg border border-[#857664]/40 bg-[#1a1612] px-3 py-2 text-sm text-[#e8dcc8]"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
              className="w-full rounded-lg border border-[#857664]/40 bg-[#1a1612] px-3 py-2 text-sm text-[#e8dcc8] placeholder:text-[#857664]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy || !form.title || !form.dueDate}
                className="rounded-lg bg-[#9a6530] px-4 py-2 text-sm font-semibold text-[#1a1612] hover:opacity-90 disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                }}
                className="rounded-lg border border-[#857664]/40 px-4 py-2 text-sm text-[#e8dcc8] hover:border-[#9a6530]/50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {overdue.length > 0 ? (
          <PlannerSection
            title="⚠️ Overdue"
            items={overdue}
            busy={busy}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ) : null}

        <PlannerSection
          title="📅 Upcoming"
          items={upcoming}
          busy={busy}
          onToggle={handleToggle}
          onDelete={handleDelete}
          emptyMsg="Nothing upcoming — add something above!"
        />

        {completed.length > 0 ? (
          <PlannerSection
            title="✅ Completed"
            items={completed}
            busy={busy}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ) : null}
      </div>
    </main>
  );
}

function PlannerSection({
  title,
  items,
  busy,
  onToggle,
  onDelete,
  emptyMsg,
}: {
  title: string;
  items: ShiftPlannerItem[];
  busy: boolean;
  onToggle: (item: ShiftPlannerItem) => void;
  onDelete: (id: string) => void;
  emptyMsg?: string;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#857664]">
        {title}
      </h2>
      {items.length === 0 && emptyMsg ? (
        <p className="py-4 text-sm text-[#857664]">{emptyMsg}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const subject = parsePlannerSubject(item.description);
            const notes = parsePlannerNotes(item.description);
            const itemType = item.item_type as ShiftPlannerItemType;

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-xl border border-[#857664]/30 bg-[#1a1612] px-4 py-3 ${
                  item.completed ? 'opacity-60' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(item)}
                  disabled={busy}
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    item.completed
                      ? 'border-[#9a6530] bg-[#9a6530]'
                      : 'border-[#857664] hover:border-[#9a6530]'
                  }`}
                  aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {item.completed ? <Check className="h-3 w-3 text-[#1a1612]" /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${TYPE_BADGE_CLASS[itemType]}`}
                    >
                      {SHIFT_PLANNER_TYPE_ICONS[itemType]} {item.item_type}
                    </span>
                    {subject ? (
                      <span className="text-xs text-[#857664]">{subject}</span>
                    ) : null}
                  </div>
                  <p
                    className={`mt-1 text-sm font-medium ${
                      item.completed ? 'line-through text-[#857664]' : 'text-[#e8dcc8]'
                    }`}
                  >
                    {item.title}
                  </p>
                  {notes ? <p className="mt-0.5 text-xs text-[#857664]">{notes}</p> : null}
                  <p className="mt-1 text-xs text-[#857664]">📅 {formatDueDate(item.due_date)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  disabled={busy}
                  className="p-1 text-[#857664] hover:text-red-400 disabled:opacity-60"
                  aria-label="Delete planner item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
