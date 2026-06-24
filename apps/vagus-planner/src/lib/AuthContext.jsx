import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from './base44-compat';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();

    const timeout = window.setTimeout(() => {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const currentUser = await base44.auth.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setAppPublicSettings({ id: 'vagus-planner', public_settings: {} });
    } catch (authErr) {
      console.error('Auth check failed:', authErr);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      const currentUser = await base44.auth.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      const result = await base44.auth.signIn(email, password);
      setUser(result.user);
      setIsAuthenticated(true);
      setAuthError(null);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError({ type: 'auth_required', message: error.message });
      throw error;
    }
  };

  const signUp = async (email, password, metadata) => {
    try {
      const result = await base44.auth.signUp(email, password, metadata);
      setUser(result.user);
      setIsAuthenticated(true);
      setAuthError(null);
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthError({ type: 'error', message: error.message });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await base44.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
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
