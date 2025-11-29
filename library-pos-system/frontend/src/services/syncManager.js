// frontend/src/services/syncManager.js
/**
 * Sync Manager - Handles background synchronization
 * Syncs offline data when connection is restored
 */

import offlineDB from './offlineDB';
import { booksAPI, publishersAPI, transactionsAPI } from './api';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncCallbacks = [];
    this.setupOnlineListener();
  }

  setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored - starting sync...');
      this.showNotification('Back online! Syncing data...');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost - offline mode enabled');
      this.showNotification('Offline mode - changes will sync when online');
    });
  }

  isOnline() {
    return navigator.onLine;
  }

  showNotification(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  onSyncComplete(callback) {
    this.syncCallbacks.push(callback);
  }

  notifySyncComplete(results) {
    this.syncCallbacks.forEach(callback => callback(results));
  }

  async syncAll() {
    if (this.isSyncing || !this.isOnline()) return;

    this.isSyncing = true;
    console.log('🔄 Starting sync...');

    try {
      const pendingOps = await offlineDB.getPendingSync();
      console.log(`📋 Found ${pendingOps.length} pending operations`);

      if (pendingOps.length === 0) {
        await this.pullFromServer();
        this.isSyncing = false;
        return { success: true, synced: 0 };
      }

      const results = { success: 0, failed: 0, errors: [] };

      for (const op of pendingOps) {
        try {
          await this.processSyncOperation(op);
          await offlineDB.markSyncComplete(op.id);
          results.success++;
        } catch (error) {
          console.error(`❌ Failed to sync: ${op.type}`, error);
          results.failed++;
          results.errors.push({ op, error: error.message });
        }
      }

      await this.pullFromServer();
      await offlineDB.saveMetadata('lastSync', new Date().toISOString());

      console.log('✅ Sync completed:', results);
      this.showNotification(`Synced ${results.success} changes${results.failed > 0 ? `, ${results.failed} failed` : ''}`);
      
      this.notifySyncComplete(results);
      return results;

    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.showNotification('Sync failed - will retry');
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async processSyncOperation(op) {
    console.log('🔄 Processing:', op.type, op.data);

    switch (op.type) {
      case 'CREATE_BOOK':
        return await booksAPI.create(op.data);
      case 'UPDATE_BOOK':
        return await booksAPI.update(op.data.book_id, op.data);
      case 'DELETE_BOOK':
        return await booksAPI.delete(op.data.book_id);
      case 'CREATE_PUBLISHER':
        return await publishersAPI.create(op.data);
      case 'CREATE_TRANSACTION':
        return await transactionsAPI.create(op.data);
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  }

  async pullFromServer() {
    if (!this.isOnline()) return;

    console.log('⬇️ Pulling latest data from server...');

    try {
      const [books, publishers, transactions] = await Promise.all([
        booksAPI.getAll(),
        publishersAPI.getAll(),
        transactionsAPI.getAll(),
      ]);

      await offlineDB.clearStore('books');
      await offlineDB.clearStore('publishers');
      await offlineDB.clearStore('transactions');

      await offlineDB.saveToStore('books', books);
      await offlineDB.saveToStore('publishers', publishers);
      await offlineDB.saveToStore('transactions', transactions);

      console.log('✅ Pulled latest data');
    } catch (error) {
      console.error('❌ Failed to pull from server:', error);
      throw error;
    }
  }

  async queueOperation(type, data) {
    console.log('📝 Queuing operation:', type, data);
    
    const operation = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    await offlineDB.addToSyncQueue(operation);

    if (this.isOnline() && !this.isSyncing) {
      setTimeout(() => this.syncAll(), 1000);
    }

    return operation;
  }

  async getSyncStatus() {
    const pendingOps = await offlineDB.getPendingSync();
    const lastSync = await offlineDB.getMetadata('lastSync');

    return {
      isOnline: this.isOnline(),
      isSyncing: this.isSyncing,
      pendingOperations: pendingOps.length,
      lastSync,
      hasPendingChanges: pendingOps.length > 0,
    };
  }

  async manualSync() {
    console.log('🔄 Manual sync triggered');
    this.showNotification('Syncing data...');
    return await this.syncAll();
  }
}

const syncManager = new SyncManager();
export default syncManager;