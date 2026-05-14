const DB_NAME = 'kcbd-offline-vitals';
const STORE = 'queue';
const DB_VERSION = 1;

export interface QueuedVital {
  id?: number;
  data: Record<string, any>;
  token: string;
  queuedAt: number;
  localDate: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e: Event) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueVital(data: Record<string, any>, token: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({
      data,
      token,
      queuedAt: Date.now(),
      localDate: new Date().toISOString(),
    } as QueuedVital);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedVitals(): Promise<QueuedVital[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedVital[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedVital(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncQueuedVitals(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueuedVitals();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const entry of queue) {
    try {
      const res = await fetch('/api/patient/vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: entry.token,
        },
        body: JSON.stringify({ ...entry.data, date: entry.localDate }),
      });
      if (res.ok) {
        await removeQueuedVital(entry.id!);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
