import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ensureNsUserSettings,
  mapNsUser,
  nsLogout,
  nsRedirectToLogin,
} from '@/lib/ns-auth'

const AuthContext = createContext()

function isBenignUnauthenticatedError(error) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : String(error)
  return (
    message.includes('Auth session missing') ||
    message.includes('session missing') ||
    message.includes('JWT')
  )
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [appPublicSettings, setAppPublicSettings] = useState(null)

  const applySessionUser = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null)
      setIsAuthenticated(false)
      return null
    }
    const settings = await ensureNsUserSettings(authUser.id)
    const mapped = mapNsUser(authUser, settings)
    setUser(mapped)
    setIsAuthenticated(true)
    setAuthError(null)
    return mapped
  }, [])

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true)
    setIsLoadingAuth(true)
    setAuthError(null)
    setAppPublicSettings({ id: 'north-south', public_settings: {} })

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      await applySessionUser(session?.user ?? null)
    } catch (error) {
      console.warn('NS auth check failed:', error instanceof Error ? error.message : error)
      setUser(null)
      setIsAuthenticated(false)
      if (!isBenignUnauthenticatedError(error)) {
        setAuthError({ type: 'auth_error', message: error instanceof Error ? error.message : String(error) })
      }
    } finally {
      setIsLoadingAuth(false)
      setIsLoadingPublicSettings(false)
    }
  }, [applySessionUser])

  useEffect(() => {
    checkAppState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySessionUser(session?.user ?? null).catch((error) => {
        console.warn('NS auth state change failed:', error instanceof Error ? error.message : error)
        setUser(null)
        setIsAuthenticated(false)
      })
    })

    return () => subscription.unsubscribe()
  }, [applySessionUser, checkAppState])

  const logout = (shouldRedirect = true) => {
    setUser(null)
    setIsAuthenticated(false)
    const redirectTo = shouldRedirect && typeof window !== 'undefined' ? '/' : undefined
    void nsLogout(redirectTo)
  }

  const navigateToLogin = () => {
    nsRedirectToLogin(typeof window !== 'undefined' ? window.location.href : '/')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
        refreshUser: checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
