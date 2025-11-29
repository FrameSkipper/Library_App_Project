// frontend/src/utils/syncManager.js
import { offlineDB } from './db';
import apiClient from '../services/api';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
  }

  // Start automatic background sync
  startAutoSync(intervalMs = 30000) { // Default: 30 seconds
    if (this.syncInterval) {
      console.log('⚠️ Auto-sync already running');
      return;
    }

    console.log('✓ Starting auto-sync (interval: ' + intervalMs + 'ms)');
    
    // Initial sync
    this.syncAll();

    // Set up interval
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncAll();
      } else {
        console.log('📴 Offline - skipping sync');
      }
    }, intervalMs);

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Back online - syncing data');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline - will sync when reconnected');
    });
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('✓ Auto-sync stopped');
    }
  }

  // Sync all data
  async syncAll() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('📴 Offline - cannot sync');
      return {
        success: false,
        message: 'No internet connection'
      };
    }

    this.isSyncing = true;
    console.log('🔄 Starting full sync...');

    try {
      // 1. Sync pending transactions first
      await this.syncPendingTransactions();

      // 2. Sync other pending operations
      await this.syncQueue();

      // 3. Pull latest data from server
      await this.pullLatestData();

      // 4. Clean up synced items
      await offlineDB.clearSyncedItems();

      console.log('✅ Full sync completed');
      
      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent('dataSync', {
        detail: { success: true, timestamp: new Date() }
      }));

      return {
        success: true,
        message: 'Sync completed successfully'
      };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return {
        success: false,
        message: error.message
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync pending transactions
  async syncPendingTransactions() {
    const pending = await offlineDB.getPendingTransactions();
    
    if (pending.length === 0) {
      console.log('✓ No pending transactions to sync');
      return;
    }

    console.log(`🔄 Syncing ${pending.length} pending transaction(s)...`);

    for (const item of pending) {
      try {
        // Post transaction to server
        const response = await apiClient.post('/transactions/', item.data);
        
        // Mark as synced in local DB
        await offlineDB.markTransactionSynced(item.id);
        
        // Add to synced transactions
        await offlineDB.transactions.add({
          ...response.data,
          synced: true
        });

        console.log(`✓ Transaction synced: ${item.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync transaction ${item.id}:`, error);
        // Don't throw - continue with other items
      }
    }
  }

  // Sync general queue
  async syncQueue() {
    const queue = await offlineDB.getSyncQueue();
    
    if (queue.length === 0) {
      console.log('✓ No items in sync queue');
      return;
    }

    console.log(`🔄 Syncing ${queue.length} queue item(s)...`);

    for (const item of queue) {
      try {
        switch (item.type) {
          case 'CREATE_BOOK':
            await apiClient.post('/books/', item.data);
            await offlineDB.markSynced(item.id);
            console.log(`✓ Book created on server`);
            break;

          case 'UPDATE_BOOK':
            await apiClient.put(`/books/${item.data.book_id}/`, item.data);
            await offlineDB.markSynced(item.id);
            console.log(`✓ Book updated on server`);
            break;

          case 'DELETE_BOOK':
            await apiClient.delete(`/books/${item.data.book_id}/`);
            await offlineDB.markSynced(item.id);
            console.log(`✓ Book deleted on server`);
            break;

          case 'CREATE_PUBLISHER':
            await apiClient.post('/publishers/', item.data);
            await offlineDB.markSynced(item.id);
            console.log(`✓ Publisher created on server`);
            break;

          default:
            console.warn(`⚠️ Unknown sync type: ${item.type}`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync ${item.type}:`, error);
        // Don't throw - continue with other items
      }
    }
  }

  // Pull latest data from server
  async pullLatestData() {
    console.log('📥 Pulling latest data from server...');

    try {
      // Fetch latest books
      const booksResponse = await apiClient.get('/books/');
      const books = booksResponse.data.results || booksResponse.data;
      await offlineDB.saveBooks(books);

      // Fetch latest publishers
      const publishersResponse = await apiClient.get('/publishers/');
      const publishers = publishersResponse.data.results || publishersResponse.data;
      await offlineDB.savePublishers(publishers);

      // Fetch latest transactions
      const transactionsResponse = await apiClient.get('/transactions/');
      const transactions = transactionsResponse.data.results || transactionsResponse.data;
      await offlineDB.saveTransactions(transactions);

      console.log('✅ Latest data pulled and cached');
    } catch (error) {
      console.error('❌ Failed to pull latest data:', error);
      throw error;
    }
  }

  // Get sync status
  async getSyncStatus() {
    const pendingTransactions = await offlineDB.getPendingTransactions();
    const syncQueue = await offlineDB.getSyncQueue();

    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      pendingTransactions: pendingTransactions.length,
      queuedItems: syncQueue.length,
      hasPendingChanges: pendingTransactions.length > 0 || syncQueue.length > 0
    };
  }
}

// Create singleton instance
const syncManager = new SyncManager();

export default syncManager;