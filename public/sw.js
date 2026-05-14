const CACHE_NAME = 'kidneycare-bd-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
];

const API_CACHE = 'kidneycare-api-v3';
const CACHEABLE_APIS = ['/api/articles', '/api/diet/foods', '/api/diet/recommendations'];

// Install — pre-cache only non-HTML assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete all old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always network-first for HTML navigation requests (never serve stale shell)
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(cached => cached || new Response('Offline — please reconnect.', { headers: { 'Content-Type': 'text/plain' } }))
      )
    );
    return;
  }

  // API: cacheable read-only endpoints use stale-while-revalidate
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
        fetch(request).catch(() =>
          new Response(JSON.stringify({ error: 'Offline', offline: true }), {
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
    }
    return;
  }

  // Static assets (JS, CSS, images): cache-first, update in background
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkPromise = fetch(request).then(res => {
        if (res.ok && request.method === 'GET') cache.put(request, res.clone());
        return res;
      }).catch(() => null);
      return cached || networkPromise || new Response('Offline');
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
  console.log('[SW] Syncing offline vitals...');
}
