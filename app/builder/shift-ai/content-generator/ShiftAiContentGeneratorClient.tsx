'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Save } from 'lucide-react';
import {
  CONTENT_TYPES,
  formatContentForNotes,
  type ContentGeneratorType,
  type GeneratedContent,
} from '@/lib/shift-ai/content-generator-shared';
import {
  EXAM_BOARDS,
  normalizeCurriculum,
} from '@/lib/shift-ai/essay-curriculum';
import type { ShiftCurriculum } from '@/lib/shift-ai/constants';
import { resolveSubjectQuery } from '@/lib/shift-ai/subject-query';
import { SA } from '@/lib/shift-ai/theme';

type SubjectOption = { name: string; dbId: string | null };

function renderContent(
  content: GeneratedContent,
  t: ReturnType<typeof useTranslations<'contentGenerator'>>
) {
  if (content.type === 'practice_questions') {
    return (
      <div className="space-y-4">
        {content.questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-[var(--sa-navy-100)] p-4">
            <p className={`text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
              {t('marks', { n: i + 1, marks: q.marks })}
            </p>
            <p className={`mt-2 text-sm font-medium ${SA.text}`}>{q.question}</p>
            <p className={`mt-3 text-sm ${SA.muted}`}>
              <span className="font-semibold text-[var(--sa-navy-700)]">{t('answer')}</span>
              {q.answer}
            </p>
            {q.mark_scheme ? (
              <p className={`mt-2 text-sm ${SA.muted}`}>
                <span className="font-semibold text-[var(--sa-navy-700)]">{t('markScheme')}</span>
                {q.mark_scheme}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  const body = content.type === 'summary' ? content.summary : content.notes;
  const sections = [
    { title: t('sections.keyConcepts'), text: body.key_concepts },
    { title: t('sections.importantTerms'), text: body.important_terms },
    { title: t('sections.examTips'), text: body.exam_tips },
    { title: t('sections.commonMistakes'), text: body.common_mistakes },
  ].filter((s) => s.text);

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <div key={s.title}>
          <p className={`text-sm font-bold ${SA.text}`}>{s.title}</p>
          <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${SA.text}`}>{s.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function ShiftAiContentGeneratorClient({
  subjectOptions,
  curriculum,
  yearGroup,
  notesBySubjectId,
  initialSubject = null,
  initialType = null,
}: {
  subjectOptions: SubjectOption[];
  curriculum: ShiftCurriculum;
  yearGroup: string;
  notesBySubjectId: Record<string, string>;
  initialSubject?: string | null;
  initialType?: string | null;
}) {
  const t = useTranslations('contentGenerator');
  const boards = EXAM_BOARDS[curriculum] ?? EXAM_BOARDS.uk;
  const lockedSubject = resolveSubjectQuery(
    subjectOptions.map((s) => s.name),
    initialSubject
  );
  const typeFromQuery: ContentGeneratorType | null =
    initialType === 'practice_questions' ||
    initialType === 'summary' ||
    initialType === 'revision_notes'
      ? initialType
      : null;

  const [subject, setSubject] = useState(lockedSubject ?? subjectOptions[0]?.name ?? '');
  const [examBoard, setExamBoard] = useState(boards[0] ?? '');
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<ContentGeneratorType>(
    typeFromQuery ?? 'summary'
  );
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const selectedSubject = subjectOptions.find((s) => s.name === subject);

  const generate = async () => {
    if (!subject || !topic.trim()) {
      setError(t('errors.required'));
      return;
    }

    setLoading(true);
    setError('');
    setGenerated(null);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/shift-ai/content-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, topic, contentType, examBoard }),
      });

      const data = (await res.json()) as { content?: GeneratedContent; error?: string };
      if (!res.ok || !data.content) {
        throw new Error(data.error || t('errors.generateFailed'));
      }

      setGenerated(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const saveToNotes = async () => {
    if (!generated || !selectedSubject?.dbId) {
      setError(t('errors.noSubjectRecord'));
      return;
    }

    setSaving(true);
    setError('');
    setSaveStatus('idle');

    try {
      const formatted = formatContentForNotes(generated, topic);
      const existing = notesBySubjectId[selectedSubject.dbId] ?? '';
      const nextContent = existing.trim()
        ? `${existing.trim()}\n\n---\n\n${formatted}`
        : formatted;

      const res = await fetch('/api/shift-ai/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectId: selectedSubject.dbId,
          content: nextContent,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || t('errors.saveFailed'));

      notesBySubjectId[selectedSubject.dbId] = nextContent;
      setSaveStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>✨</span> {t('title')}
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          {typeFromQuery === 'practice_questions'
            ? lockedSubject
              ? t('subtitlePracticeSubject', { subject: lockedSubject })
              : t('subtitlePractice')
            : t('subtitle', {
                yearGroup,
                curriculum: normalizeCurriculum(curriculum).toUpperCase(),
              })}
        </p>
      </div>

      <div className={`${SA.cardPadded} space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="cg-subject" className={`block text-sm font-medium ${SA.text}`}>
              {t('subject')}
            </label>
            <select
              id="cg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={SA.select}
              disabled={loading || Boolean(lockedSubject)}
            >
              {subjectOptions.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="cg-board" className={`block text-sm font-medium ${SA.text}`}>
              {t('examBoard')} <span className={SA.muted}>{t('optional')}</span>
            </label>
            <select
              id="cg-board"
              value={examBoard}
              onChange={(e) => setExamBoard(e.target.value)}
              className={SA.select}
              disabled={loading}
            >
              {boards.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="cg-topic" className={`block text-sm font-medium ${SA.text}`}>
            {t('topic')}
          </label>
          <input
            id="cg-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={SA.input}
            placeholder={t('topicPlaceholder')}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <p className={`text-sm font-medium ${SA.text}`}>{t('contentType')}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setContentType(type.id)}
                className={`rounded-xl border p-3 text-start transition-colors ${
                  contentType === type.id
                    ? 'border-[var(--sa-navy-600)] bg-[var(--sa-navy-50)]'
                    : 'border-[var(--sa-navy-100)] hover:border-[var(--sa-navy-200)]'
                }`}
              >
                <span className="text-lg" aria-hidden>
                  {type.emoji}
                </span>
                <p className={`mt-1 text-sm font-semibold ${SA.text}`}>{t(`types.${type.id}.label`)}</p>
                <p className={`mt-0.5 text-xs ${SA.muted}`}>{t(`types.${type.id}.desc`)}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading || !topic.trim() || subjectOptions.length === 0}
          className={`${SA.btnPrimary} h-11 w-full`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('generating')}
            </>
          ) : (
            t('generate')
          )}
        </button>
      </div>

      {error ? <div className={SA.error}>{error}</div> : null}

      {generated ? (
        <div className={`${SA.cardPadded} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-bold ${SA.text}`}>{topic}</p>
            <button
              type="button"
              onClick={() => void saveToNotes()}
              disabled={saving}
              className={`${SA.btnSecondary} inline-flex items-center gap-2`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveStatus === 'saved' ? t('savedToNotes') : t('saveToNotes')}
            </button>
          </div>
          {renderContent(generated, t)}
        </div>
      ) : null}
    </div>
  );
}
