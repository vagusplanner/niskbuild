'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  SHIFT_AGE_RANGES,
  SHIFT_CURRICULA,
  type ShiftAgeRange,
  type ShiftCurriculum,
} from '@/lib/shift-ai/constants';
import { SA } from '@/lib/shift-ai/theme';

type OnboardingProfile = {
  fullName: string;
  curriculum: ShiftCurriculum;
  yearGroup: string;
  ageRange: ShiftAgeRange;
};

export default function ShiftAiOnboardingForm({
  mode = 'create',
  initialProfile,
}: {
  mode?: 'create' | 'complete';
  initialProfile?: OnboardingProfile;
}) {
  const t = useTranslations('onboarding');
  const tDash = useTranslations('dashboard');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState(initialProfile?.fullName ?? '');
  const [curriculum, setCurriculum] = useState<ShiftCurriculum>(initialProfile?.curriculum ?? 'uk');
  const [yearGroup, setYearGroup] = useState(initialProfile?.yearGroup ?? '');
  const [ageRange, setAgeRange] = useState<ShiftAgeRange>(initialProfile?.ageRange ?? '13');
  const [subjectOne, setSubjectOne] = useState('');
  const [subjectTwo, setSubjectTwo] = useState('');
  const [subjectThree, setSubjectThree] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const favouriteSubjects = [subjectOne, subjectTwo, subjectThree].filter(Boolean);
      const res = await fetch('/api/shift-ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: mode === 'complete' ? initialProfile?.fullName ?? fullName : fullName,
          curriculum: mode === 'complete' ? initialProfile?.curriculum ?? curriculum : curriculum,
          yearGroup: mode === 'complete' ? initialProfile?.yearGroup ?? yearGroup : yearGroup,
          ageRange: mode === 'complete' ? initialProfile?.ageRange ?? ageRange : ageRange,
          favouriteSubjects,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || t('saveFailed'));
      }

      router.replace('/builder/shift-ai');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className={SA.error}>{error}</p> : null}

      {mode === 'complete' && initialProfile ? (
        <div className={`${SA.authCard} text-sm ${SA.muted}`}>
          <p className={`font-medium ${SA.text}`}>{initialProfile.fullName}</p>
          <p className="mt-1">
            {initialProfile.yearGroup} · {tDash(`curricula.${initialProfile.curriculum}`)}
          </p>
        </div>
      ) : (
        <>
          <input
            className={SA.input}
            type="text"
            placeholder={t('displayName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <select
            className={SA.select}
            value={curriculum}
            onChange={(e) => setCurriculum(e.target.value as ShiftCurriculum)}
            required
          >
            {SHIFT_CURRICULA.map((c) => (
              <option key={c} value={c}>
                {tDash(`curricula.${c}`)}
              </option>
            ))}
          </select>
          <input
            className={SA.input}
            type="text"
            placeholder={t('yearGroupPlaceholder')}
            value={yearGroup}
            onChange={(e) => setYearGroup(e.target.value)}
            required
          />
          <select
            className={SA.select}
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value as ShiftAgeRange)}
            required
          >
            {SHIFT_AGE_RANGES.map((r) => (
              <option key={r} value={r}>
                {t(`ageRanges.${r}`)}
              </option>
            ))}
          </select>
        </>
      )}

      <input
        className={SA.input}
        type="text"
        placeholder={t('subject1')}
        value={subjectOne}
        onChange={(e) => setSubjectOne(e.target.value)}
        required={mode === 'complete'}
      />
      <input
        className={SA.input}
        type="text"
        placeholder={t('subject2Optional')}
        value={subjectTwo}
        onChange={(e) => setSubjectTwo(e.target.value)}
      />
      <input
        className={SA.input}
        type="text"
        placeholder={t('subject3Optional')}
        value={subjectThree}
        onChange={(e) => setSubjectThree(e.target.value)}
      />
      <button type="submit" disabled={loading} className={`${SA.btnPrimary} w-full py-2.5`}>
        {loading ? t('saving') : t('continue')}
      </button>
    </form>
  );
}
