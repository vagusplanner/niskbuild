// IndexedDB service for offline pilgrimage data
const DB_NAME = 'PilgrimageOffline';
const DB_VERSION = 1;

const STORES = {
  itineraries: 'itineraries',
  ritualGuides: 'ritualGuides',
  prayerTimes: 'prayerTimes',
  conciergeInfo: 'conciergeInfo',
  syncQueue: 'syncQueue'
};

class OfflineStorageService {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
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

        // Create stores for different content types
        if (!db.objectStoreNames.contains(STORES.itineraries)) {
          db.createObjectStore(STORES.itineraries, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.ritualGuides)) {
          db.createObjectStore(STORES.ritualGuides, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.prayerTimes)) {
          db.createObjectStore(STORES.prayerTimes, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.conciergeInfo)) {
          db.createObjectStore(STORES.conciergeInfo, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.syncQueue)) {
          db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async saveData(storeName, data) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getData(storeName, id) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllData(storeName) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteData(storeName, id) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearStore(storeName) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Queue actions for sync when online
  async queueSync(action) {
    await this.saveData(STORES.syncQueue, {
      ...action,
      timestamp: Date.now()
    });
  }

  async getSyncQueue() {
    return this.getAllData(STORES.syncQueue);
  }

  async clearSyncQueue() {
    return this.clearStore(STORES.syncQueue);
  }

  async getStorageInfo() {
    const [itineraries, guides, prayers, concierge] = await Promise.all([
      this.getAllData(STORES.itineraries),
      this.getAllData(STORES.ritualGuides),
      this.getAllData(STORES.prayerTimes),
      this.getAllData(STORES.conciergeInfo)
    ]);

    return {
      itineraries: itineraries.length,
      ritualGuides: guides.length,
      prayerTimes: prayers.length,
      conciergeInfo: concierge.length,
      lastSyncTime: localStorage.getItem('lastOfflineSync'),
      pendingSyncItems: (await this.getSyncQueue()).length
    };
  }
}

export const offlineStorage = new OfflineStorageService();