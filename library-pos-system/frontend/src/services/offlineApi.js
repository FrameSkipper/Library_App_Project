// frontend/src/services/offlineApi.js
import apiClient, { booksAPI, publishersAPI, transactionsAPI, authAPI, analyticsAPI, reportsAPI } from './api';
import { offlineDB } from '../utils/db';

// Wrapper for books API with offline support
export const offlineBooksAPI = {
  async getAll(searchTerm = '') {
    try {
      // Try online first
      const data = await booksAPI.getAll(searchTerm);
      // Cache in IndexedDB
      await offlineDB.saveBooks(data);
      return data;
    } catch (error) {
      // If offline, use cached data
      if (!navigator.onLine) {
        console.log('📴 Offline - using cached books');
        const cachedBooks = await offlineDB.getBooks();
        
        // Apply search filter if needed
        if (searchTerm) {
          return cachedBooks.filter(book => 
            book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.isbn.includes(searchTerm)
          );
        }
        
        return cachedBooks;
      }
      throw error;
    }
  },

  async getById(id) {
    try {
      return await booksAPI.getById(id);
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - using cached book');
        const books = await offlineDB.getBooks();
        return books.find(book => book.book_id === id);
      }
      throw error;
    }
  },

  async create(bookData) {
    try {
      const result = await booksAPI.create(bookData);
      // Update cache
      await offlineDB.addBook(result);
      return result;
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - queuing book creation');
        // Add to offline cache with temporary ID
        const tempId = Date.now();
        const tempBook = { ...bookData, book_id: tempId };
        await offlineDB.addBook(tempBook);
        // Queue for sync
        await offlineDB.addToSyncQueue('CREATE_BOOK', bookData);
        return tempBook;
      }
      throw error;
    }
  },

  async update(id, bookData) {
    try {
      const result = await booksAPI.update(id, bookData);
      // Update cache
      await offlineDB.updateBook(id, result);
      return result;
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - queuing book update');
        // Update local cache
        await offlineDB.updateBook(id, bookData);
        // Queue for sync
        await offlineDB.addToSyncQueue('UPDATE_BOOK', { ...bookData, book_id: id });
        return bookData;
      }
      throw error;
    }
  },

  async delete(id) {
    try {
      const result = await booksAPI.delete(id);
      // Remove from cache
      await offlineDB.deleteBook(id);
      return result;
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - queuing book deletion');
        // Remove from local cache
        await offlineDB.deleteBook(id);
        // Queue for sync
        await offlineDB.addToSyncQueue('DELETE_BOOK', { book_id: id });
        return { success: true };
      }
      throw error;
    }
  },

  getLowStock: booksAPI.getLowStock // No offline support needed
};

// Wrapper for publishers API with offline support
export const offlinePublishersAPI = {
  async getAll() {
    try {
      const data = await publishersAPI.getAll();
      // Cache in IndexedDB
      await offlineDB.savePublishers(data);
      return data;
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - using cached publishers');
        return await offlineDB.getPublishers();
      }
      throw error;
    }
  },

  async create(publisherData) {
    try {
      const result = await publishersAPI.create(publisherData);
      // Update cache
      const publishers = await offlineDB.getPublishers();
      await offlineDB.savePublishers([...publishers, result]);
      return result;
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - queuing publisher creation');
        const tempId = Date.now();
        const tempPublisher = { ...publisherData, pub_id: tempId };
        const publishers = await offlineDB.getPublishers();
        await offlineDB.savePublishers([...publishers, tempPublisher]);
        await offlineDB.addToSyncQueue('CREATE_PUBLISHER', publisherData);
        return tempPublisher;
      }
      throw error;
    }
  }
};

// Wrapper for transactions API with offline support
export const offlineTransactionsAPI = {
  async getAll() {
    try {
      const data = await transactionsAPI.getAll();
      // Cache in IndexedDB
      await offlineDB.saveTransactions(data);
      return data;
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - using cached transactions');
        return await offlineDB.getTransactions();
      }
      throw error;
    }
  },

  async create(transactionData) {
    try {
      const result = await transactionsAPI.create(transactionData);
      // Add to cache
      const transactions = await offlineDB.getTransactions();
      await offlineDB.saveTransactions([...transactions, result]);
      return result;
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - saving transaction for later sync');
        // Save to pending transactions
        await offlineDB.addPendingTransaction(transactionData);
        
        // Create temporary transaction for local display
        const tempTransaction = {
          trans_id: Date.now(),
          ...transactionData,
          trans_date: new Date().toISOString(),
          synced: false
        };
        
        const transactions = await offlineDB.getTransactions();
        await offlineDB.saveTransactions([...transactions, tempTransaction]);
        
        return tempTransaction;
      }
      throw error;
    }
  },

  async getToday() {
    try {
      return await transactionsAPI.getToday();
    } catch (error) {
      if (!navigator.onLine) {
        console.log('📴 Offline - filtering cached transactions for today');
        const allTransactions = await offlineDB.getTransactions();
        const today = new Date().toISOString().split('T')[0];
        return allTransactions.filter(t => 
          t.trans_date.split('T')[0] === today
        );
      }
      throw error;
    }
  },

  getStats: transactionsAPI.getStats // Requires server
};

// Analytics and Reports require server connection
export const offlineAnalyticsAPI = analyticsAPI;
export const offlineReportsAPI = reportsAPI;

// Auth API (no offline support needed)
export const offlineAuthAPI = authAPI;

// Export all
export {
  apiClient,
  offlineAuthAPI as authAPI,
  offlineBooksAPI as booksAPI,
  offlinePublishersAPI as publishersAPI,
  offlineTransactionsAPI as transactionsAPI,
  offlineAnalyticsAPI as analyticsAPI,
  offlineReportsAPI as reportsAPI
};