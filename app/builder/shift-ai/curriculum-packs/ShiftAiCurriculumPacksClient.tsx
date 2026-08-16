'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Download, Loader2, Sparkles } from 'lucide-react';
import {
  EXAM_BOARDS,
  normalizeCurriculum,
} from '@/lib/shift-ai/essay-curriculum';
import type { ShiftCurriculum } from '@/lib/shift-ai/constants';
import type { CurriculumPack } from '@/lib/shift-ai/curriculum-packs-shared';
import {
  PACK_TYPES,
  formatPackForPrint,
  type PackType,
} from '@/lib/shift-ai/curriculum-packs-shared';
import { SA } from '@/lib/shift-ai/theme';

const PACK_TYPE_KEYS = {
  'Full Topic Summary': 'fullTopicSummary',
  'Key Facts & Definitions': 'keyFacts',
  'Common Exam Questions': 'commonExamQuestions',
  'Worked Examples': 'workedExamples',
  'Mind Map Guide': 'mindMapGuide',
} as const;

function packTypeI18nKey(type: string): string | null {
  if ((PACK_TYPES as readonly string[]).includes(type)) {
    return `packTypes.${PACK_TYPE_KEYS[type as PackType]}`;
  }
  return null;
}

function PackViewer({ pack, onPrint }: { pack: CurriculumPack; onPrint: () => void }) {
  const t = useTranslations('curriculumPacks');
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--sa-navy-800)] p-6 text-white">
        <p className="text-xs uppercase tracking-wide text-white/50">
          {pack.content.exam_board || pack.curriculum.toUpperCase()} ·{' '}
          {(() => {
            const key = pack.content.pack_type ? packTypeI18nKey(pack.content.pack_type) : null;
            if (!pack.content.pack_type) return t('revisionPack');
            if (key === 'packTypes.fullTopicSummary') return t('packTypes.fullTopicSummary');
            if (key === 'packTypes.keyFacts') return t('packTypes.keyFacts');
            if (key === 'packTypes.commonExamQuestions') return t('packTypes.commonExamQuestions');
            if (key === 'packTypes.workedExamples') return t('packTypes.workedExamples');
            if (key === 'packTypes.mindMapGuide') return t('packTypes.mindMapGuide');
            return pack.content.pack_type;
          })()}
        </p>
        <h2 className="mt-1 text-xl font-bold">{pack.title}</h2>
        {pack.content.overview ? (
          <p className="mt-2 text-sm leading-relaxed text-white/85">{pack.content.overview}</p>
        ) : null}
        <button
          type="button"
          onClick={onPrint}
          className={`${SA.btnSecondary} mt-4 inline-flex items-center gap-2 bg-white/10 text-white hover:bg-white/20`}
        >
          <Download className="h-4 w-4" />
          {t('printSave')}
        </button>
      </div>

      {pack.content.sections.map((section, i) => (
        <div key={i} className={SA.card}>
          <button
            type="button"
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="flex w-full items-center justify-between gap-2 px-5 py-4 text-start"
          >
            <span className={`text-sm font-bold ${SA.text}`}>{section.title}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded === i ? 'rotate-180' : ''}`}
            />
          </button>
          {expanded === i ? (
            <div className="border-t border-[var(--sa-navy-100)] px-5 pb-5 pt-4 space-y-3">
              <p className={`text-sm leading-relaxed ${SA.text}`}>{section.content}</p>
              {section.key_points?.length ? (
                <ul className={`list-inside list-disc text-sm ${SA.text}`}>
                  {section.key_points.map((kp, j) => (
                    <li key={j}>{kp}</li>
                  ))}
                </ul>
              ) : null}
              {section.exam_tip ? (
                <div className={SA.tip}>
                  <p className="text-xs font-bold uppercase tracking-wide">{t('examTip')}</p>
                  <p className="mt-1 text-sm">{section.exam_tip}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}

      {pack.content.practice_questions?.length ? (
        <div className={`${SA.cardPadded}`}>
          <p className={`text-sm font-bold ${SA.text}`}>{t('practiceQuestions')}</p>
          <ol className={`mt-3 list-inside list-decimal space-y-2 text-sm ${SA.text}`}>
            {pack.content.practice_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export default function ShiftAiCurriculumPacksClient({
  subjectOptions,
  curriculum,
  yearGroup,
  initialPacks,
}: {
  subjectOptions: string[];
  curriculum: ShiftCurriculum;
  yearGroup: string;
  initialPacks: CurriculumPack[];
}) {
  const t = useTranslations('curriculumPacks');
  const boards = EXAM_BOARDS[curriculum] ?? EXAM_BOARDS.uk;

  const [packs, setPacks] = useState(initialPacks);
  const [subject, setSubject] = useState(subjectOptions[0] ?? '');
  const [examBoard, setExamBoard] = useState(boards[0] ?? '');
  const [packType, setPackType] = useState<string>(PACK_TYPES[0]);
  const [topic, setTopic] = useState('');
  const [selectedPack, setSelectedPack] = useState<CurriculumPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reusedNotice, setReusedNotice] = useState('');

  const subjectPacks = useMemo(
    () => (subject ? packs.filter((p) => p.subject === subject) : packs),
    [packs, subject]
  );

  const hasPackForTopic = useMemo(() => {
    if (!subject || !topic.trim()) return false;
    return packs.some(
      (p) =>
        p.subject === subject &&
        p.title.toLowerCase() === topic.trim().toLowerCase()
    );
  }, [packs, subject, topic]);

  const generate = async () => {
    if (!subject || !topic.trim()) {
      setError(t('errors.required'));
      return;
    }

    setLoading(true);
    setError('');
    setReusedNotice('');

    try {
      const res = await fetch('/api/shift-ai/curriculum-packs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, topic, packType, examBoard }),
      });

      const data = (await res.json()) as {
        pack?: CurriculumPack;
        reused?: boolean;
        error?: string;
      };

      if (!res.ok || !data.pack) {
        throw new Error(data.error || t('errors.generateFailed'));
      }

      setPacks((prev) => {
        const without = prev.filter((p) => p.id !== data.pack!.id);
        return [data.pack!, ...without];
      });
      setSelectedPack(data.pack);
      if (data.reused) {
        setReusedNotice(t('reusedNotice'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedPack) return;
    const text = formatPackForPrint(selectedPack);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<pre style="font-family:system-ui;padding:24px;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</pre>`);
    win.document.close();
    win.print();
  };

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>📚</span> {t('title')}
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          {t('subtitle', {
            yearGroup,
            curriculum: normalizeCurriculum(curriculum).toUpperCase(),
          })}
        </p>
      </div>

      <div className={`${SA.cardPadded} space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="cp-subject" className={`block text-sm font-medium ${SA.text}`}>
              {t('subject')}
            </label>
            <select
              id="cp-subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setSelectedPack(null);
              }}
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
            <label htmlFor="cp-board" className={`block text-sm font-medium ${SA.text}`}>
              {t('examBoard')}
            </label>
            <select
              id="cp-board"
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
        </div>

        <div className="space-y-2">
          <p className={`text-sm font-medium ${SA.text}`}>{t('packType')}</p>
          <div className="flex flex-wrap gap-2">
            {PACK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPackType(type)}
                className={
                  packType === type
                    ? `${SA.tabActive} rounded-lg px-3 py-1.5`
                    : `${SA.tab} rounded-lg border border-[var(--sa-navy-100)] px-3 py-1.5`
                }
              >
                {t(`packTypes.${PACK_TYPE_KEYS[type]}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="cp-topic" className={`block text-sm font-medium ${SA.text}`}>
            {t('topic')}
          </label>
          <input
            id="cp-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('topicPlaceholder')}
            className={SA.input}
          />
        </div>

        {!hasPackForTopic && topic.trim() ? (
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className={`${SA.btnPrimary} h-11 w-full`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t('generateOne')}
              </>
            )}
          </button>
        ) : null}
      </div>

      {error ? <div className={SA.error}>{error}</div> : null}
      {reusedNotice ? <div className={SA.tip}>{reusedNotice}</div> : null}

      {subjectPacks.length > 0 ? (
        <div className={`${SA.cardPadded} space-y-3`}>
          <p className={`text-sm font-bold ${SA.text}`}>{t('availablePacks')}</p>
          <div className="flex flex-wrap gap-2">
            {subjectPacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPack(pack)}
                className={`rounded-xl border px-3 py-2 text-start text-sm ${
                  selectedPack?.id === pack.id
                    ? 'border-[var(--sa-navy-600)] bg-[var(--sa-navy-50)]'
                    : 'border-[var(--sa-navy-100)]'
                }`}
              >
                <span className="font-medium">{pack.title}</span>
                <span className={`ms-2 text-xs ${SA.muted}`}>{pack.source}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`${SA.cardPadded} text-center`}>
          <p className={`text-sm ${SA.muted}`}>{t('empty')}</p>
        </div>
      )}

      {selectedPack ? <PackViewer pack={selectedPack} onPrint={handlePrint} /> : null}
    </div>
  );
}
