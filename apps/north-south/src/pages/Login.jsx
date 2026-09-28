import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ensureNsUserSettings } from '@/lib/ns-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const GOLD = '#B8952A'
const OLIVE = '#3D4A2F'
const CREAM = '#F5F0E0'

function safeNextPath(raw) {
  if (!raw || typeof raw !== 'string') return '/dashboard'
  try {
    // Absolute same-origin URLs → path only
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw)
      if (typeof window !== 'undefined' && u.origin === window.location.origin) {
        return `${u.pathname}${u.search}` || '/dashboard'
      }
      return '/dashboard'
    }
    if (raw.startsWith('/')) return raw
  } catch {
    /* fall through */
  }
  return '/dashboard'
}

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = useMemo(() => safeNextPath(params.get('next')), [params])

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (signUpError) throw signUpError

        if (data.user?.id) {
          try {
            await ensureNsUserSettings(data.user.id)
          } catch (settingsError) {
            // Session may be absent until email confirm — settings created on first login.
            console.warn('NS settings upsert deferred:', settingsError)
          }
        }

        if (!data.session) {
          setInfo('Account created. Check your email to confirm, then sign in.')
          setMode('signin')
          return
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
        if (data.user?.id) {
          await ensureNsUserSettings(data.user.id)
        }
      }

      navigate(next, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: OLIVE }}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <img
            src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/afb515277_NSC-logo-v5.png"
            alt="North South Consulting"
            className="h-12 w-auto object-contain mx-auto"
          />
          <h1 className="font-cormorant text-4xl font-light text-white">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Email and password — North South Consulting client portal.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border p-8 space-y-5"
          style={{ backgroundColor: CREAM, borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Password</label>
            <Input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-inter text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="font-inter text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              {info}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full rounded-full font-inter"
            style={{ backgroundColor: GOLD, color: CREAM }}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>

          <button
            type="button"
            className="w-full font-inter text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setInfo(null)
            }}
          >
            {mode === 'signin'
              ? 'Need an account? Create one'
              : 'Already have an account? Sign in'}
          </button>
        </form>

        <p className="text-center">
          <Link to="/" className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
