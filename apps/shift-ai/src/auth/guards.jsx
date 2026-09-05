import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { session, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="sa-auth-page">
        <p className="sa-muted">Checking session…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function RequireOnboarded() {
  const { needsOnboarding, profileLoading, authLoading, profileError } = useAuth()

  if (authLoading || profileLoading) {
    return (
      <div className="sa-auth-page">
        <p className="sa-muted">Loading your profile…</p>
      </div>
    )
  }

  if (needsOnboarding || profileError === 'no_profile') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

export function RedirectIfAuthed({ children }) {
  const { session, authLoading, needsOnboarding, profileLoading } = useAuth()

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="sa-auth-page">
        <p className="sa-muted">Loading…</p>
      </div>
    )
  }

  if (session) {
    return <Navigate to={needsOnboarding ? '/onboarding' : '/dashboard'} replace />
  }

  return children
}
