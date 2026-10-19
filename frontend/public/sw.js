const CACHE_NAME = 'universe-pwa-v2';
// Served by the Worker on the same origin; must never be answered from the cache
const NETWORK_ONLY_PREFIXES = ['/api/', '/icons/'];
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && NETWORK_ONLY_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    return;
  }

  // Navigation requests: network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((res) => {
        // Put a copy in cache
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return res;
      }).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // For other requests: cache-first, then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      // Cache same-origin GET responses
      if (request.method === 'GET' && request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
