const CACHE_NAME = 'kidneycare-bd-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

const API_CACHE = 'kidneycare-api-v2';
const CACHEABLE_APIS = ['/api/articles', '/api/diet/foods', '/api/diet/recommendations'];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API caching: cache-first for read-only APIs, network-first for others
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
    if (isCacheable && request.method === 'GET') {
      event.respondWith(
        caches.open(API_CACHE).then(async (cache) => {
          const cached = await cache.match(request);
          const networkPromise = fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkPromise;
        })
      );
    } else {
      event.respondWith(
        fetch(request).catch(() => new Response(JSON.stringify({ error: 'Offline', offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        }))
      );
    }
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && request.method === 'GET') {
          caches.open(CACHE_NAME).then(cache => cache.put(request, res.clone()));
        }
        return res;
      }).catch(() => cached || new Response('Offline'));
    })
  );
});

// Background sync for offline vitals
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-vitals') {
    event.waitUntil(syncOfflineVitals());
  }
});

async function syncOfflineVitals() {
  // In a production system, read from IndexedDB and POST pending vitals
  console.log('[SW] Syncing offline vitals...');
}
