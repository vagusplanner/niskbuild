'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SHIFT_AGE_RANGES,
  SHIFT_AGE_RANGE_LABELS,
  SHIFT_CURRICULA,
  SHIFT_CURRICULUM_LABELS,
  type ShiftAgeRange,
  type ShiftCurriculum,
} from '@/lib/shift-ai/constants';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

type OnboardingProfile = {
  fullName: string;
  curriculum: ShiftCurriculum;
  yearGroup: string;
  ageRange: ShiftAgeRange;
  curriculumLabel: string;
};

export default function ShiftAiOnboardingForm({
  mode = 'create',
  initialProfile,
}: {
  mode?: 'create' | 'complete';
  initialProfile?: OnboardingProfile;
}) {
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
        throw new Error(data.error || 'Could not save your profile');
      }

      router.replace('/builder/shift-ai');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {mode === 'complete' && initialProfile ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{initialProfile.fullName}</p>
          <p className="mt-1">
            {initialProfile.yearGroup} · {initialProfile.curriculumLabel}
          </p>
        </div>
      ) : (
        <>
          <input
            className={inputClass}
            type="text"
            placeholder="Display name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <select
            className={inputClass}
            value={curriculum}
            onChange={(e) => setCurriculum(e.target.value as ShiftCurriculum)}
            required
          >
            {SHIFT_CURRICULA.map((c) => (
              <option key={c} value={c}>
                {SHIFT_CURRICULUM_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            type="text"
            placeholder="Year group (e.g. Year 9)"
            value={yearGroup}
            onChange={(e) => setYearGroup(e.target.value)}
            required
          />
          <select
            className={inputClass}
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value as ShiftAgeRange)}
            required
          >
            {SHIFT_AGE_RANGES.map((r) => (
              <option key={r} value={r}>
                {SHIFT_AGE_RANGE_LABELS[r]}
              </option>
            ))}
          </select>
        </>
      )}

      <input
        className={inputClass}
        type="text"
        placeholder="Favourite subject 1"
        value={subjectOne}
        onChange={(e) => setSubjectOne(e.target.value)}
        required={mode === 'complete'}
      />
      <input
        className={inputClass}
        type="text"
        placeholder="Favourite subject 2 (optional)"
        value={subjectTwo}
        onChange={(e) => setSubjectTwo(e.target.value)}
      />
      <input
        className={inputClass}
        type="text"
        placeholder="Favourite subject 3 (optional)"
        value={subjectThree}
        onChange={(e) => setSubjectThree(e.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Continue to Shift AI'}
      </button>
    </form>
  );
}
