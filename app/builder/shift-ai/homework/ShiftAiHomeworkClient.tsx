'use client';

import { useRef, useState } from 'react';
import {
  Camera,
  ChevronRight,
  Clock,
  Lightbulb,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { SA } from '@/lib/shift-ai/theme';

type AnalyzeResult = {
  uploadId: string;
  imageUrl: string;
  aiResponse: string;
  expiresAt: string;
};

function splitResponseSections(text: string): { title: string; body: string }[] {
  const lines = text.split('\n');
  const sections: { title: string; body: string }[] = [];
  let currentTitle = 'Step-by-step guidance';
  let currentLines: string[] = [];

  const flush = () => {
    const body = currentLines.join('\n').trim();
    if (body) {
      sections.push({ title: currentTitle, body });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/) || line.match(/^(\d+\.\s+[A-Z][^:]{0,60}:?)$/);
    if (heading && currentLines.length > 0) {
      flush();
      currentTitle = heading[1].replace(/:$/, '').trim();
      continue;
    }
    currentLines.push(line);
  }

  flush();

  if (sections.length === 0) {
    return [{ title: 'Step-by-step guidance', body: text.trim() }];
  }

  return sections;
}

export default function ShiftAiHomeworkClient({
  subjectOptions,
  yearGroup,
}: {
  subjectOptions: string[];
  yearGroup: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedSubject, setSelectedSubject] = useState(subjectOptions[0] ?? '');
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
    if (fileRef.current) {
      fileRef.current.value = '';
    }
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

  const analyseHomework = async () => {
    if (!selectedFile) return;

    setAnalysing(true);
    setError('');

    try {
      const form = new FormData();
      form.append('image', selectedFile);
      if (selectedSubject) {
        form.append('subject', selectedSubject);
      }

      const res = await fetch('/api/shift-ai/homework/analyze', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      const data = (await res.json()) as AnalyzeResult & { error?: string };

      if (!res.ok || !data.aiResponse) {
        throw new Error(data.error || 'Could not analyse homework');
      }

      setResult({
        uploadId: data.uploadId,
        imageUrl: data.imageUrl,
        aiResponse: data.aiResponse,
        expiresAt: data.expiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyse homework');
    } finally {
      setAnalysing(false);
    }
  };

  const handleExtendRetention = async () => {
    if (!result?.uploadId || retentionExtended) return;

    setExtending(true);
    setError('');

    try {
      const res = await fetch('/api/shift-ai/homework/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uploadId: result.uploadId, additionalDays: 7 }),
      });

      const data = (await res.json()) as { error?: string; expiresAt?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Could not extend photo retention');
      }

      setResult((prev) =>
        prev ? { ...prev, expiresAt: data.expiresAt ?? prev.expiresAt } : prev
      );
      setRetentionExtended(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not extend photo retention');
    } finally {
      setExtending(false);
    }
  };

  const sections = result ? splitResponseSections(result.aiResponse) : [];

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>📸</span> Snap Homework
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          Photograph any homework problem or worksheet — AI guides you through the reasoning step
          by step, tailored for {yearGroup}.
        </p>
      </div>

      {subjectOptions.length > 0 ? (
        <div className={`${SA.cardPadded} space-y-2`}>
          <label htmlFor="homework-subject" className={`block text-sm font-medium ${SA.text}`}>
            Subject <span className={SA.muted}>(optional)</span>
          </label>
          <select
            id="homework-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={SA.select}
            disabled={analysing}
          >
            <option value="">General</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!previewUrl ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--sa-navy-200)] bg-[var(--sa-secondary)] p-10 text-center">
          <p className="text-5xl" aria-hidden>
            📷
          </p>
          <p className={`mt-3 font-semibold ${SA.text}`}>Snap your homework</p>
          <p className={`mt-1 text-sm ${SA.muted}`}>
            Take a photo or upload an image — single problems and full worksheets both work.
          </p>
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
              src={result?.imageUrl ?? previewUrl}
              alt="Homework upload"
              className="max-h-72 w-full rounded-2xl border border-[var(--sa-navy-100)] bg-[var(--sa-secondary)] object-contain"
            />
            {!result ? (
              <button
                type="button"
                onClick={reset}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {!result ? (
            <button
              type="button"
              onClick={() => void analyseHomework()}
              disabled={analysing}
              className={`${SA.btnPrimary} h-12 w-full`}
            >
              {analysing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing homework…
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4" />
                  Analyse &amp; Guide Me
                </>
              )}
            </button>
          ) : null}
        </div>
      )}

      {error ? <div className={SA.error}>{error}</div> : null}

      {result ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--sa-navy-800)] p-5 text-white">
            <p className="text-xs uppercase tracking-wide text-white/50">AI tutor guidance</p>
            <p className="mt-1 text-sm text-white/80">
              Reveal each section below — try working through the steps yourself first.
            </p>
          </div>

          {sections.map((section, index) => (
            <div key={`${section.title}-${index}`} className={`${SA.cardPadded} space-y-2`}>
              <h3 className={`flex items-center gap-2 text-sm font-bold ${SA.text}`}>
                <ChevronRight className="h-4 w-4 text-[var(--sa-navy-600)]" />
                {section.title}
              </h3>
              <p className={`whitespace-pre-wrap text-sm leading-relaxed ${SA.text}`}>
                {section.body}
              </p>
            </div>
          ))}

          <div className={`${SA.tip} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}>
            <div className="flex items-start gap-2 text-sm">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--sa-navy-600)]" />
              <p>
                This photo will be automatically deleted in 48 hours
                {retentionExtended ? (
                  <span className="block text-xs opacity-80">
                    Retention extended — new expiry{' '}
                    {new Date(result.expiresAt).toLocaleDateString(undefined, {
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
                className={`${SA.link} whitespace-nowrap text-left font-semibold sm:text-right`}
              >
                {extending ? 'Extending…' : 'Ask parent to keep longer →'}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={reset}
            className={`${SA.btnSecondary} inline-flex w-full items-center justify-center gap-2`}
          >
            <RotateCcw className="h-4 w-4" />
            Snap another problem
          </button>
        </div>
      ) : null}
    </div>
  );
}
