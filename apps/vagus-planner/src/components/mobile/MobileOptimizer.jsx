import { useEffect, useState } from 'react';

// Mobile viewport optimization
export function MobileOptimizer() {
  useEffect(() => {
    // Prevent zoom on input focus
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }

    // iOS-specific optimizations
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Prevent elastic scrolling
      document.body.style.overscrollBehavior = 'none';
      
      // Fix iOS safe area insets
      document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
      document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
      document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');
    }

    // Android-specific optimizations
    if (/Android/.test(navigator.userAgent)) {
      // Smooth scrolling
      document.documentElement.style.scrollBehavior = 'smooth';
    }

    // Optimize touch performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
  }, []);

  return null;
}

// Hook for detecting screen size
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
}