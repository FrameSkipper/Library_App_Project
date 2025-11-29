// frontend/src/services/offlineAPI.js
/**
 * Offline-Aware API Wrapper
 * Automatically uses IndexedDB when offline, syncs when online
 */

import offlineDB from './offlineDB';
import syncManager from './syncManager';
import { booksAPI, publishersAPI, transactionsAPI } from './api';

class OfflineAPI {
  /**
   * Initialize offline database
   */
  async init() {
    await offlineDB.init();
    
    // Initial sync if online
    if (syncManager.isOnline()) {
      await syncManager.pullFromServer();
    }
    
    console.log('✅ Offline API ready');
  }

  /**
   * Books API with offline support
   */
  books = {
    getAll: async (searchTerm = '') => {
      if (syncManager.isOnline()) {
        try {
          const books = await booksAPI.getAll(searchTerm);
          await offlineDB.saveToStore('books', books);
          return books;
        } catch (error) {
          console.warn('⚠️ API failed, using offline data:', error);
        }
      }
      
      // Fallback to offline data
      const books = await offlineDB.getAllFromStore('books');
      
      if (searchTerm) {
        return books.filter(book => 
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.author.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return books;
    },

    create: async (bookData) => {
      if (syncManager.isOnline()) {
        try {
          const book = await booksAPI.create(bookData);
          await offlineDB.saveToStore('books', book);
          return book;
        } catch (error) {
          console.warn('⚠️ API failed, queuing for sync:', error);
        }
      }
      
      // Queue for sync
      const tempId = `temp_${Date.now()}`;
      const tempBook = { ...bookData, book_id: tempId, _offline: true };
      
      await offlineDB.saveToStore('books', tempBook);
      await syncManager.queueOperation('CREATE_BOOK', bookData);
      
      return tempBook;
    },

    update: async (id, bookData) => {
      if (syncManager.isOnline()) {
        try {
          const book = await booksAPI.update(id, bookData);
          await offlineDB.saveToStore('books', book);
          return book;
        } catch (error) {
          console.warn('⚠️ API failed, queuing for sync:', error);
        }
      }
      
      // Update locally and queue
      const updatedBook = { ...bookData, book_id: id };
      await offlineDB.saveToStore('books', updatedBook);
      await syncManager.queueOperation('UPDATE_BOOK', updatedBook);
      
      return updatedBook;
    },

    delete: async (id) => {
      if (syncManager.isOnline()) {
        try {
          await booksAPI.delete(id);
          await offlineDB.deleteFromStore('books', id);
          return;
        } catch (error) {
          console.warn('⚠️ API failed, queuing for sync:', error);
        }
      }
      
      // Delete locally and queue
      await offlineDB.deleteFromStore('books', id);
      await syncManager.queueOperation('DELETE_BOOK', { book_id: id });
    },
  };

  /**
   * Publishers API with offline support
   */
  publishers = {
    getAll: async () => {
      if (syncManager.isOnline()) {
        try {
          const publishers = await publishersAPI.getAll();
          await offlineDB.saveToStore('publishers', publishers);
          return publishers;
        } catch (error) {
          console.warn('⚠️ API failed, using offline data:', error);
        }
      }
      
      return await offlineDB.getAllFromStore('publishers');
    },

    create: async (publisherData) => {
      if (syncManager.isOnline()) {
        try {
          const publisher = await publishersAPI.create(publisherData);
          await offlineDB.saveToStore('publishers', publisher);
          return publisher;
        } catch (error) {
          console.warn('⚠️ API failed, queuing for sync:', error);
        }
      }
      
      // Queue for sync
      const tempId = `temp_${Date.now()}`;
      const tempPublisher = { ...publisherData, pub_id: tempId, _offline: true };
      
      await offlineDB.saveToStore('publishers', tempPublisher);
      await syncManager.queueOperation('CREATE_PUBLISHER', publisherData);
      
      return tempPublisher;
    },
  };

  /**
   * Transactions API with offline support
   */
  transactions = {
    getAll: async () => {
      if (syncManager.isOnline()) {
        try {
          const transactions = await transactionsAPI.getAll();
          await offlineDB.saveToStore('transactions', transactions);
          return transactions;
        } catch (error) {
          console.warn('⚠️ API failed, using offline data:', error);
        }
      }
      
      return await offlineDB.getAllFromStore('transactions');
    },

    create: async (transactionData) => {
      if (syncManager.isOnline()) {
        try {
          const transaction = await transactionsAPI.create(transactionData);
          await offlineDB.saveToStore('transactions', transaction);
          return transaction;
        } catch (error) {
          console.warn('⚠️ API failed, queuing for sync:', error);
        }
      }
      
      // Queue for sync
      const tempTransaction = {
        ...transactionData,
        trans_id: `temp_${Date.now()}`,
        _offline: true,
        trans_date: new Date().toISOString(),
      };
      
      await offlineDB.saveToStore('transactions', tempTransaction);
      await syncManager.queueOperation('CREATE_TRANSACTION', transactionData);
      
      return tempTransaction;
    },

    getToday: async () => {
      const allTransactions = await this.getAll();
      const today = new Date().toISOString().split('T')[0];
      
      return allTransactions.filter(t => 
        t.trans_date.startsWith(today)
      );
    },
  };

  /**
   * Get sync status
   */
  async getSyncStatus() {
    return await syncManager.getSyncStatus();
  }

  /**
   * Manual sync
   */
  async sync() {
    return await syncManager.manualSync();
  }

  /**
   * Register sync complete callback
   */
  onSyncComplete(callback) {
    syncManager.onSyncComplete(callback);
  }
}

// Export singleton
const offlineAPI = new OfflineAPI();
export default offlineAPI;