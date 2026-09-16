import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { requestVpPasswordReset } from '@/lib/vp-password-reset';

const LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('signin'); // signin | forgot
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const from =
    searchParams.get('next') || location.state?.from?.pathname || '/dashboard';
  const signupHref =
    from && from !== '/dashboard'
      ? `/signup?next=${encodeURIComponent(from)}`
      : '/signup';

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && mode === 'signin') {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, from, navigate, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        await requestVpPasswordReset(email);
        setMessage(
          'Check your email for a Vagus Planner password reset link. Open it on this device to choose a new password.'
        );
      } else {
        await signIn(email, password);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || (mode === 'forgot' ? 'Failed to send reset email' : 'Failed to sign in'));
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#060f1e] via-[#0a1f44] to-[#0f3460]">
        <div className="w-10 h-10 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#060f1e] via-[#0a1f44] to-[#0f3460] px-4 py-10">
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-[#3ecfa0]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-[#E8B84B]/10 rounded-full blur-3xl pointer-events-none" />

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
              {mode === 'forgot' ? 'Reset your password' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {mode === 'forgot'
                ? 'We’ll email you a link to set a new password'
                : 'Sign in to your account'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a7ab8] focus:border-transparent"
              required
              autoComplete="email"
            />
          </div>
          {mode === 'signin' && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setMessage('');
                  }}
                  className="text-xs font-semibold text-[#1a7ab8] hover:text-[#1a4a6e]"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-11 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a7ab8] focus:border-transparent"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] text-white font-bold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#E8B84B] focus:ring-offset-2 disabled:opacity-50 transition"
          >
            {loading
              ? mode === 'forgot'
                ? 'Sending…'
                : 'Signing in...'
              : mode === 'forgot'
                ? 'Send reset link'
                : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-sm space-y-2">
          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
                setMessage('');
              }}
              className="text-[#1a7ab8] hover:text-[#1a4a6e] font-semibold"
            >
              ← Back to sign in
            </button>
          ) : (
            <p className="text-slate-600 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <Link to={signupHref} className="text-[#1a7ab8] hover:text-[#1a4a6e] font-semibold">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
