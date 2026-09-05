import { useAuth } from '@/auth/AuthContext'

function firstName(fullName) {
  const trimmed = (fullName || '').trim()
  if (!trimmed) return 'student'
  return trimmed.split(/\s+/)[0]
}

export default function DashboardPage() {
  const { student, user, signOut, isActive, refreshProfile, profileLoading } = useAuth()

  return (
    <div className="shift-ai-app">
      <div className="sa-shell">
        <header className="sa-shell-header">
          <div>
            <p className="sa-auth-kicker" style={{ margin: 0 }}>
              Shift Learning
            </p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: '1.85rem' }}>
              Welcome, {firstName(student?.fullName)}
            </h1>
            <p className="sa-muted" style={{ margin: '0.35rem 0 0' }}>
              Phase 1 shell — feature screens land in later phases.
            </p>
          </div>
          <button type="button" className="sa-btn-secondary" style={{ width: 'auto' }} onClick={signOut}>
            Sign out
          </button>
        </header>

        {!isActive ? (
          <div className="sa-error" style={{ marginBottom: '1rem' }}>
            Your account is inactive (often waiting on parent consent). You can still view this
            shell, but study features will stay locked until activation.
          </div>
        ) : null}

        <section className="sa-shell-card sa-stack">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Your profile (live API)</h2>
          {profileLoading ? (
            <p className="sa-muted">Refreshing…</p>
          ) : (
            <dl style={{ margin: 0, display: 'grid', gap: '0.65rem' }}>
              <div>
                <dt className="sa-muted" style={{ fontSize: '0.75rem' }}>
                  Full name
                </dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{student?.fullName || '—'}</dd>
              </div>
              <div>
                <dt className="sa-muted" style={{ fontSize: '0.75rem' }}>
                  Year · curriculum
                </dt>
                <dd style={{ margin: 0 }}>
                  {student?.yearGroup || '—'} · {student?.curriculum || '—'}
                </dd>
              </div>
              <div>
                <dt className="sa-muted" style={{ fontSize: '0.75rem' }}>
                  Subjects
                </dt>
                <dd style={{ margin: 0 }}>
                  {(student?.favouriteSubjects || []).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="sa-muted" style={{ fontSize: '0.75rem' }}>
                  Auth email
                </dt>
                <dd style={{ margin: 0 }}>{user?.email || '—'}</dd>
              </div>
              <div>
                <dt className="sa-muted" style={{ fontSize: '0.75rem' }}>
                  Student id
                </dt>
                <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}>
                  {student?.id || '—'}
                </dd>
              </div>
            </dl>
          )}
          <button
            type="button"
            className="sa-btn-secondary"
            style={{ width: 'auto', alignSelf: 'flex-start' }}
            onClick={refreshProfile}
          >
            Refresh from /api/shift-ai/me
          </button>
        </section>
      </div>
    </div>
  )
}
