'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { signUpWithEmail } from '@/lib/auth';
import {
  SHIFT_AGE_RANGES,
  SHIFT_CURRICULA,
  type ShiftAgeRange,
  type ShiftCurriculum,
} from '@/lib/shift-ai/constants';
import { SA } from '@/lib/shift-ai/theme';

type SignupPath = 'choose' | 'self' | 'supervised' | 'family';

export default function ShiftAiSignupForm() {
  const t = useTranslations('auth');
  const tDash = useTranslations('dashboard');
  const tAge = useTranslations('onboarding.ageRanges');
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
        throw new Error(data.error || t('createProfileFailed'));
      }

      router.replace('/builder/shift-ai');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signupFailed'));
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
        throw new Error(data.error || t('supervisedFailed'));
      }

      setMessage(data.message || t('consentEmailed'));
      setPath('choose');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (path === 'choose') {
    return (
      <div className="space-y-4">
        {message ? <p className={SA.success}>{message}</p> : null}
        <button type="button" onClick={() => setPath('self')} className={SA.authChoice}>
          <p className={`font-semibold ${SA.text}`}>{t('selfTitle')}</p>
          <p className={`mt-1 text-sm ${SA.muted}`}>{t('selfHint')}</p>
        </button>
        <button type="button" onClick={() => setPath('supervised')} className={SA.authChoice}>
          <p className={`font-semibold ${SA.text}`}>{t('supervisedTitle')}</p>
          <p className={`mt-1 text-sm ${SA.muted}`}>{t('supervisedHint')}</p>
        </button>
        <button type="button" onClick={() => setPath('family')} className={SA.authChoice}>
          <p className={`font-semibold ${SA.text}`}>{t('familyTitle')}</p>
          <p className={`mt-1 text-sm ${SA.muted}`}>{t('familyHint')}</p>
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
        className={`${SA.link} inline-flex items-center gap-1`}
      >
        <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
        {t('back')}
      </button>

      {error ? <p className={`mb-4 mt-4 ${SA.error}`}>{error}</p> : null}

      {path === 'self' && (
        <form onSubmit={handleSelfSubmit} className="mt-6 space-y-4">
          <h2 className={`text-lg font-semibold ${SA.text}`}>{t('createHeading')}</h2>
          <input
            className={SA.input}
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={SA.input}
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <input
            className={SA.input}
            type="text"
            placeholder={t('yourName')}
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
            {SHIFT_AGE_RANGES.filter((r) => r !== '7_8' && r !== '9_10' && r !== '11_12').map(
              (r) => (
                <option key={r} value={r}>
                  {tAge(r)}
                </option>
              )
            )}
          </select>
          <input
            className={SA.input}
            type="text"
            placeholder={t('subject1Optional')}
            value={subjectOne}
            onChange={(e) => setSubjectOne(e.target.value)}
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
            {loading ? t('creating') : t('createAccount')}
          </button>
        </form>
      )}

      {(path === 'supervised' || path === 'family') && (
        <form
          onSubmit={(e) => handleSupervisedSubmit(e, path === 'family' ? 'family' : 'supervised')}
          className="mt-6 space-y-4"
        >
          <h2 className={`text-lg font-semibold ${SA.text}`}>
            {path === 'family' ? t('familyHeading') : t('supervisedHeading')}
          </h2>
          <p className={`text-sm ${SA.muted}`}>{t('supervisedNote')}</p>
          <input
            className={SA.input}
            type="text"
            placeholder={t('childFirstName')}
            value={childFirstName}
            onChange={(e) => setChildFirstName(e.target.value)}
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
            placeholder={t('yearGroupYoungPlaceholder')}
            value={yearGroup}
            onChange={(e) => setYearGroup(e.target.value)}
            required
          />
          <input
            className={SA.input}
            type="text"
            placeholder={t('subject1Optional')}
            value={subjectOne}
            onChange={(e) => setSubjectOne(e.target.value)}
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
          <input
            className={SA.input}
            type="email"
            placeholder={t('parentEmail')}
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} className={`${SA.btnPrimary} w-full py-2.5`}>
            {loading ? t('sendingConsent') : t('sendConsent')}
          </button>
        </form>
      )}
    </div>
  );
}
