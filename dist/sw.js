// Defensor TD Service Worker
const CACHE_NAME = 'defensor-td-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Ignore non-GET, API requests, Vite HMR, or WebSockets
  if (
    request.method !== 'GET' ||
    request.url.includes('/api/') ||
    request.url.includes('hot-update') ||
    request.url.startsWith('ws://') ||
    request.url.startsWith('wss://')
  ) {
    return;
  }

  // Network-first strategy for smooth updates
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
