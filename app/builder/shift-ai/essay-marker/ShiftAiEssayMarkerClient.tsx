'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  PenLine,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import {
  EXAM_BOARDS,
  EXAM_LEVELS,
  normalizeCurriculum,
} from '@/lib/shift-ai/essay-curriculum';
import type { EssayMarkerFeedback } from '@/lib/shift-ai/essay-marker-shared';
import {
  STRUCTURE_RATING_STYLES,
  gradeColor,
} from '@/lib/shift-ai/essay-marker-shared';
import type { ShiftCurriculum } from '@/lib/shift-ai/constants';
import { SA } from '@/lib/shift-ai/theme';

type AnalyzeResult = {
  essayId: string;
  essayText: string;
  feedback: EssayMarkerFeedback;
  photoUploadId?: string | null;
  photoImageUrl?: string | null;
  photoExpiresAt?: string | null;
};

function ExpandableSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={SA.card}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <span className={`text-sm font-bold ${SA.text}`}>{title}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-[var(--sa-navy-500)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="border-t border-[var(--sa-navy-100)] px-5 pb-5 pt-4">{children}</div> : null}
    </div>
  );
}

function AnnotatedEssay({ essayText, feedback }: { essayText: string; feedback: EssayMarkerFeedback }) {
  const annotated = useMemo(() => {
    const annotations = feedback.annotations ?? [];
    if (annotations.length === 0) {
      return [{ text: essayText, comment: null as string | null }];
    }

    const segments: { text: string; comment: string | null }[] = [];
    let remaining = essayText;

    for (const ann of annotations) {
      const excerpt = ann.excerpt?.trim();
      if (!excerpt) continue;
      const idx = remaining.toLowerCase().indexOf(excerpt.toLowerCase());
      if (idx === -1) continue;

      if (idx > 0) {
        segments.push({ text: remaining.slice(0, idx), comment: null });
      }
      segments.push({
        text: remaining.slice(idx, idx + excerpt.length),
        comment: ann.comment,
      });
      remaining = remaining.slice(idx + excerpt.length);
    }

    if (remaining) {
      segments.push({ text: remaining, comment: null });
    }

    return segments.length > 0 ? segments : [{ text: essayText, comment: null }];
  }, [essayText, feedback.annotations]);

  return (
    <div className={`${SA.textarea} min-h-[12rem] bg-[var(--sa-secondary)]`}>
      {annotated.map((seg, i) =>
        seg.comment ? (
          <span
            key={i}
            className="cursor-help border-b-2 border-dashed border-amber-400 bg-amber-50"
            title={seg.comment}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </div>
  );
}

export default function ShiftAiEssayMarkerClient({
  subjectOptions,
  curriculum,
  yearGroup,
}: {
  subjectOptions: string[];
  curriculum: ShiftCurriculum;
  yearGroup: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const boards = EXAM_BOARDS[curriculum] ?? EXAM_BOARDS.uk;
  const levels = EXAM_LEVELS[curriculum] ?? EXAM_LEVELS.uk;

  const [inputMode, setInputMode] = useState<'typed' | 'photo'>('typed');
  const [subject, setSubject] = useState(subjectOptions[0] ?? '');
  const [examBoard, setExamBoard] = useState(boards[0] ?? '');
  const [level, setLevel] = useState(levels[0] ?? '');
  const [questionText, setQuestionText] = useState('');
  const [essayText, setEssayText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [retentionExtended, setRetentionExtended] = useState(false);

  const reset = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setResult(null);
    setError('');
    setRetentionExtended(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    setRetentionExtended(false);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const markEssay = async () => {
    if (!subject || !examBoard || !level) {
      setError('Subject, exam board, and level are required');
      return;
    }

    if (inputMode === 'typed' && !essayText.trim()) {
      setError('Please paste or type your essay');
      return;
    }
    if (inputMode === 'photo' && !selectedFile) {
      setError('Please take or upload a photo of your essay');
      return;
    }

    setAnalysing(true);
    setError('');

    try {
      let res: Response;

      if (inputMode === 'photo' && selectedFile) {
        const form = new FormData();
        form.append('image', selectedFile);
        form.append('subject', subject);
        form.append('examBoard', examBoard);
        form.append('level', level);
        if (questionText.trim()) form.append('questionText', questionText.trim());

        res = await fetch('/api/shift-ai/essay-marker/analyze', {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
      } else {
        res = await fetch('/api/shift-ai/essay-marker/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            essayText,
            subject,
            examBoard,
            level,
            questionText: questionText.trim() || undefined,
          }),
        });
      }

      const data = (await res.json()) as AnalyzeResult & { error?: string };
      if (!res.ok || !data.feedback) {
        throw new Error(data.error || 'Could not mark essay');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark essay');
    } finally {
      setAnalysing(false);
    }
  };

  const handleExtendRetention = async () => {
    if (!result?.photoUploadId || retentionExtended) return;

    setExtending(true);
    setError('');

    try {
      const res = await fetch('/api/shift-ai/homework/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uploadId: result.photoUploadId, additionalDays: 7 }),
      });

      const data = (await res.json()) as { error?: string; expiresAt?: string };
      if (!res.ok) throw new Error(data.error || 'Could not extend photo retention');

      setResult((prev) =>
        prev
          ? { ...prev, photoExpiresAt: data.expiresAt ?? prev.photoExpiresAt }
          : prev
      );
      setRetentionExtended(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not extend photo retention');
    } finally {
      setExtending(false);
    }
  };

  const feedback = result?.feedback;
  const displayEssay = result?.essayText ?? essayText;

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>✍️</span> Essay Marker
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          Get examiner-style feedback on your essay — typed or photographed — aligned to your{' '}
          {normalizeCurriculum(curriculum).toUpperCase()} curriculum ({yearGroup}).
        </p>
      </div>

      {!result ? (
        <>
          <div className={`${SA.cardPadded} grid gap-4 sm:grid-cols-2`}>
            <div className="space-y-2">
              <label htmlFor="marker-subject" className={`block text-sm font-medium ${SA.text}`}>
                Subject
              </label>
              <select
                id="marker-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={SA.select}
                disabled={analysing}
              >
                {subjectOptions.length === 0 ? (
                  <option value="">Add subjects in onboarding</option>
                ) : (
                  subjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="marker-board" className={`block text-sm font-medium ${SA.text}`}>
                Exam board
              </label>
              <select
                id="marker-board"
                value={examBoard}
                onChange={(e) => setExamBoard(e.target.value)}
                className={SA.select}
                disabled={analysing}
              >
                {boards.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="marker-level" className={`block text-sm font-medium ${SA.text}`}>
                Level
              </label>
              <select
                id="marker-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className={SA.select}
                disabled={analysing}
              >
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="marker-question" className={`block text-sm font-medium ${SA.text}`}>
                Essay question <span className={SA.muted}>(optional)</span>
              </label>
              <input
                id="marker-question"
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className={SA.input}
                placeholder="e.g. How does the author present conflict?"
                disabled={analysing}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode('typed')}
              className={inputMode === 'typed' ? SA.tabActive : SA.tab}
            >
              <PenLine className="h-3.5 w-3.5" />
              Type essay
            </button>
            <button
              type="button"
              onClick={() => setInputMode('photo')}
              className={inputMode === 'photo' ? SA.tabActive : SA.tab}
            >
              <Camera className="h-3.5 w-3.5" />
              Photo essay
            </button>
          </div>

          {inputMode === 'typed' ? (
            <div className={`${SA.cardPadded} space-y-2`}>
              <label htmlFor="marker-essay" className={`block text-sm font-medium ${SA.text}`}>
                Your essay
              </label>
              <textarea
                id="marker-essay"
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                className={`${SA.textarea} min-h-56`}
                placeholder="Paste or type your full essay here…"
                disabled={analysing}
              />
            </div>
          ) : !previewUrl ? (
            <div className="rounded-2xl border-2 border-dashed border-[var(--sa-navy-200)] bg-[var(--sa-secondary)] p-10 text-center">
              <p className="text-5xl" aria-hidden>
                📷
              </p>
              <p className={`mt-3 font-semibold ${SA.text}`}>Photograph your handwritten essay</p>
              <p className={`mt-1 text-sm ${SA.muted}`}>
                We&apos;ll transcribe it with AI, then mark it like an examiner would.
              </p>
              <div className={`${SA.tip} mx-auto mt-4 max-w-md text-left`}>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--sa-navy-600)]" />
                  <p>Essay photos are automatically deleted after 48 hours.</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`${SA.btnPrimary} h-11 px-5`}
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`${SA.btnSecondary} inline-flex h-11 items-center gap-2 px-5`}
                >
                  <Upload className="h-4 w-4" />
                  Upload Image
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Essay upload"
                  className="max-h-72 w-full rounded-2xl border border-[var(--sa-navy-100)] bg-[var(--sa-secondary)] object-contain"
                />
                <button
                  type="button"
                  onClick={reset}
                  className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void markEssay()}
            disabled={analysing || subjectOptions.length === 0}
            className={`${SA.btnPrimary} h-12 w-full`}
          >
            {analysing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {inputMode === 'photo' ? 'Transcribing & marking…' : 'Marking essay…'}
              </>
            ) : (
              'Mark my essay'
            )}
          </button>
        </>
      ) : null}

      {error ? <div className={SA.error}>{error}</div> : null}

      {feedback ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--sa-navy-800)] p-6 text-center text-white">
            <p className="text-xs uppercase tracking-wide text-white/50">Estimated grade</p>
            <p className={`mt-1 text-4xl font-extrabold ${gradeColor(feedback.grade_estimate)}`}>
              {feedback.grade_estimate}
            </p>
            {feedback.overall_mark ? (
              <p className="mt-1 text-sm text-white/70">{feedback.overall_mark}</p>
            ) : null}
            {feedback.grade_boundary ? (
              <p className="text-xs text-white/50">{feedback.grade_boundary}</p>
            ) : null}
            <p className="mt-3 text-sm leading-relaxed text-white/85">{feedback.overall_comment}</p>
          </div>

          <ExpandableSection title="Assessment objectives" defaultOpen>
            <div className="space-y-4">
              {(feedback.assessment_objectives ?? []).map((ao, i) => (
                <div key={i} className="rounded-xl border border-[var(--sa-navy-100)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-bold ${SA.text}`}>{ao.name}</p>
                    <span className={SA.badge}>
                      {ao.marks_awarded}/{ao.marks_available}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm ${SA.text}`}>{ao.comment}</p>
                  {ao.strengths?.length ? (
                    <ul className={`mt-2 list-inside list-disc text-sm text-emerald-700`}>
                      {ao.strengths.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                  {ao.improvements?.length ? (
                    <ul className={`mt-2 list-inside list-disc text-sm text-amber-700`}>
                      {ao.improvements.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Line-by-line annotations">
            <p className={`mb-3 text-xs ${SA.muted}`}>
              Highlighted phrases show examiner comments — hover to read.
            </p>
            <AnnotatedEssay essayText={displayEssay} feedback={feedback} />
            {(feedback.annotations ?? []).length > 0 ? (
              <ul className="mt-4 space-y-2">
                {feedback.annotations.map((ann, i) => (
                  <li key={i} className={`text-sm ${SA.text}`}>
                    <span className="font-medium text-amber-700">&ldquo;{ann.excerpt}&rdquo;</span>
                    <span className={SA.muted}> — </span>
                    {ann.comment}
                  </li>
                ))}
              </ul>
            ) : null}
          </ExpandableSection>

          <ExpandableSection title="Structural critique">
            <div className="grid gap-3 sm:grid-cols-2">
              {(['introduction', 'arguments', 'evidence', 'conclusion'] as const).map((key) => {
                const section = feedback.structural_critique?.[key];
                if (!section) return null;
                const style =
                  STRUCTURE_RATING_STYLES[section.rating] ??
                  'border-[var(--sa-navy-100)] bg-[var(--sa-secondary)] text-[var(--sa-navy-700)]';
                return (
                  <div key={key} className={`rounded-xl border p-3 ${style}`}>
                    <p className="text-xs font-bold uppercase tracking-wide">{key}</p>
                    <p className="mt-1 text-sm font-semibold capitalize">{section.rating}</p>
                    {section.comment ? <p className="mt-1 text-sm">{section.comment}</p> : null}
                  </div>
                );
              })}
            </div>
            {feedback.structural_critique?.overall_comment ? (
              <p className={`mt-4 text-sm ${SA.text}`}>
                {feedback.structural_critique.overall_comment}
              </p>
            ) : null}
            {feedback.structural_critique?.improvements?.length ? (
              <ul className={`mt-3 list-inside list-disc text-sm ${SA.text}`}>
                {feedback.structural_critique.improvements.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : null}
          </ExpandableSection>

          <ExpandableSection title="Rewrite suggestions">
            <ul className={`list-inside list-disc space-y-2 text-sm ${SA.text}`}>
              {(feedback.rewrite_suggestions ?? []).map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
            {feedback.examiner_tip ? (
              <p className={`${SA.tip} mt-4`}>
                <strong>Examiner tip:</strong> {feedback.examiner_tip}
              </p>
            ) : null}
          </ExpandableSection>

          {result?.photoUploadId ? (
            <div className={`${SA.tip} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="flex items-start gap-2 text-sm">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--sa-navy-600)]" />
                <p>
                  This essay photo will be automatically deleted in 48 hours
                  {retentionExtended && result.photoExpiresAt ? (
                    <span className="block text-xs opacity-80">
                      Retention extended — new expiry{' '}
                      {new Date(result.photoExpiresAt).toLocaleDateString(undefined, {
                        dateStyle: 'medium',
                      })}
                    </span>
                  ) : null}
                </p>
              </div>
              {!retentionExtended ? (
                <button
                  type="button"
                  onClick={() => void handleExtendRetention()}
                  disabled={extending}
                  className={`${SA.link} whitespace-nowrap font-semibold`}
                >
                  {extending ? 'Extending…' : 'Ask parent to keep longer →'}
                </button>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setResult(null);
              reset();
            }}
            className={`${SA.btnSecondary} inline-flex w-full items-center justify-center gap-2`}
          >
            <RotateCcw className="h-4 w-4" />
            Mark another essay
          </button>
        </div>
      ) : null}
    </div>
  );
}
