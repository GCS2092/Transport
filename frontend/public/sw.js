const CACHE_NAME = 'vtc-dakar-v3';

/* ── Installation : skip waiting immédiatement ── */
self.addEventListener('install', () => {
  self.skipWaiting();
});

/* ── Activation : supprimer les anciens caches ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch : ne pas intercepter les ressources Next.js dynamiques ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Ignorer : chunks Next.js, HMR, API backend, autres origines */
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')   ||
    url.origin !== self.location.origin
  ) {
    return; /* laisser le navigateur gérer normalement */
  }

  /* Pour les navigations de page : network-first, fallback cache */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});