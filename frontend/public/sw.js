importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'vtc-dakar-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter : assets Next.js, API, autres origines
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')   ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Navigation : tenter le réseau, fallback cache, sinon réponse offline minimale
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(request).then(cached => {
            if (cached) return cached;
            // Fallback offline : réponse vide valide plutôt que undefined
            return new Response('', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' },
            });
          })
        )
    );
  }
});