'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
import { SA } from '@/lib/shift-ai/theme';

const TYPE_BADGE_CLASS: Record<ShiftPlannerItemType, string> = {
  class: 'border-[var(--sa-navy-100)] bg-[var(--sa-navy-50)] text-[var(--sa-navy-800)]',
  homework: 'border-[var(--sa-border)] bg-[var(--sa-secondary)] text-[var(--sa-fg)]',
  test: 'border-red-200 bg-red-50 text-red-800',
  revision: 'border-[var(--sa-navy-100)] bg-white text-[var(--sa-navy-800)]',
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

function formatDueDate(iso: string, locale: string): string {
  const dateKey = iso.split('T')[0];
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(locale === 'ar' ? 'ar' : 'en-GB', {
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
  const t = useTranslations('planner');
  const locale = useLocale();
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
        throw new Error(data.error || t('errors.saveFailed'));
      }

      setItems((current) =>
        [...current, data.item!].sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
      );
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
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
        throw new Error(data.error || t('errors.updateFailed'));
      }

      setItems((current) =>
        current.map((row) => (row.id === data.item!.id ? data.item! : row))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.updateFailed'));
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
        throw new Error(data.error || t('errors.deleteFailed'));
      }

      setItems((current) => current.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.deleteFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${SA.contentNarrow} flex flex-col`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={SA.iconHeader}>
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className={SA.headingMd}>{t('title')}</h1>
              <p className={`text-sm ${SA.muted}`}>{t('subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            className={SA.btnPrimary}
            disabled={busy}
          >
            <Plus className="h-4 w-4" />
            {t('add')}
          </button>
        </div>

        {error ? <p className={`mb-4 ${SA.error}`}>{error}</p> : null}

        {showForm ? (
          <div className={`mb-6 space-y-3 ${SA.cardPadded}`}>
            <h3 className={`font-semibold ${SA.text}`}>{t('newItem')}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={form.itemType}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    itemType: e.target.value as ShiftPlannerItemType,
                  }))
                }
                className={SA.select}
              >
                {SHIFT_PLANNER_ITEM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SHIFT_PLANNER_TYPE_ICONS[type]} {t(`itemTypes.${type}`)}
                  </option>
                ))}
              </select>
              <select
                value={form.subject}
                onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                className={SA.select}
              >
                <option value="">{t('subjectOptional')}</option>
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder={t('titlePlaceholder')}
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              className={SA.input}
            />
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((current) => ({ ...current, dueDate: e.target.value }))}
              className={SA.input}
            />
            <input
              type="text"
              placeholder={t('notesOptional')}
              value={form.notes}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
              className={SA.input}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={busy || !form.title || !form.dueDate}
                className={SA.btnPrimary}
              >
                {t('save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                }}
                className={SA.btnSecondary}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : null}

        {overdue.length > 0 ? (
          <PlannerSection
            title={t('overdue')}
            items={overdue}
            busy={busy}
            locale={locale}
            onToggle={(item) => void handleToggle(item)}
            onDelete={(id) => void handleDelete(id)}
          />
        ) : null}

        <PlannerSection
          title={t('upcoming')}
          items={upcoming}
          busy={busy}
          locale={locale}
          onToggle={(item) => void handleToggle(item)}
          onDelete={(id) => void handleDelete(id)}
          emptyMsg={t('emptyUpcoming')}
        />

        {completed.length > 0 ? (
          <PlannerSection
            title={t('completed')}
            items={completed}
            busy={busy}
            locale={locale}
            onToggle={(item) => void handleToggle(item)}
            onDelete={(id) => void handleDelete(id)}
          />
        ) : null}
    </div>
  );
}

function PlannerSection({
  title,
  items,
  busy,
  locale,
  onToggle,
  onDelete,
  emptyMsg,
}: {
  title: string;
  items: ShiftPlannerItem[];
  busy: boolean;
  locale: string;
  onToggle: (item: ShiftPlannerItem) => void;
  onDelete: (id: string) => void;
  emptyMsg?: string;
}) {
  const t = useTranslations('planner');

  return (
    <section className="mb-6">
      <h2 className={SA.sectionLabel}>{title}</h2>
      {items.length === 0 && emptyMsg ? (
        <p className={`py-4 text-sm ${SA.muted}`}>{emptyMsg}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const subject = parsePlannerSubject(item.description);
            const notes = parsePlannerNotes(item.description);
            const itemType = item.item_type as ShiftPlannerItemType;

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-xl sa-card px-4 py-3 ${
                  item.completed ? 'opacity-60' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(item)}
                  disabled={busy}
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    item.completed
                      ? 'border-[var(--sa-navy-800)] bg-[var(--sa-navy-800)]'
                      : 'border-[var(--sa-border)] hover:border-[var(--sa-navy-800)]'
                  }`}
                  aria-label={item.completed ? t('markIncomplete') : t('markComplete')}
                >
                  {item.completed ? <Check className="h-3 w-3 text-white" /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${TYPE_BADGE_CLASS[itemType]}`}
                    >
                      {SHIFT_PLANNER_TYPE_ICONS[itemType]} {t(`itemTypes.${itemType}`)}
                    </span>
                    {subject ? (
                      <span className={`text-xs ${SA.muted}`}>{subject}</span>
                    ) : null}
                  </div>
                  <p
                    className={`mt-1 text-sm font-medium ${
                      item.completed ? `line-through ${SA.muted}` : SA.text
                    }`}
                  >
                    {item.title}
                  </p>
                  {notes ? <p className={`mt-0.5 text-xs ${SA.muted}`}>{notes}</p> : null}
                  <p className={`mt-1 text-xs ${SA.muted}`}>📅 {formatDueDate(item.due_date, locale)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  disabled={busy}
                  className={`p-1 ${SA.muted} hover:text-red-500 disabled:opacity-60`}
                  aria-label={t('deleteItem')}
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
