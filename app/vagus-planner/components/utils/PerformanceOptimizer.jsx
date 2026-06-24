import { useEffect, useRef } from 'react';

// Image optimization
export function optimizeImage(url, width = 800, quality = 85) {
  if (!url) return url;
  
  // If it's an Unsplash image, use their optimization params
  if (url.includes('unsplash.com')) {
    return `${url}?w=${width}&q=${quality}&auto=format&fit=crop`;
  }
  
  return url;
}

// Preload critical resources
export function preloadResource(href, type = 'script') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = type;
  document.head.appendChild(link);
}

// Prefetch pages for faster navigation
export function prefetchPage(pageName) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = `/pages/${pageName}`;
  document.head.appendChild(link);
}

// Request Idle Callback wrapper
export function requestIdleWork(callback) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
}

// Optimize bundle size by detecting and warning about heavy imports
export function checkBundleSize() {
  if (typeof window !== 'undefined' && performance?.memory) {
    const used = performance.memory.usedJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    const percentage = (used / limit) * 100;
    
    if (percentage > 80) {
      console.warn(`Memory usage high: ${percentage.toFixed(1)}%`);
    }
  }
}

// Component render performance hook
export function useRenderCount(componentName) {
  const renders = useRef(0);
  
  useEffect(() => {
    renders.current += 1;
    console.log(`${componentName} rendered ${renders.current} times`);
  });
}

// Web Vitals monitoring
export function reportWebVitals() {
  if ('web-vitals' in window) {
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = window['web-vitals'];
    
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  }
}