'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

const STEPS: { id: Step; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'outline', label: 'Outline' },
  { id: 'draft', label: 'Draft' },
  { id: 'feedback', label: 'Feedback' },
];

export default function ShiftAiEssayWorkshopClient({
  subjectOptions,
  curriculum,
}: {
  subjectOptions: string[];
  curriculum: ShiftCurriculum;
}) {
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
        if (!res.ok) throw new Error(data.error || 'Could not save draft');
        if (data.essayId) setEssayId(data.essayId);
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    },
    [subject, prompt, feedback]
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
      setError('Subject and essay question are required');
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
        throw new Error(data.error || 'Could not generate outline');
      }

      setOutline(data.outline);
      setDraft(buildOutlineScaffold(data.outline));
      setStep('outline');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate outline');
    } finally {
      setLoading(false);
    }
  };

  const requestFeedback = async () => {
    if (!draft.trim()) {
      setError('Write some of your draft first');
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
        throw new Error(data.error || 'Could not get feedback');
      }

      setFeedback(data.feedback);
      if (data.essayId) setEssayId(data.essayId);
      setStep('feedback');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const wc = wordCount(draft);
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>📝</span> Essay Workshop
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          Plan, draft, and refine your essay with encouraging in-progress coaching —{' '}
          {normalizeCurriculum(curriculum).toUpperCase()} curriculum.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--sa-navy-100)] pb-px">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => i <= stepIndex && setStep(s.id)}
            className={step === s.id ? SA.tabActive : SA.tab}
            disabled={i > stepIndex}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      {error ? <div className={SA.error}>{error}</div> : null}

      {step === 'setup' ? (
        <div className={`${SA.cardPadded} space-y-4`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="ws-subject" className={`block text-sm font-medium ${SA.text}`}>
                Subject
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
                Exam board
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
                Level
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
                Target word count
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
              Essay question
            </label>
            <textarea
              id="ws-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={`${SA.textarea} min-h-24`}
              placeholder="What is your essay about?"
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
                Building outline…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate outline
              </>
            )}
          </button>
        </div>
      ) : null}

      {step === 'outline' && outline ? (
        <div className="space-y-4">
          <div className={`${SA.cardPadded} space-y-4`}>
            <p className={`text-sm font-bold ${SA.text}`}>Thesis</p>
            <p className={`text-sm ${SA.text}`}>{outline.thesis}</p>

            <div>
              <p className={`text-sm font-bold ${SA.text}`}>Introduction</p>
              <ul className={`mt-2 list-inside list-disc text-sm ${SA.muted}`}>
                <li>Hook: {outline.introduction?.hook}</li>
                <li>Context: {outline.introduction?.context}</li>
                <li>Thesis: {outline.introduction?.thesis_sentence}</li>
              </ul>
            </div>

            {(outline.body_paragraphs ?? []).map((p, i) => (
              <div key={i}>
                <p className={`text-sm font-bold ${SA.text}`}>Paragraph {i + 1}</p>
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
                <p className={`text-sm font-bold ${SA.text}`}>Key vocabulary</p>
                <p className={`mt-1 text-sm ${SA.muted}`}>{outline.key_vocabulary.join(', ')}</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setStep('draft')}
            className={`${SA.btnPrimary} h-11 w-full`}
          >
            Start drafting
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {step === 'draft' || step === 'feedback' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`${SA.cardPadded} space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-bold ${SA.text}`}>Your draft</p>
              <span className={`text-xs ${SA.muted}`}>
                {wc} / {wordTarget} words
                {saveStatus === 'saving' ? ' · Saving…' : null}
                {saveStatus === 'saved' ? ' · Saved' : null}
                {saveStatus === 'error' ? ' · Save failed' : null}
              </span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className={`${SA.textarea} min-h-80`}
              placeholder="Expand your outline into a full essay…"
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
                    Getting feedback…
                  </>
                ) : (
                  'Get live feedback'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep('draft')}
                className={`${SA.btnSecondary} w-full`}
              >
                Back to editing
              </button>
            )}
          </div>

          <div className={`${SA.cardPadded} space-y-4`}>
            <p className={`text-sm font-bold ${SA.text}`}>Live feedback</p>
            {!feedback ? (
              <p className={`text-sm ${SA.muted}`}>
                Write your draft and tap &ldquo;Get live feedback&rdquo; for encouraging coaching —
                no final grade.
              </p>
            ) : (
              <>
                <p className={`text-sm font-medium text-[var(--sa-navy-700)]`}>
                  {feedback.encouragement}
                </p>
                <p className={`text-sm ${SA.text}`}>{feedback.progress_summary}</p>
                {feedback.outline_alignment ? (
                  <div className={SA.tip}>
                    <p className="text-xs font-bold uppercase tracking-wide">Outline alignment</p>
                    <p className="mt-1 text-sm">{feedback.outline_alignment}</p>
                  </div>
                ) : null}
                {feedback.word_count_note ? (
                  <p className={`text-xs ${SA.muted}`}>{feedback.word_count_note}</p>
                ) : null}
                {feedback.strengths?.length ? (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide text-emerald-700`}>
                      Strengths
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
                      Suggestions
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
                      Next steps
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
                  {feedbackLoading ? 'Refreshing…' : 'Refresh feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
