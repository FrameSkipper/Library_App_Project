// frontend/src/utils/db.js
import Dexie from 'dexie';

// Initialize IndexedDB database
export const db = new Dexie('LibraryPOSDB');

// Define database schema
db.version(1).stores({
  books: 'book_id, title, author, isbn, pub_id, stock_qty, unit_price',
  publishers: 'pub_id, name, email, phone',
  transactions: '++id, trans_id, trans_date, total_amount, staff_id, synced',
  pendingTransactions: '++id, data, timestamp, synced',
  syncQueue: '++id, type, data, timestamp, synced'
});

// Helper functions for offline data management
export const offlineDB = {
  // Books
  async saveBooks(books) {
    try {
      await db.books.clear();
      await db.books.bulkAdd(books);
      console.log('✓ Books saved to IndexedDB:', books.length);
    } catch (error) {
      console.error('Error saving books to IndexedDB:', error);
    }
  },

  async getBooks() {
    try {
      const books = await db.books.toArray();
      console.log('✓ Books loaded from IndexedDB:', books.length);
      return books;
    } catch (error) {
      console.error('Error loading books from IndexedDB:', error);
      return [];
    }
  },

  async addBook(book) {
    try {
      await db.books.add(book);
      console.log('✓ Book added to IndexedDB');
    } catch (error) {
      console.error('Error adding book to IndexedDB:', error);
    }
  },

  async updateBook(bookId, updates) {
    try {
      await db.books.update(bookId, updates);
      console.log('✓ Book updated in IndexedDB');
    } catch (error) {
      console.error('Error updating book in IndexedDB:', error);
    }
  },

  async deleteBook(bookId) {
    try {
      await db.books.delete(bookId);
      console.log('✓ Book deleted from IndexedDB');
    } catch (error) {
      console.error('Error deleting book from IndexedDB:', error);
    }
  },

  // Publishers
  async savePublishers(publishers) {
    try {
      await db.publishers.clear();
      await db.publishers.bulkAdd(publishers);
      console.log('✓ Publishers saved to IndexedDB:', publishers.length);
    } catch (error) {
      console.error('Error saving publishers to IndexedDB:', error);
    }
  },

  async getPublishers() {
    try {
      const publishers = await db.publishers.toArray();
      console.log('✓ Publishers loaded from IndexedDB:', publishers.length);
      return publishers;
    } catch (error) {
      console.error('Error loading publishers from IndexedDB:', error);
      return [];
    }
  },

  // Transactions
  async saveTransactions(transactions) {
    try {
      await db.transactions.clear();
      await db.transactions.bulkAdd(transactions.map(t => ({
        ...t,
        synced: true
      })));
      console.log('✓ Transactions saved to IndexedDB:', transactions.length);
    } catch (error) {
      console.error('Error saving transactions to IndexedDB:', error);
    }
  },

  async getTransactions() {
    try {
      const transactions = await db.transactions.toArray();
      console.log('✓ Transactions loaded from IndexedDB:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('Error loading transactions from IndexedDB:', error);
      return [];
    }
  },

  // Pending transactions (created offline)
  async addPendingTransaction(transactionData) {
    try {
      const id = await db.pendingTransactions.add({
        data: transactionData,
        timestamp: new Date().toISOString(),
        synced: false
      });
      console.log('✓ Pending transaction saved:', id);
      return id;
    } catch (error) {
      console.error('Error saving pending transaction:', error);
      throw error;
    }
  },

  async getPendingTransactions() {
    try {
      return await db.pendingTransactions.where('synced').equals(false).toArray();
    } catch (error) {
      console.error('Error getting pending transactions:', error);
      return [];
    }
  },

  async markTransactionSynced(id) {
    try {
      await db.pendingTransactions.update(id, { synced: true });
      console.log('✓ Transaction marked as synced:', id);
    } catch (error) {
      console.error('Error marking transaction as synced:', error);
    }
  },

  // Sync Queue (for any offline operations)
  async addToSyncQueue(type, data) {
    try {
      const id = await db.syncQueue.add({
        type,
        data,
        timestamp: new Date().toISOString(),
        synced: false
      });
      console.log(`✓ Added to sync queue (${type}):`, id);
      return id;
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  },

  async getSyncQueue() {
    try {
      return await db.syncQueue.where('synced').equals(false).toArray();
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  },

  async markSynced(id) {
    try {
      await db.syncQueue.update(id, { synced: true });
      console.log('✓ Sync queue item marked as synced:', id);
    } catch (error) {
      console.error('Error marking sync queue item as synced:', error);
    }
  },

  async clearSyncedItems() {
    try {
      const deleted = await db.syncQueue.where('synced').equals(true).delete();
      console.log('✓ Cleared synced items:', deleted);
    } catch (error) {
      console.error('Error clearing synced items:', error);
    }
  },

  // General
  async clearAll() {
    try {
      await db.books.clear();
      await db.publishers.clear();
      await db.transactions.clear();
      await db.pendingTransactions.clear();
      await db.syncQueue.clear();
      console.log('✓ All IndexedDB data cleared');
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
    }
  }
};

export default db;