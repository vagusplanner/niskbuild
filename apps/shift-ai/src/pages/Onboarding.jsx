import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { shiftAiFetch } from '@/lib/api'
import { SHIFT_AGE_RANGES, SHIFT_CURRICULA } from '@/lib/onboarding'

export default function OnboardingPage() {
  const { session, student, needsOnboarding, profileLoading, refreshProfile, profileError } =
    useAuth()
  const navigate = useNavigate()
  const completeOnly = !!student && needsOnboarding

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(student?.fullName ?? '')
  const [curriculum, setCurriculum] = useState(student?.curriculum ?? 'uk')
  const [yearGroup, setYearGroup] = useState(student?.yearGroup ?? '')
  const [ageRange, setAgeRange] = useState(student?.ageRange || '13')
  const [subjectOne, setSubjectOne] = useState('')
  const [subjectTwo, setSubjectTwo] = useState('')
  const [subjectThree, setSubjectThree] = useState('')

  useEffect(() => {
    if (student) {
      setFullName(student.fullName || '')
      setCurriculum(student.curriculum || 'uk')
      setYearGroup(student.yearGroup || '')
      setAgeRange(student.ageRange || '13')
    }
  }, [student])

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!profileLoading && !needsOnboarding && profileError !== 'no_profile') {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const favouriteSubjects = [subjectOne, subjectTwo, subjectThree].filter(Boolean)
      if (favouriteSubjects.length === 0) {
        throw new Error('Add at least one favourite subject')
      }
      const res = await shiftAiFetch('/api/shift-ai/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          fullName: completeOnly ? student.fullName : fullName,
          curriculum: completeOnly ? student.curriculum : curriculum,
          yearGroup: completeOnly ? student.yearGroup : yearGroup,
          ageRange: completeOnly ? student.ageRange || ageRange : ageRange,
          favouriteSubjects,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not save onboarding')
      }
      await refreshProfile()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sa-auth-page shift-ai-app">
      <div className="sa-auth-card">
        <p className="sa-auth-kicker">Almost there</p>
        <h1 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.75rem' }}>
          {completeOnly ? 'Pick your subjects' : 'Set up your profile'}
        </h1>
        <p className="sa-muted" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
          We need a few details before opening your dashboard.
        </p>

        <form className="sa-stack" onSubmit={onSubmit}>
          {error ? <div className="sa-error">{error}</div> : null}

          {completeOnly ? (
            <div className="sa-shell-card" style={{ padding: '1rem' }}>
              <strong>{student.fullName}</strong>
              <p className="sa-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
                {student.yearGroup} · {student.curriculum}
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}

          <div>
            <label className="sa-field-label">Favourite subjects</label>
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
            {loading ? 'Saving…' : 'Continue to dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
