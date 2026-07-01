import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from './base44-compat';
import { getSafeSession } from './supabaseSession';
import { mapSupabaseUserToVpUser } from './vp-auth-user';

const AuthContext = createContext();

async function resolveAuthenticatedUser() {
  const session = await getSafeSession();
  if (session?.user) {
    return mapSupabaseUserToVpUser(session.user);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn('Auth user validation failed:', error.message);
    return null;
  }

  return mapSupabaseUserToVpUser(user);
}

function applyUserState(authUser, { setUser, setIsAuthenticated, setAuthError }) {
  const vpUser = mapSupabaseUserToVpUser(authUser);
  setUser(vpUser);
  setIsAuthenticated(!!vpUser);
  if (vpUser) {
    setAuthError(null);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const vpUser = await resolveAuthenticatedUser();
      setUser(vpUser);
      setIsAuthenticated(!!vpUser);
      if (!vpUser) {
        setAuthError(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_required',
        message: error instanceof Error ? error.message : 'Authentication required',
      });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      setAppPublicSettings({ id: 'vagus-planner', public_settings: {} });
      await checkUserAuth();
    } catch (authErr) {
      console.error('App state check failed:', authErr);
      setIsAuthenticated(false);
      setAuthChecked(true);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    void checkAppState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUserState(session?.user ?? null, { setUser, setIsAuthenticated, setAuthError });
      setAuthChecked(true);
      setIsLoadingAuth(false);
    });

    const timeout = window.setTimeout(() => {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [checkAppState]);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const vpUser = mapSupabaseUserToVpUser(data.user);
      setUser(vpUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setAuthChecked(true);
      return { user: vpUser, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError({
        type: 'auth_required',
        message: error instanceof Error ? error.message : 'Sign in failed',
      });
      throw error;
    }
  };

  const signUp = async (email, password, metadata) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (error) throw error;
      const vpUser = mapSupabaseUserToVpUser(data.user);
      setUser(vpUser);
      setIsAuthenticated(!!vpUser);
      setAuthError(null);
      setAuthChecked(true);
      return { user: vpUser, session: data.session };
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthError({
        type: 'error',
        message: error instanceof Error ? error.message : 'Sign up failed',
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const logout = async (shouldRedirect = true) => {
    await signOut();
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
  };

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authChecked,
    authError,
    appPublicSettings,
    signIn,
    signUp,
    signOut,
    logout,
    checkUserAuth,
    checkAppState,
    navigateToLogin,
    setIsAuthenticated,
    setUser,
    setAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
