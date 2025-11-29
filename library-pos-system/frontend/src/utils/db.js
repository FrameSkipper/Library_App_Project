class DatabaseManager {
  constructor() {
    this.dbName = 'FRCLibraryDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'book_id' });
          bookStore.createIndex('title', 'title', { unique: false });
          bookStore.createIndex('author', 'author', { unique: false });
        }

        if (!db.objectStoreNames.contains('pending-transactions')) {
          db.createObjectStore('pending-transactions', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }

        if (!db.objectStoreNames.contains('offline-cache')) {
          db.createObjectStore('offline-cache', { keyPath: 'key' });
        }
      };
    });
  }

  async saveBooks(books) {
    const tx = this.db.transaction('books', 'readwrite');
    const store = tx.objectStore('books');

    for (const book of books) {
      await store.put(book);
    }

    return tx.complete;
  }

  async getBooks() {
    const tx = this.db.transaction('books', 'readonly');
    const store = tx.objectStore('books');
    return store.getAll();
  }

  async savePendingTransaction(transactionData) {
    const tx = this.db.transaction('pending-transactions', 'readwrite');
    const store = tx.objectStore('pending-transactions');

    const transaction = {
      data: transactionData,
      token: localStorage.getItem('access_token'),
      timestamp: new Date().toISOString(),
    };

    return store.add(transaction);
  }

  async getPendingTransactions() {
    const tx = this.db.transaction('pending-transactions', 'readonly');
    const store = tx.objectStore('pending-transactions');
    return store.getAll();
  }

  async clearPendingTransaction(id) {
    const tx = this.db.transaction('pending-transactions', 'readwrite');
    const store = tx.objectStore('pending-transactions');
    return store.delete(id);
  }

  async cacheData(key, data) {
    const tx = this.db.transaction('offline-cache', 'readwrite');
    const store = tx.objectStore('offline-cache');
    return store.put({ key, data, timestamp: Date.now() });
  }

  async getCachedData(key) {
    const tx = this.db.transaction('offline-cache', 'readonly');
    const store = tx.objectStore('offline-cache');
    const result = await store.get(key);
    return result?.data;
  }
}

export const db = new DatabaseManager();