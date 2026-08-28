import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const from =
    searchParams.get('next') || location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { session } = await signUp(email, password);
      if (session) {
        navigate(from, { replace: true });
      } else {
        setMessage(
          'Check your email to confirm your account, then sign in.'
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const loginHref =
    from && from !== '/dashboard'
      ? `/login?next=${encodeURIComponent(from)}`
      : '/login';

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">Join Vagus Planner — same account works across the platform</p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-500">
          By creating an account, you agree to our{' '}
          <Link to="/TermsOfService" className="text-purple-600 hover:text-purple-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/PrivacyPolicy" className="text-purple-600 hover:text-purple-700">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="text-center text-sm">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to={loginHref} className="text-purple-600 hover:text-purple-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
