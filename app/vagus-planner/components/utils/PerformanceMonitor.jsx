import { useEffect } from 'react';

export function usePerformanceMonitor(componentName) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // More than one frame (60fps)
        console.warn(`${componentName} slow render: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
}

export function measurePerformance(label, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

export function logMemoryUsage() {
  if (performance.memory) {
    const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
    const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
    console.log(`Memory: ${used}MB / ${total}MB`);
  }
}