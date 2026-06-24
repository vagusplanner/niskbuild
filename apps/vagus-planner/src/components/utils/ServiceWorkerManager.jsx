// Service Worker for offline caching and performance
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);
          
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    });
  }
}

// Cache API responses
export async function cacheResponse(key, data, expiryMinutes = 30) {
  if ('caches' in window) {
    const cache = await caches.open('api-cache-v1');
    const response = new Response(JSON.stringify({
      data,
      timestamp: Date.now(),
      expiryMinutes
    }));
    await cache.put(key, response);
  }
}

// Retrieve cached response
export async function getCachedResponse(key) {
  if ('caches' in window) {
    const cache = await caches.open('api-cache-v1');
    const response = await cache.match(key);
    
    if (response) {
      const { data, timestamp, expiryMinutes } = await response.json();
      const age = (Date.now() - timestamp) / 1000 / 60; // in minutes
      
      if (age < expiryMinutes) {
        return data;
      }
    }
  }
  return null;
}

// Clear old caches
export async function clearOldCaches(currentVersion = 'v1') {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    return Promise.all(
      cacheNames
        .filter(name => !name.includes(currentVersion))
        .map(name => caches.delete(name))
    );
  }
}