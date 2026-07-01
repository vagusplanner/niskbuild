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
import { SA } from '@/lib/shift-ai/theme';

type SignupPath = 'choose' | 'self' | 'supervised' | 'family';

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
          favouriteSubjects,
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
        {message ? <p className={SA.success}>{message}</p> : null}
        <button type="button" onClick={() => setPath('self')} className={SA.authChoice}>
          <p className={`font-semibold ${SA.text}`}>I am 13 or older — create my own account</p>
          <p className={`mt-1 text-sm ${SA.muted}`}>
            Self-registration with your own email and password.
          </p>
        </button>
        <button type="button" onClick={() => setPath('supervised')} className={SA.authChoice}>
          <p className={`font-semibold ${SA.text}`}>
            I am setting up an account for my child under 13
          </p>
          <p className={`mt-1 text-sm ${SA.muted}`}>
            Supervised account — we email the parent for consent first.
          </p>
        </button>
        <button type="button" onClick={() => setPath('family')} className={SA.authChoice}>
          <p className={`font-semibold ${SA.text}`}>I am setting up for a young child aged 4–7</p>
          <p className={`mt-1 text-sm ${SA.muted}`}>
            Family / Voice Buddy mode — parent manages everything.
          </p>
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
        className={SA.link}
      >
        ← Back to account types
      </button>

      {error ? <p className={`mb-4 mt-4 ${SA.error}`}>{error}</p> : null}

      {path === 'self' && (
        <form onSubmit={handleSelfSubmit} className="mt-6 space-y-4">
          <h2 className={`text-lg font-semibold ${SA.text}`}>Create your Shift AI account</h2>
          <input className={SA.input} type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={SA.input} type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <input className={SA.input} type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <select className={SA.select} value={curriculum} onChange={(e) => setCurriculum(e.target.value as ShiftCurriculum)} required>
            {SHIFT_CURRICULA.map((c) => (
              <option key={c} value={c}>{SHIFT_CURRICULUM_LABELS[c]}</option>
            ))}
          </select>
          <input className={SA.input} type="text" placeholder="Year group (e.g. Year 9)" value={yearGroup} onChange={(e) => setYearGroup(e.target.value)} required />
          <select className={SA.select} value={ageRange} onChange={(e) => setAgeRange(e.target.value as ShiftAgeRange)} required>
            {SHIFT_AGE_RANGES.filter((r) => r !== '7_8' && r !== '9_10' && r !== '11_12').map((r) => (
              <option key={r} value={r}>{SHIFT_AGE_RANGE_LABELS[r]}</option>
            ))}
          </select>
          <input className={SA.input} type="text" placeholder="Favourite subject 1 (optional)" value={subjectOne} onChange={(e) => setSubjectOne(e.target.value)} />
          <input className={SA.input} type="text" placeholder="Favourite subject 2 (optional)" value={subjectTwo} onChange={(e) => setSubjectTwo(e.target.value)} />
          <input className={SA.input} type="text" placeholder="Favourite subject 3 (optional)" value={subjectThree} onChange={(e) => setSubjectThree(e.target.value)} />
          <button type="submit" disabled={loading} className={`${SA.btnPrimary} w-full py-2.5`}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      {(path === 'supervised' || path === 'family') && (
        <form
          onSubmit={(e) => handleSupervisedSubmit(e, path === 'family' ? 'family' : 'supervised')}
          className="mt-6 space-y-4"
        >
          <h2 className={`text-lg font-semibold ${SA.text}`}>
            {path === 'family' ? 'Family / Voice Buddy setup' : 'Supervised account setup'}
          </h2>
          <p className={`text-sm ${SA.muted}`}>
            We will email the parent a consent link. No login is created until they approve.
          </p>
          <input className={SA.input} type="text" placeholder="Child's first name" value={childFirstName} onChange={(e) => setChildFirstName(e.target.value)} required />
          <select className={SA.select} value={curriculum} onChange={(e) => setCurriculum(e.target.value as ShiftCurriculum)} required>
            {SHIFT_CURRICULA.map((c) => (
              <option key={c} value={c}>{SHIFT_CURRICULUM_LABELS[c]}</option>
            ))}
          </select>
          <input className={SA.input} type="text" placeholder="Year group (e.g. Year 5)" value={yearGroup} onChange={(e) => setYearGroup(e.target.value)} required />
          <input className={SA.input} type="text" placeholder="Favourite subject 1 (optional)" value={subjectOne} onChange={(e) => setSubjectOne(e.target.value)} />
          <input className={SA.input} type="text" placeholder="Favourite subject 2 (optional)" value={subjectTwo} onChange={(e) => setSubjectTwo(e.target.value)} />
          <input className={SA.input} type="text" placeholder="Favourite subject 3 (optional)" value={subjectThree} onChange={(e) => setSubjectThree(e.target.value)} />
          <input className={SA.input} type="email" placeholder="Parent or guardian email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required />
          <button type="submit" disabled={loading} className={`${SA.btnPrimary} w-full py-2.5`}>
            {loading ? 'Sending consent email…' : 'Send consent request to parent'}
          </button>
        </form>
      )}
    </div>
  );
}
