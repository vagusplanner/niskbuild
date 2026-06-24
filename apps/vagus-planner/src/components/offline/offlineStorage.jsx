// Offline Storage Service using IndexedDB
const DB_NAME = 'MyAssistantOfflineDB';
const DB_VERSION = 1;

const STORES = {
  PRAYER_LOGS: 'prayerLogs',
  EVENTS: 'events',
  TASKS: 'tasks',
  QURAN_VERSES: 'quranVerses',
  HADITH: 'hadith',
  SYNC_QUEUE: 'syncQueue',
  SETTINGS: 'settings',
  CONFLICTS: 'conflicts'
};

class OfflineStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Prayer Logs Store
        if (!db.objectStoreNames.contains(STORES.PRAYER_LOGS)) {
          const prayerStore = db.createObjectStore(STORES.PRAYER_LOGS, { keyPath: 'id', autoIncrement: true });
          prayerStore.createIndex('date', 'date', { unique: false });
          prayerStore.createIndex('synced', 'synced', { unique: false });
        }

        // Events Store
        if (!db.objectStoreNames.contains(STORES.EVENTS)) {
          const eventStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
          eventStore.createIndex('start_date', 'start_date', { unique: false });
          eventStore.createIndex('offline_modified', 'offline_modified', { unique: false });
        }

        // Tasks Store
        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
          taskStore.createIndex('offline_modified', 'offline_modified', { unique: false });
        }

        // Quran Verses Store
        if (!db.objectStoreNames.contains(STORES.QURAN_VERSES)) {
          const quranStore = db.createObjectStore(STORES.QURAN_VERSES, { keyPath: 'id' });
          quranStore.createIndex('surah_number', 'surah_number', { unique: false });
        }

        // Hadith Store
        if (!db.objectStoreNames.contains(STORES.HADITH)) {
          db.createObjectStore(STORES.HADITH, { keyPath: 'id' });
        }

        // Sync Queue Store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // Conflicts Store
        if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
          const conflictStore = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'id', autoIncrement: true });
          conflictStore.createIndex('entity', 'entity', { unique: false });
          conflictStore.createIndex('resolved', 'resolved', { unique: false });
        }
      };
    });
  }

  async add(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex(storeName, indexName, value) {
    if (!this.db) {
      await this.init();
    }
    
    try {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      return new Promise((resolve, reject) => {
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('IndexedDB error:', error);
      return [];
    }
  }

  async delete(storeName, key) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Prayer-specific methods
  async addPrayerLog(prayerData) {
    const data = { ...prayerData, synced: false, timestamp: Date.now() };
    return this.add(STORES.PRAYER_LOGS, data);
  }

  async getPrayerLogsByDate(date) {
    return this.getAllByIndex(STORES.PRAYER_LOGS, 'date', date);
  }

  async getUnsyncedPrayerLogs() {
    if (!this.db) {
      try {
        await this.init();
      } catch (error) {
        return [];
      }
    }
    
    try {
      const all = await this.getAll(STORES.PRAYER_LOGS);
      return all.filter(log => !log.synced);
    } catch (error) {
      return [];
    }
  }

  // Event-specific methods
  async cacheEvents(events) {
    const tx = this.db.transaction(STORES.EVENTS, 'readwrite');
    const store = tx.objectStore(STORES.EVENTS);
    
    for (const event of events) {
      store.put({ ...event, offline_modified: false });
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateEvent(eventId, updates) {
    const event = await this.get(STORES.EVENTS, eventId);
    if (!event) throw new Error('Event not found');
    
    const updatedEvent = { 
      ...event, 
      ...updates, 
      offline_modified: true,
      offline_updated_at: Date.now()
    };
    
    await this.put(STORES.EVENTS, updatedEvent);
    await this.addToSyncQueue('update', 'Event', updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(eventId) {
    await this.delete(STORES.EVENTS, eventId);
    await this.addToSyncQueue('delete', 'Event', { id: eventId });
  }

  async getModifiedEvents() {
    return this.getAllByIndex(STORES.EVENTS, 'offline_modified', true);
  }

  // Task-specific methods
  async cacheTasks(tasks) {
    const tx = this.db.transaction(STORES.TASKS, 'readwrite');
    const store = tx.objectStore(STORES.TASKS);
    
    for (const task of tasks) {
      store.put({ ...task, offline_modified: false });
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateTask(taskId, updates) {
    const task = await this.get(STORES.TASKS, taskId);
    if (!task) throw new Error('Task not found');
    
    const updatedTask = { 
      ...task, 
      ...updates, 
      offline_modified: true,
      offline_updated_at: Date.now()
    };
    
    await this.put(STORES.TASKS, updatedTask);
    await this.addToSyncQueue('update', 'Task', updatedTask);
    return updatedTask;
  }

  async deleteTask(taskId) {
    await this.delete(STORES.TASKS, taskId);
    await this.addToSyncQueue('delete', 'Task', { id: taskId });
  }

  // Quran-specific methods
  async cacheQuranVerses(verses) {
    const tx = this.db.transaction(STORES.QURAN_VERSES, 'readwrite');
    const store = tx.objectStore(STORES.QURAN_VERSES);
    
    for (const verse of verses) {
      store.put(verse);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getQuranBySurah(surahNumber) {
    return this.getAllByIndex(STORES.QURAN_VERSES, 'surah_number', surahNumber);
  }

  // Sync queue methods
  async addToSyncQueue(action, entity, data) {
    return this.add(STORES.SYNC_QUEUE, {
      action,
      entity,
      data,
      timestamp: Date.now()
    });
  }

  async getSyncQueue() {
    if (!this.db) {
      try {
        await this.init();
      } catch (error) {
        console.warn('Failed to init DB for sync queue:', error);
        return [];
      }
    }
    
    try {
      return await this.getAll(STORES.SYNC_QUEUE);
    } catch (error) {
      console.warn('Failed to get sync queue:', error);
      return [];
    }
  }

  async clearSyncQueue() {
    return this.clear(STORES.SYNC_QUEUE);
  }

  // Hadith-specific methods
  async cacheHadithCollection(collection, hadiths) {
    const tx = this.db.transaction(STORES.HADITH, 'readwrite');
    const store = tx.objectStore(STORES.HADITH);
    
    for (const hadith of hadiths) {
      store.put({ ...hadith, collection });
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Conflict management
  async addConflict(entity, entityId, localData, serverData) {
    return this.add(STORES.CONFLICTS, {
      entity,
      entity_id: entityId,
      local_data: localData,
      server_data: serverData,
      timestamp: Date.now(),
      resolved: false
    });
  }

  async getUnresolvedConflicts() {
    if (!this.db) {
      try {
        await this.init();
      } catch (error) {
        return [];
      }
    }
    
    try {
      if (!this.db.objectStoreNames.contains(STORES.CONFLICTS)) return [];
      const all = await this.getAll(STORES.CONFLICTS);
      return all.filter(c => !c.resolved);
    } catch (error) {
      return [];
    }
  }

  async resolveConflict(conflictId, resolution) {
    const conflict = await this.get(STORES.CONFLICTS, conflictId);
    if (!conflict) return;
    
    await this.put(STORES.CONFLICTS, {
      ...conflict,
      resolved: true,
      resolution,
      resolved_at: Date.now()
    });
  }
}

// Singleton instance
const offlineStorage = new OfflineStorage();

export { offlineStorage, STORES };