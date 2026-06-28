const CACHE_NAME = 'mi-tabla-v1';

// Solo cacheamos los ficheros propios de la app, NO librerías externas
// jsPDF se carga siempre desde la red para garantizar que el PDF funcione
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Dominios externos que NUNCA se cachean (necesitan red para funcionar)
const NETWORK_ONLY_DOMAINS = [
  'cdnjs.cloudflare.com'
];

// INSTALL: guarda ficheros propios en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    }).catch(err => {
      console.warn('Cache install error (non-fatal):', err);
    })
  );
  self.skipWaiting();
});

// ACTIVATE: elimina cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH: estrategia mixta
// - Recursos externos (jsPDF): siempre red
// - Recursos propios: caché primero, red como fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Recursos externos → siempre red (necesario para PDF)
  const isExternal = NETWORK_ONLY_DOMAINS.some(d => url.hostname.includes(d));
  if (isExternal) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Recursos propios → caché con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Actualizar caché con la respuesta nueva
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Si no hay red ni caché, devolver la página principal
      return caches.match('./index.html');
    })
  );
});
