import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import {
  consumeVpRecoverySession,
  updateVpPassword,
} from '@/lib/vp-password-reset';

const LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png';

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 pr-11 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a7ab8] focus:border-transparent"
          required
          minLength={6}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { session, error: consumeError } = await consumeVpRecoverySession();
      if (cancelled) return;
      if (consumeError || !session?.user) {
        setError(
          consumeError?.message ||
            'This reset link is invalid or has expired. Request a new one from the sign-in page.'
        );
        setReady(false);
      } else {
        setReady(true);
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await updateVpPassword(password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#060f1e] via-[#0a1f44] to-[#0f3460] px-4 py-10">
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-[#3ecfa0]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-md w-full space-y-6 p-8 rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-[#E8B84B]/25 backdrop-blur">
        <div className="text-center space-y-3">
          <img
            src={LOGO}
            alt="Vagus Planner"
            className="w-16 h-16 rounded-2xl object-cover mx-auto ring-2 ring-[#E8B84B]/50"
          />
          <div>
            <h1 className="text-2xl font-black text-[#1a4a6e] tracking-tight">Vagus Planner</h1>
            <p className="text-[10px] text-[#3ecfa0] tracking-widest uppercase font-semibold mt-0.5">
              Life · Faith · Balance
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Set a new password
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Choose a new password for your Vagus Planner account
            </p>
          </div>
        </div>

        {checking && (
          <div className="flex justify-center py-8">
            <div className="w-10 h-10 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full animate-spin" />
          </div>
        )}

        {!checking && done && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm text-center">
            Password updated. Taking you to sign in…
          </div>
        )}

        {!checking && !done && error && !ready && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
            <Link
              to="/login"
              className="block text-center text-sm font-semibold text-[#1a7ab8] hover:text-[#1a4a6e]"
            >
              Back to sign in
            </Link>
          </div>
        )}

        {!checking && !done && ready && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}
            <PasswordField
              id="new-password"
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
            />
            <p className="text-xs text-slate-500">At least 6 characters</p>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] text-white font-bold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#E8B84B] focus:ring-offset-2 disabled:opacity-50 transition"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
