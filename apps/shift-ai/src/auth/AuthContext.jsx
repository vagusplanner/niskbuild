import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { shiftAiFetch } from '@/lib/api'
import { needsSubjectOnboarding } from '@/lib/onboarding'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [student, setStudent] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError('')
    try {
      const res = await shiftAiFetch('/api/shift-ai/me')
      if (res.status === 404) {
        setStudent(null)
        setProfileError('no_profile')
        return null
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not load profile')
      }
      const data = await res.json()
      setStudent(data.student)
      return data.student
    } catch (err) {
      setStudent(null)
      setProfileError(err instanceof Error ? err.message : 'Profile load failed')
      return null
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!session) {
      setStudent(null)
      setProfileError('')
      return
    }
    refreshProfile()
  }, [session, authLoading, refreshProfile])

  const value = useMemo(() => {
    const needsOnboarding =
      !!session &&
      (profileError === 'no_profile' || (!!student && needsSubjectOnboarding(student)))
    return {
      session,
      user: session?.user ?? null,
      student,
      authLoading,
      profileLoading,
      profileError,
      needsOnboarding,
      isActive: student ? student.isActive !== false : true,
      refreshProfile,
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return data
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        return data
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setStudent(null)
      },
    }
  }, [
    session,
    student,
    authLoading,
    profileLoading,
    profileError,
    refreshProfile,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
