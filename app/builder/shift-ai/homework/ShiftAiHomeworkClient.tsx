'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
import { splitResponseSections } from '@/lib/shift-ai/homework-sections';

type AnalyzeResult = {
  uploadId: string;
  imageUrl: string;
  aiResponse: string;
  expiresAt: string;
};

export default function ShiftAiHomeworkClient({
  subjectOptions,
  yearGroup,
}: {
  subjectOptions: string[];
  yearGroup: string;
}) {
  const t = useTranslations('homework');
  const locale = useLocale();
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
        throw new Error(data.error || t('errors.analyse'));
      }

      setResult({
        uploadId: data.uploadId,
        imageUrl: data.imageUrl,
        aiResponse: data.aiResponse,
        expiresAt: data.expiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.analyse'));
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
        throw new Error(data.error || t('errors.extend'));
      }

      setResult((prev) =>
        prev ? { ...prev, expiresAt: data.expiresAt ?? prev.expiresAt } : prev
      );
      setRetentionExtended(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.extend'));
    } finally {
      setExtending(false);
    }
  };

  const sections = result ? splitResponseSections(result.aiResponse, t('defaultSection')) : [];

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>📸</span> {t('title')}
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          {t('subtitle', { yearGroup })}
        </p>
      </div>

      {subjectOptions.length > 0 ? (
        <div className={`${SA.cardPadded} space-y-2`}>
          <label htmlFor="homework-subject" className={`block text-sm font-medium ${SA.text}`}>
            {t('subject')} <span className={SA.muted}>{t('optional')}</span>
          </label>
          <select
            id="homework-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={SA.select}
            disabled={analysing}
          >
            <option value="">{t('general')}</option>
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
          <p className={`mt-3 font-semibold ${SA.text}`}>{t('snapTitle')}</p>
          <p className={`mt-1 text-sm ${SA.muted}`}>{t('snapHint')}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`${SA.btnPrimary} h-11 px-5`}
            >
              <Camera className="h-4 w-4" />
              {t('takePhoto')}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`${SA.btnSecondary} inline-flex h-11 items-center gap-2 px-5`}
            >
              <Upload className="h-4 w-4" />
              {t('uploadImage')}
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
              alt={t('homeworkAlt')}
              className="max-h-72 w-full rounded-2xl border border-[var(--sa-navy-100)] bg-[var(--sa-secondary)] object-contain"
            />
            {!result ? (
              <button
                type="button"
                onClick={reset}
                className="absolute end-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label={t('removePhoto')}
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
                  {t('analysing')}
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4" />
                  {t('analyseGuide')}
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
            <p className="text-xs uppercase tracking-wide text-white/50">{t('guidanceKicker')}</p>
            <p className="mt-1 text-sm text-white/80">{t('revealHint')}</p>
          </div>

          {sections.map((section, index) => (
            <div key={`${section.title}-${index}`} className={`${SA.cardPadded} space-y-2`}>
              <h3 className={`flex items-center gap-2 text-sm font-bold ${SA.text}`}>
                <ChevronRight className="h-4 w-4 text-[var(--sa-navy-600)] rtl:-scale-x-100" />
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
                {t('deleted48')}
                {retentionExtended ? (
                  <span className="block text-xs opacity-80">
                    {t('retentionExtended', {
                      date: new Date(result.expiresAt).toLocaleDateString(
                        locale === 'ar' ? 'ar' : 'en',
                        { dateStyle: 'medium' }
                      ),
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
                className={`${SA.link} whitespace-nowrap text-start font-semibold sm:text-end`}
              >
                {extending ? t('extending') : t('askParentKeep')}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={reset}
            className={`${SA.btnSecondary} inline-flex w-full items-center justify-center gap-2`}
          >
            <RotateCcw className="h-4 w-4" />
            {t('snapAnother')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
