const CACHE_NAME = 'kidneycare-bd-v5';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/offline.html',
];

// API endpoints to cache for offline use (stale-while-revalidate)
const CACHEABLE_APIS = [
  '/api/articles',
  '/api/diet/foods',
  '/api/diet/recommendations',
  '/api/doctor/patients',
  '/api/doctor/alerts',
  '/api/patient/vitals',
  '/api/patient/gfr-history',
  '/api/patient/profile',
  '/api/patient/risk-score',
  '/api/patient/streak',
];

// Background sync queue stored in IndexedDB key
const SYNC_STORE = 'kcbd-offline-actions';

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== 'kidneycare-api-v5')
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML navigation: network-first → offline page fallback
  if (request.mode === 'navigate' ||
      (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline.html').then(r => r ||
          new Response('<h1>KidneyCare BD — Offline</h1><p>Please reconnect to continue.</p>',
            { headers: { 'Content-Type': 'text/html' } })
        )
      )
    );
    return;
  }

  // Cacheable GET API calls: stale-while-revalidate
  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    const isCacheable = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
    if (isCacheable) {
      event.respondWith(
        caches.open('kidneycare-api-v5').then(async (cache) => {
          const cached = await cache.match(request);
          const networkPromise = fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkPromise;
        })
      );
      return;
    }

    // Non-cacheable API GET: network with offline JSON fallback
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline', offline: true }),
          { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Mutating API calls (POST/PUT): queue for background sync when offline
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(async () => {
        // Store the request body in IDB for later sync
        try {
          const body = await request.clone().text();
          const db = await openSyncDB();
          const tx = db.transaction(SYNC_STORE, 'readwrite');
          tx.objectStore(SYNC_STORE).add({
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body,
            timestamp: Date.now(),
          });
        } catch (_) {}
        return new Response(JSON.stringify({ error: 'Offline — action queued', offline: true, queued: true }),
          { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // Static assets: cache-first, background update
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

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(flushOfflineActions());
  }
});

async function flushOfflineActions() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction(SYNC_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_STORE);
    const all = await idbAll(store);
    for (const item of all) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body || undefined,
        });
        if (res.ok) {
          const delTx = db.transaction(SYNC_STORE, 'readwrite');
          delTx.objectStore(SYNC_STORE).delete(item.id);
        }
      } catch (_) {}
    }
  } catch (_) {}
}

// ── SW Update Notification ────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('kcbd-sync', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

function idbAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
