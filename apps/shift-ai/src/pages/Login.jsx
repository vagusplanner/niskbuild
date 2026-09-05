import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { RedirectIfAuthed } from '@/auth/guards'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RedirectIfAuthed>
      <div className="sa-auth-page shift-ai-app">
        <div className="sa-auth-card">
          <p className="sa-auth-kicker">Shift Learning</p>
          <h1 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.75rem' }}>Welcome back</h1>
          <p className="sa-muted" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
            Sign in to continue studying.
          </p>

          <form className="sa-stack" onSubmit={onSubmit}>
            {error ? <div className="sa-error">{error}</div> : null}
            <div>
              <label className="sa-field-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="sa-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sa-field-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="sa-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="sa-btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="sa-muted" style={{ marginTop: '1.25rem', fontSize: '0.875rem' }}>
            New here?{' '}
            <Link className="sa-link" to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </RedirectIfAuthed>
  )
}
