import { useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll(callback, options = {}) {
  const {
    threshold = 0.8,
    enabled = true,
  } = options;

  const observerRef = useRef(null);

  const lastElementRef = useCallback(
    (node) => {
      if (!enabled) return;
      
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            callback();
          }
        },
        { threshold }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [callback, enabled, threshold]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return lastElementRef;
}