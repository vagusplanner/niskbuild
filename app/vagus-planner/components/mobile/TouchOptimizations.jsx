import React, { useEffect } from 'react';

// Mobile touch optimizations component
// This component adds touch-friendly behaviors throughout the app
export default function TouchOptimizations() {
  useEffect(() => {
    // Prevent zoom on double tap for better mobile UX
    let lastTouchEnd = 0;
    const preventZoom = (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchend', preventZoom, { passive: false });

    // Add touch feedback for all interactive elements
    const addTouchFeedback = () => {
      const interactiveElements = document.querySelectorAll(
        'button, a, [role="button"], [tabindex]'
      );
      
      interactiveElements.forEach(el => {
        if (!el.classList.contains('touch-optimized')) {
          el.classList.add('touch-optimized');
          el.style.cssText += `
            -webkit-tap-highlight-color: rgba(20, 184, 166, 0.1);
            touch-action: manipulation;
            user-select: none;
            -webkit-user-select: none;
          `;
        }
      });
    };

    // Apply on mount and when DOM changes
    addTouchFeedback();
    const observer = new MutationObserver(addTouchFeedback);
    observer.observe(document.body, { childList: true, subtree: true });

    // Add swipe gesture support
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const edgeThreshold = 20;
      const diffX = touchStartX - touchEndX;
      const diffY = touchStartY - touchEndY;
      
      // Ignore swipes from screen edges for native iOS back/forward gestures
      const screenWidth = window.innerWidth;
      if (touchStartX < edgeThreshold || touchStartX > screenWidth - edgeThreshold) {
        return;
      }

      // Only trigger swipe if horizontal movement is greater than vertical
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
        const swipeEvent = new CustomEvent('swipe', {
          detail: { direction: diffX > 0 ? 'left' : 'right' }
        });
        document.dispatchEvent(swipeEvent);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    // Enhance scroll behavior
    const smoothScrollElements = document.querySelectorAll('[data-smooth-scroll]');
    smoothScrollElements.forEach(el => {
      el.style.cssText += `
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      `;
    });

    return () => {
      document.removeEventListener('touchend', preventZoom);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
}