"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import AppTopNav from '@/app/components/AppTopNav';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="text-[10px] text-nisk-muted mb-1 block">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          minLength={6}
          className="w-full px-4 py-2.5 pr-11 rounded-lg glass-input placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--primary)] text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-nisk-muted hover:text-[var(--foreground)] rounded-md"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSafeSession().then((session) => {
      if (!session?.user) {
        router.replace('/login?error=auth_failed');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      router.replace('/dashboard?password_reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-nisk flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nisk flex flex-col">
      <AppTopNav variant="marketing" />
      <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-12">
        <div className="w-full max-w-md bg-nisk-card border border-nisk rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <NiskBuildLogo variant="lockup" size="xl" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Set a new password</h1>
            <p className="text-nisk-muted text-sm">Choose a new password for your NiskBuild account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
            />
            <PasswordField
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Repeat your password"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg btn-primary font-medium text-sm disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>

            {error && <p className="text-xs text-center text-[var(--error)]">{error}</p>}
          </form>

          <p className="mt-6 text-center text-sm text-nisk-muted">
            <Link href="/login" className="text-[var(--primary)] hover:underline">← Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
