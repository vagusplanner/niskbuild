import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const pageName = location.pathname.replace('/', '') || 'home';
    
    // Log page view to console (safe replacement for base44.appLogs)
    if (isAuthenticated) {
      console.log(`📋 User on page: ${pageName}`);
    }
    
    // You can add analytics here later
    // Example: window.gtag?.('event', 'page_view', { page: pageName });
    
  }, [location, isAuthenticated]);

  return null;
}
