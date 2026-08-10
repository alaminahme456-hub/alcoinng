const CACHE_NAME = 'alcoin-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.jpg',
  '/icon-512x512.jpg',
];

// Sensitive paths are NEVER cached
const SENSITIVE_PATTERNS = [
  '/api/',
  '/api/user/',
  '/api/admin/',
  '/api/market/trade',
  '/api/withdraw',
  '/api/deposit',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls (sensitive data, wallets, trades, auth)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation: network-first (always get fresh HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.woff2'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
