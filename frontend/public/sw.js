importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// SW de nettoyage — se désinstalle automatiquement sur tous les navigateurs

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Vider tous les caches
      caches.keys().then(keys =>
        Promise.all(keys.map(k => caches.delete(k)))
      ),
      // Se désinscrire soi-même
      self.registration.unregister(),
    ])
    .then(() => self.clients.claim())
    .then(() => {
      // Recharger tous les onglets ouverts pour débloquer la page
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.navigate(client.url))
      })
    })
  );
});

// Ne rien intercepter — laisser toutes les requetes passer normalement
self.addEventListener('fetch', () => {
  return;
});