// frontend/src/services/offlineDB.js
/**
 * IndexedDB Manager for Offline Data Storage
 * Stores books, publishers, transactions, and pending sync queue
 */

const DB_NAME = 'LibraryPOS_DB';
const DB_VERSION = 1;

class OfflineDB {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Books store
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'book_id' });
          bookStore.createIndex('title', 'title', { unique: false });
          bookStore.createIndex('publisher', 'pub_id', { unique: false });
        }

        // Publishers store
        if (!db.objectStoreNames.contains('publishers')) {
          db.createObjectStore('publishers', { keyPath: 'pub_id' });
        }

        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transStore = db.createObjectStore('transactions', { keyPath: 'trans_id', autoIncrement: true });
          transStore.createIndex('trans_date', 'trans_date', { unique: false });
          transStore.createIndex('synced', 'synced', { unique: false });
        }

        // Sync queue - stores pending operations
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
        }

        // Metadata store - tracks last sync time
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('📦 IndexedDB schema created');
      };
    });
  }

  /**
   * Save data to a store
   */
  async saveToStore(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // If data is array, save multiple items
      if (Array.isArray(data)) {
        data.forEach(item => store.put(item));
      } else {
        store.put(data);
      }

      transaction.oncomplete = () => {
        console.log(`✅ Saved to ${storeName}:`, data);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all items from a store
   */
  async getAllFromStore(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log(`📚 Retrieved from ${storeName}:`, request.result.length, 'items');
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get single item by ID
   */
  async getFromStore(storeName, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete item from store
   */
  async deleteFromStore(storeName, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      transaction.oncomplete = () => {
        console.log(`🗑️ Deleted from ${storeName}:`, id);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Clear entire store
   */
  async clearStore(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      transaction.oncomplete = () => {
        console.log(`🧹 Cleared ${storeName}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Add to sync queue
   */
  async addToSyncQueue(operation) {
    const queueItem = {
      ...operation,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    await this.saveToStore('syncQueue', queueItem);
    console.log('📤 Added to sync queue:', queueItem);
    return queueItem;
  }

  /**
   * Get pending sync items
   */
  async getPendingSync() {
    const queue = await this.getAllFromStore('syncQueue');
    return queue.filter(item => !item.synced);
  }

  /**
   * Mark sync item as completed
   */
  async markSyncComplete(id) {
    const item = await this.getFromStore('syncQueue', id);
    if (item) {
      item.synced = true;
      item.syncedAt = new Date().toISOString();
      await this.saveToStore('syncQueue', item);
    }
  }

  /**
   * Save metadata (like last sync time)
   */
  async saveMetadata(key, value) {
    await this.saveToStore('metadata', { key, value, timestamp: new Date().toISOString() });
  }

  /**
   * Get metadata
   */
  async getMetadata(key) {
    const data = await this.getFromStore('metadata', key);
    return data?.value;
  }
}

// Export singleton instance
const offlineDB = new OfflineDB();
export default offlineDB;