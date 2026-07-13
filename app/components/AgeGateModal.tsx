'use client';

import { useState } from 'react';
import { meetsMinimumAge, NISK_MINIMUM_AGE } from '@/lib/age-gate';

interface AgeGateModalProps {
  open: boolean;
  onComplete: () => void;
}

/**
 * Blocking minimum-age check for users who signed up via OAuth/SSO
 * (or older accounts) without an email-signup DOB step.
 */
export default function AgeGateModal({ open, onComplete }: AgeGateModalProps) {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dateOfBirth) {
      setError('Enter your date of birth to continue.');
      return;
    }
    if (!meetsMinimumAge(dateOfBirth)) {
      setError(
        `[LEGAL REVIEW NEEDED] NiskBuild is only for users aged ${NISK_MINIMUM_AGE} and over.`
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/age-gate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateOfBirth }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Could not verify age'
        );
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify age');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-nisk-card border border-nisk rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Confirm your age</h2>
        <p className="text-sm text-nisk-muted mb-4 leading-relaxed">
          [LEGAL REVIEW NEEDED] You must be at least {NISK_MINIMUM_AGE} years old to use
          NiskBuild. We use your date of birth only to check this requirement — we do not
          store your exact birthdate.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div>
            <label htmlFor="age-gate-dob" className="text-xs text-nisk-muted block mb-1">
              Date of birth
            </label>
            <input
              id="age-gate-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
              className="w-full px-4 py-2.5 rounded-lg glass-input text-sm"
            />
          </div>
          {error && <p className="text-xs text-[var(--error)]">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg btn-primary text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
