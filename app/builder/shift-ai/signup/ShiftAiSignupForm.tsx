'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail } from '@/lib/auth';
import {
  SHIFT_AGE_RANGES,
  SHIFT_AGE_RANGE_LABELS,
  SHIFT_CURRICULA,
  SHIFT_CURRICULUM_LABELS,
  type ShiftAgeRange,
  type ShiftCurriculum,
} from '@/lib/shift-ai/constants';

type SignupPath = 'choose' | 'self' | 'supervised' | 'family';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export default function ShiftAiSignupForm() {
  const router = useRouter();
  const [path, setPath] = useState<SignupPath>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [curriculum, setCurriculum] = useState<ShiftCurriculum>('uk');
  const [yearGroup, setYearGroup] = useState('');
  const [ageRange, setAgeRange] = useState<ShiftAgeRange>('13');
  const [subjectOne, setSubjectOne] = useState('');
  const [subjectTwo, setSubjectTwo] = useState('');
  const [subjectThree, setSubjectThree] = useState('');

  const [childFirstName, setChildFirstName] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  const favouriteSubjects = [subjectOne, subjectTwo, subjectThree].filter(Boolean);

  const handleSelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await signUpWithEmail(email.trim(), password);
      const res = await fetch('/api/shift-ai/signup/self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName,
          curriculum,
          yearGroup,
          ageRange,
          favouriteSubjects,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not create your Shift AI profile');
      }

      router.replace('/builder/shift-ai');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisedSubmit = async (
    e: React.FormEvent,
    accountType: 'supervised' | 'family'
  ) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/shift-ai/signup/supervised', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childFirstName,
          yearGroup,
          curriculum,
          parentEmail,
          accountType,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not start supervised sign-up');
      }

      setMessage(
        data.message ||
          'We emailed the parent a consent link. The account stays inactive until they approve.'
      );
      setPath('choose');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  if (path === 'choose') {
    return (
      <div className="space-y-4">
        {message && (
          <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={() => setPath('self')}
          className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-slate-900">I am 13 or older — create my own account</p>
          <p className="mt-1 text-sm text-slate-600">Self-registration with your own email and password.</p>
        </button>
        <button
          type="button"
          onClick={() => setPath('supervised')}
          className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-slate-900">I am setting up an account for my child under 13</p>
          <p className="mt-1 text-sm text-slate-600">Supervised account — we email the parent for consent first.</p>
        </button>
        <button
          type="button"
          onClick={() => setPath('family')}
          className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-slate-900">I am setting up for a young child aged 4–7</p>
          <p className="mt-1 text-sm text-slate-600">Family / Voice Buddy mode — parent manages everything.</p>
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setPath('choose');
          setError('');
        }}
        className="mb-6 text-sm text-indigo-600 hover:underline"
      >
        ← Back to account types
      </button>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {path === 'self' && (
        <form onSubmit={handleSelfSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Create your Shift AI account</h2>
          <input className={inputClass} type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputClass} type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <input className={inputClass} type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <select className={inputClass} value={curriculum} onChange={(e) => setCurriculum(e.target.value as ShiftCurriculum)} required>
            {SHIFT_CURRICULA.map((c) => (
              <option key={c} value={c}>{SHIFT_CURRICULUM_LABELS[c]}</option>
            ))}
          </select>
          <input className={inputClass} type="text" placeholder="Year group (e.g. Year 9)" value={yearGroup} onChange={(e) => setYearGroup(e.target.value)} required />
          <select className={inputClass} value={ageRange} onChange={(e) => setAgeRange(e.target.value as ShiftAgeRange)} required>
            {SHIFT_AGE_RANGES.filter((r) => r !== '7_8' && r !== '9_10' && r !== '11_12').map((r) => (
              <option key={r} value={r}>{SHIFT_AGE_RANGE_LABELS[r]}</option>
            ))}
          </select>
          <input className={inputClass} type="text" placeholder="Favourite subject 1 (optional)" value={subjectOne} onChange={(e) => setSubjectOne(e.target.value)} />
          <input className={inputClass} type="text" placeholder="Favourite subject 2 (optional)" value={subjectTwo} onChange={(e) => setSubjectTwo(e.target.value)} />
          <input className={inputClass} type="text" placeholder="Favourite subject 3 (optional)" value={subjectThree} onChange={(e) => setSubjectThree(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      {(path === 'supervised' || path === 'family') && (
        <form
          onSubmit={(e) => handleSupervisedSubmit(e, path === 'family' ? 'family' : 'supervised')}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {path === 'family' ? 'Family / Voice Buddy setup' : 'Supervised account setup'}
          </h2>
          <p className="text-sm text-slate-600">
            We will email the parent a consent link. No login is created until they approve.
          </p>
          <input className={inputClass} type="text" placeholder="Child's first name" value={childFirstName} onChange={(e) => setChildFirstName(e.target.value)} required />
          <select className={inputClass} value={curriculum} onChange={(e) => setCurriculum(e.target.value as ShiftCurriculum)} required>
            {SHIFT_CURRICULA.map((c) => (
              <option key={c} value={c}>{SHIFT_CURRICULUM_LABELS[c]}</option>
            ))}
          </select>
          <input className={inputClass} type="text" placeholder="Year group (e.g. Year 5)" value={yearGroup} onChange={(e) => setYearGroup(e.target.value)} required />
          <input className={inputClass} type="email" placeholder="Parent or guardian email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required />
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? 'Sending consent email…' : 'Send consent request to parent'}
          </button>
        </form>
      )}
    </div>
  );
}
