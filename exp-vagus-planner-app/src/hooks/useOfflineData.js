/**
 * useOfflineData — local-first data hook
 *
 * Wraps base44 entity reads and writes so that:
 *  - Reads: return cached IndexedDB data immediately when offline, 
 *           update cache on successful network fetch
 *  - Writes: apply optimistically to local cache and enqueue in syncQueue 
 *            when offline; execute directly when online
 *
 * Supported entities: Task, PrayerLog, Event
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { offlineStorage, STORES } from '@/components/offline/offlineStorage';

const ENTITY_STORE_MAP = {
  Task:      STORES.TASKS,
  PrayerLog: STORES.PRAYER_LOGS,
  Event:     STORES.EVENTS,
};

// Initialise DB once
let dbReady = false;
const ensureDB = async () => {
  if (!dbReady) {
    await offlineStorage.init();
    dbReady = true;
  }
};

// ── Core helpers ──────────────────────────────────────────────────────────────

async function cacheEntityData(entity, records) {
  const store = ENTITY_STORE_MAP[entity];
  if (!store) return;
  await ensureDB();
  const tx = offlineStorage.db.transaction(store, 'readwrite');
  const s = tx.objectStore(store);
  for (const r of records) {
    s.put({ ...r, _cached_at: Date.now(), offline_modified: false });
  }
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

async function getLocalData(entity) {
  const store = ENTITY_STORE_MAP[entity];
  if (!store) return [];
  await ensureDB();
  return offlineStorage.getAll(store);
}

async function enqueueChange(action, entity, data) {
  await ensureDB();
  await offlineStorage.addToSyncQueue(action, entity, data);
}

// ── Main hook ─────────────────────────────────────────────────────────────────

/**
 * @param {string} entity  - 'Task' | 'PrayerLog' | 'Event'
 * @param {object} [filter] - filter object passed to base44 entity.filter()
 */
export function useOfflineData(entity, filter = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isMounted = useRef(true);

  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  // Track connectivity
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Always show local data first for instant render
      const local = await getLocalData(entity);
      if (isMounted.current && local.length) setData(local);

      if (navigator.onLine) {
        let records;
        if (filter) {
          records = await SDK.entities[entity].filter(filter);
        } else {
          records = await SDK.entities[entity].list('-updated_date', 200);
        }
        await cacheEntityData(entity, records);
        if (isMounted.current) setData(records);
      }
    } catch {
      // Network failed — local data already shown above
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [entity, JSON.stringify(filter)]);

  useEffect(() => { load(); }, [load]);

  // Re-fetch when back online
  useEffect(() => {
    if (isOnline) load();
  }, [isOnline]);

  // ── Write methods ───────────────────────────────────────────────────────────

  const create = useCallback(async (newData) => {
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const optimistic = { ...newData, id: tempId, _offline: true, offline_modified: true };

    // Optimistic local update
    const store = ENTITY_STORE_MAP[entity];
    if (store) {
      await ensureDB();
      await offlineStorage.put(store, optimistic);
      setData(prev => [optimistic, ...prev]);
    }

    if (navigator.onLine) {
      const created = await SDK.entities[entity].create(newData);
      // Replace temp record with real one
      if (store) {
        await offlineStorage.delete(store, tempId).catch(() => {});
        await offlineStorage.put(store, { ...created, offline_modified: false });
      }
      setData(prev => prev.map(r => r.id === tempId ? created : r));
      return created;
    } else {
      await enqueueChange('create', entity, newData);
      return optimistic;
    }
  }, [entity]);

  const update = useCallback(async (id, updates) => {
    // Optimistic local update
    const store = ENTITY_STORE_MAP[entity];
    if (store) {
      await ensureDB();
      const existing = await offlineStorage.get(store, id).catch(() => null);
      if (existing) {
        const updated = { ...existing, ...updates, offline_modified: true, _offline_updated_at: Date.now() };
        await offlineStorage.put(store, updated);
        setData(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      }
    }

    if (navigator.onLine) {
      const result = await SDK.entities[entity].update(id, updates);
      if (store) {
        await offlineStorage.put(store, { ...result, offline_modified: false }).catch(() => {});
      }
      setData(prev => prev.map(r => r.id === id ? result : r));
      return result;
    } else {
      await enqueueChange('update', entity, { id, ...updates });
      return { id, ...updates };
    }
  }, [entity]);

  const remove = useCallback(async (id) => {
    const store = ENTITY_STORE_MAP[entity];
    if (store) {
      await ensureDB();
      await offlineStorage.delete(store, id).catch(() => {});
    }
    setData(prev => prev.filter(r => r.id !== id));

    if (navigator.onLine) {
      await SDK.entities[entity].delete(id);
    } else {
      await enqueueChange('delete', entity, { id });
    }
  }, [entity]);

  const refresh = load;

  return { data, loading, isOnline, create, update, remove, refresh };
}

// ── Sync flush (called by EnhancedOfflineSync on reconnect) ───────────────────

export async function flushSyncQueue() {
  await ensureDB();
  const queue = await offlineStorage.getSyncQueue();
  if (!queue.length) return 0;

  let synced = 0;
  const failed = [];

  for (const item of queue) {
    try {
      const { action, entity, data } = item;
      if (action === 'create') {
        const { id: _tempId, _offline, offline_modified, _offline_updated_at, _cached_at, ...clean } = data;
        await SDK.entities[entity].create(clean);
      } else if (action === 'update') {
        const { id, _offline, offline_modified, _offline_updated_at, _cached_at, ...updates } = data;
        if (id && !String(id).startsWith('offline_')) {
          await SDK.entities[entity].update(id, updates);
        }
      } else if (action === 'delete') {
        if (data.id && !String(data.id).startsWith('offline_')) {
          await SDK.entities[entity].delete(data.id);
        }
      }
      synced++;
    } catch (err) {
      console.warn('Sync item failed:', item, err);
      failed.push(item);
    }
  }

  // Clear queue and re-add only failed items
  await offlineStorage.clearSyncQueue();
  for (const item of failed) {
    const { action, entity, data } = item;
    await offlineStorage.addToSyncQueue(action, entity, data);
  }

  return synced;
}