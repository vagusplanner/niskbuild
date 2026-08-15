'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Loader2, Sparkles } from 'lucide-react';
import {
  EXAM_BOARDS,
  EXAM_LEVELS,
  normalizeCurriculum,
} from '@/lib/shift-ai/essay-curriculum';
import type { WorkshopLiveFeedback, WorkshopOutline } from '@/lib/shift-ai/essay-workshop-shared';
import { buildOutlineScaffold, wordCount } from '@/lib/shift-ai/essay-workshop-shared';
import type { ShiftCurriculum } from '@/lib/shift-ai/constants';
import { SA } from '@/lib/shift-ai/theme';

type Step = 'setup' | 'outline' | 'draft' | 'feedback';

const STEPS: Step[] = ['setup', 'outline', 'draft', 'feedback'];

export default function ShiftAiEssayWorkshopClient({
  subjectOptions,
  curriculum,
}: {
  subjectOptions: string[];
  curriculum: ShiftCurriculum;
}) {
  const t = useTranslations('essayWorkshop');
  const boards = EXAM_BOARDS[curriculum] ?? EXAM_BOARDS.uk;
  const levels = EXAM_LEVELS[curriculum] ?? EXAM_LEVELS.uk;

  const [step, setStep] = useState<Step>('setup');
  const [subject, setSubject] = useState(subjectOptions[0] ?? '');
  const [examBoard, setExamBoard] = useState(boards[0] ?? '');
  const [level, setLevel] = useState(levels[0] ?? '');
  const [prompt, setPrompt] = useState('');
  const [wordTarget, setWordTarget] = useState(800);
  const [outline, setOutline] = useState<WorkshopOutline | null>(null);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<WorkshopLiveFeedback | null>(null);
  const [essayId, setEssayId] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const saveDraft = useCallback(
    async (content: string, currentEssayId: string) => {
      if (!subject) return;
      setSaveStatus('saving');
      try {
        const res = await fetch('/api/shift-ai/essay-workshop/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            essayId: currentEssayId || undefined,
            subject,
            title: prompt,
            content,
            aiFeedback: feedback,
          }),
        });
        const data = (await res.json()) as { essayId?: string; error?: string };
        if (!res.ok) throw new Error(data.error || t('errors.saveFailed'));
        if (data.essayId) setEssayId(data.essayId);
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    },
    [subject, prompt, feedback, t]
  );

  useEffect(() => {
    if (step !== 'draft' || !subject) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDraft(draftRef.current, essayId);
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draft, step, subject, essayId, saveDraft]);

  const generateOutline = async () => {
    if (!subject || !prompt.trim()) {
      setError(t('errors.requiredFields'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shift-ai/essay-workshop/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, examBoard, level, prompt, wordTarget }),
      });

      const data = (await res.json()) as { outline?: WorkshopOutline; error?: string };
      if (!res.ok || !data.outline) {
        throw new Error(data.error || t('errors.generateFailed'));
      }

      setOutline(data.outline);
      setDraft(buildOutlineScaffold(data.outline));
      setStep('outline');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const requestFeedback = async () => {
    if (!draft.trim()) {
      setError(t('errors.writeDraftFirst'));
      return;
    }

    setFeedbackLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shift-ai/essay-workshop/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          examBoard,
          level,
          prompt,
          wordTarget,
          draft,
          outline,
          essayId: essayId || undefined,
        }),
      });

      const data = (await res.json()) as {
        feedback?: WorkshopLiveFeedback;
        essayId?: string;
        error?: string;
      };
      if (!res.ok || !data.feedback) {
        throw new Error(data.error || t('errors.feedbackFailed'));
      }

      setFeedback(data.feedback);
      if (data.essayId) setEssayId(data.essayId);
      setStep('feedback');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.feedbackFailed'));
    } finally {
      setFeedbackLoading(false);
    }
  };

  const wc = wordCount(draft);
  const stepIndex = STEPS.findIndex((s) => s === step);

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>📝</span> {t('title')}
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          {t('subtitle', { curriculum: normalizeCurriculum(curriculum).toUpperCase() })}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--sa-navy-100)] pb-px">
        {STEPS.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => i <= stepIndex && setStep(id)}
            className={step === id ? SA.tabActive : SA.tab}
            disabled={i > stepIndex}
          >
            {i + 1}. {t(`steps.${id}`)}
          </button>
        ))}
      </div>

      {error ? <div className={SA.error}>{error}</div> : null}

      {step === 'setup' ? (
        <div className={`${SA.cardPadded} space-y-4`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="ws-subject" className={`block text-sm font-medium ${SA.text}`}>
                {t('subject')}
              </label>
              <select
                id="ws-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={SA.select}
              >
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="ws-board" className={`block text-sm font-medium ${SA.text}`}>
                {t('examBoard')}
              </label>
              <select
                id="ws-board"
                value={examBoard}
                onChange={(e) => setExamBoard(e.target.value)}
                className={SA.select}
              >
                {boards.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="ws-level" className={`block text-sm font-medium ${SA.text}`}>
                {t('level')}
              </label>
              <select
                id="ws-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className={SA.select}
              >
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="ws-target" className={`block text-sm font-medium ${SA.text}`}>
                {t('targetWordCount')}
              </label>
              <input
                id="ws-target"
                type="number"
                min={200}
                max={5000}
                value={wordTarget}
                onChange={(e) => setWordTarget(Number(e.target.value) || 800)}
                className={SA.input}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="ws-prompt" className={`block text-sm font-medium ${SA.text}`}>
              {t('essayQuestion')}
            </label>
            <textarea
              id="ws-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={`${SA.textarea} min-h-24`}
              placeholder={t('promptPlaceholder')}
            />
          </div>
          <button
            type="button"
            onClick={() => void generateOutline()}
            disabled={loading || !prompt.trim()}
            className={`${SA.btnPrimary} h-11 w-full`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('buildingOutline')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t('generateOutline')}
              </>
            )}
          </button>
        </div>
      ) : null}

      {step === 'outline' && outline ? (
        <div className="space-y-4">
          <div className={`${SA.cardPadded} space-y-4`}>
            <p className={`text-sm font-bold ${SA.text}`}>{t('thesis')}</p>
            <p className={`text-sm ${SA.text}`}>{outline.thesis}</p>

            <div>
              <p className={`text-sm font-bold ${SA.text}`}>{t('introduction')}</p>
              <ul className={`mt-2 list-inside list-disc text-sm ${SA.muted}`}>
                <li>{t('hook', { text: outline.introduction?.hook ?? '' })}</li>
                <li>{t('context', { text: outline.introduction?.context ?? '' })}</li>
                <li>{t('thesisLine', { text: outline.introduction?.thesis_sentence ?? '' })}</li>
              </ul>
            </div>

            {(outline.body_paragraphs ?? []).map((p, i) => (
              <div key={i}>
                <p className={`text-sm font-bold ${SA.text}`}>{t('paragraph', { n: i + 1 })}</p>
                <p className={`mt-1 text-sm ${SA.text}`}>{p.topic_sentence}</p>
                {p.arguments?.length ? (
                  <ul className={`mt-1 list-inside list-disc text-sm ${SA.muted}`}>
                    {p.arguments.map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}

            {outline.key_vocabulary?.length ? (
              <div>
                <p className={`text-sm font-bold ${SA.text}`}>{t('keyVocabulary')}</p>
                <p className={`mt-1 text-sm ${SA.muted}`}>{outline.key_vocabulary.join(', ')}</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setStep('draft')}
            className={`${SA.btnPrimary} h-11 w-full`}
          >
            {t('startDrafting')}
            <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </div>
      ) : null}

      {step === 'draft' || step === 'feedback' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`${SA.cardPadded} space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-bold ${SA.text}`}>{t('yourDraft')}</p>
              <span className={`text-xs ${SA.muted}`}>
                {t('wordCount', { count: wc, target: wordTarget })}
                {saveStatus === 'saving' ? t('saving') : null}
                {saveStatus === 'saved' ? t('saved') : null}
                {saveStatus === 'error' ? t('saveFailedStatus') : null}
              </span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className={`${SA.textarea} min-h-80`}
              placeholder={t('draftPlaceholder')}
            />
            {step === 'draft' ? (
              <button
                type="button"
                onClick={() => void requestFeedback()}
                disabled={feedbackLoading || !draft.trim()}
                className={`${SA.btnPrimary} h-11 w-full`}
              >
                {feedbackLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('gettingFeedback')}
                  </>
                ) : (
                  t('getLiveFeedback')
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep('draft')}
                className={`${SA.btnSecondary} w-full`}
              >
                {t('backToEditing')}
              </button>
            )}
          </div>

          <div className={`${SA.cardPadded} space-y-4`}>
            <p className={`text-sm font-bold ${SA.text}`}>{t('liveFeedback')}</p>
            {!feedback ? (
              <p className={`text-sm ${SA.muted}`}>{t('liveFeedbackHint')}</p>
            ) : (
              <>
                <p className={`text-sm font-medium text-[var(--sa-navy-700)]`}>
                  {feedback.encouragement}
                </p>
                <p className={`text-sm ${SA.text}`}>{feedback.progress_summary}</p>
                {feedback.outline_alignment ? (
                  <div className={SA.tip}>
                    <p className="text-xs font-bold uppercase tracking-wide">{t('outlineAlignment')}</p>
                    <p className="mt-1 text-sm">{feedback.outline_alignment}</p>
                  </div>
                ) : null}
                {feedback.word_count_note ? (
                  <p className={`text-xs ${SA.muted}`}>{feedback.word_count_note}</p>
                ) : null}
                {feedback.strengths?.length ? (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide text-emerald-700`}>
                      {t('strengths')}
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm">
                      {feedback.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {feedback.suggestions?.length ? (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide text-amber-700`}>
                      {t('suggestions')}
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm">
                      {feedback.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {feedback.next_steps?.length ? (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
                      {t('nextSteps')}
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm">
                      {feedback.next_steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void requestFeedback()}
                  disabled={feedbackLoading}
                  className={`${SA.btnSecondary} w-full`}
                >
                  {feedbackLoading ? t('refreshing') : t('refreshFeedback')}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
