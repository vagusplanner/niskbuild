import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { RedirectIfAuthed } from '@/auth/guards'
import { shiftAiFetch } from '@/lib/api'
import { SHIFT_AGE_RANGES, SHIFT_CURRICULA } from '@/lib/onboarding'

export default function SignupPage() {
  const { signUp, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [curriculum, setCurriculum] = useState('uk')
  const [yearGroup, setYearGroup] = useState('')
  const [ageRange, setAgeRange] = useState('13')
  const [subjectOne, setSubjectOne] = useState('')
  const [subjectTwo, setSubjectTwo] = useState('')
  const [subjectThree, setSubjectThree] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signUp(email.trim(), password)
      const favouriteSubjects = [subjectOne, subjectTwo, subjectThree].filter(Boolean)
      const res = await shiftAiFetch('/api/shift-ai/signup/self', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          curriculum,
          yearGroup,
          ageRange,
          favouriteSubjects,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not create student profile')
      }
      await refreshProfile()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RedirectIfAuthed>
      <div className="sa-auth-page shift-ai-app">
        <div className="sa-auth-card">
          <p className="sa-auth-kicker">Shift Learning</p>
          <h1 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.75rem' }}>Create account</h1>
          <p className="sa-muted" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
            Self-serve signup for Phase 1. Supervised/family flows stay on the web app for now.
          </p>

          <form className="sa-stack" onSubmit={onSubmit}>
            {error ? <div className="sa-error">{error}</div> : null}
            <div>
              <label className="sa-field-label">Email</label>
              <input
                className="sa-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sa-field-label">Password</label>
              <input
                className="sa-input"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sa-field-label">Display name</label>
              <input
                className="sa-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sa-field-label">Curriculum</label>
              <select
                className="sa-select"
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
              >
                {SHIFT_CURRICULA.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="sa-field-label">Year group</label>
              <input
                className="sa-input"
                placeholder="e.g. Year 10"
                value={yearGroup}
                onChange={(e) => setYearGroup(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sa-field-label">Age range</label>
              <select
                className="sa-select"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
              >
                {SHIFT_AGE_RANGES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="sa-field-label">Favourite subjects (up to 3)</label>
              <div className="sa-stack">
                <input
                  className="sa-input"
                  placeholder="Subject 1"
                  value={subjectOne}
                  onChange={(e) => setSubjectOne(e.target.value)}
                  required
                />
                <input
                  className="sa-input"
                  placeholder="Subject 2 (optional)"
                  value={subjectTwo}
                  onChange={(e) => setSubjectTwo(e.target.value)}
                />
                <input
                  className="sa-input"
                  placeholder="Subject 3 (optional)"
                  value={subjectThree}
                  onChange={(e) => setSubjectThree(e.target.value)}
                />
              </div>
            </div>
            <button className="sa-btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <p className="sa-muted" style={{ marginTop: '1.25rem', fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link className="sa-link" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </RedirectIfAuthed>
  )
}
