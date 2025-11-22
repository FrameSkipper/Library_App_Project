const CACHE_NAME = 'frc-library-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/src/App.css',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  // Get pending transactions from IndexedDB
  const db = await openDB();
  const tx = db.transaction('pending-transactions', 'readonly');
  const store = tx.objectStore('pending-transactions');
  const pendingTransactions = await store.getAll();

  // Try to sync each transaction
  for (const transaction of pendingTransactions) {
    try {
      const response = await fetch('/api/transactions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${transaction.token}`,
        },
        body: JSON.stringify(transaction.data),
      });

      if (response.ok) {
        // Remove from pending if successful
        const deleteTx = db.transaction('pending-transactions', 'readwrite');
        const deleteStore = deleteTx.objectStore('pending-transactions');
        await deleteStore.delete(transaction.id);
      }
    } catch (error) {
      console.error('Failed to sync transaction:', error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FRCLibraryDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-transactions')) {
        db.createObjectStore('pending-transactions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}