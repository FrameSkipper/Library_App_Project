import React, { useState, useEffect } from 'react';
import { Package, BarChart3, FileText, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { booksAPI, publishersAPI, transactionsAPI } from '../services/offlineApi';

function Dashboard({ books, onRefresh }) {
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalValue: 0,
    bookTitles: 0,
    lowStockCount: 0,
  });

  const [todayActivity, setTodayActivity] = useState({
    sales: 0,
    transactions: 0,
    avgTransaction: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (books && Array.isArray(books)) {
      calculateStats();
    }
  }, [books]);

  useEffect(() => {
    loadTodayActivity();
  }, []);

  const calculateStats = () => {
    const totalBooks = books.reduce((sum, book) => sum + (book.stock_qty || 0), 0);
    const totalValue = books.reduce((sum, book) => sum + ((book.stock_qty || 0) * (book.unit_price || 0)), 0);
    const lowStockCount = books.filter(book => (book.stock_qty || 0) < 5).length;

    setStats({
      totalBooks,
      totalValue: totalValue.toFixed(2),
      bookTitles: books.length,
      lowStockCount,
    });
  };

  const loadTodayActivity = async () => {
    setLoading(true);
    try {
      // Fetch all transactions
      const transactions = await transactionsAPI.getAll();
      console.log('✓ Transactions loaded for dashboard:', transactions);

      // Filter for today's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTransactions = Array.isArray(transactions)
        ? transactions.filter(trans => {
            const transDate = new Date(trans.trans_date);
            return transDate >= today;
          })
        : [];

      console.log('✓ Today\'s transactions:', todayTransactions);

      // Calculate today's stats
      const totalSales = todayTransactions.reduce(
        (sum, trans) => sum + parseFloat(trans.total_amount || 0),
        0
      );

      const transactionCount = todayTransactions.length;
      const avgTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;

      setTodayActivity({
        sales: totalSales,
        transactions: transactionCount,
        avgTransaction: avgTransaction,
      });
    } catch (error) {
      console.error('✗ Error loading today\'s activity:', error);
      // Set to zero on error
      setTodayActivity({
        sales: 0,
        transactions: 0,
        avgTransaction: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const lowStockBooks = books && Array.isArray(books) 
    ? books.filter(book => (book.stock_qty || 0) < 5)
    : [];

  const topBooks = books && Array.isArray(books) 
    ? books.slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Books</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalBooks}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="text-blue-600" size={32} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Inventory Value</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">${stats.totalValue}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="text-green-600" size={32} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Book Titles</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.bookTitles}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="text-purple-600" size={32} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Low Stock Items</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.lowStockCount}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockBooks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-red-500 mt-1 flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2">Low Stock Alert</h3>
              <p className="text-sm text-red-700 mb-3">The following books have low stock levels (less than 5):</p>
              <div className="space-y-2">
                {lowStockBooks.map(book => (
                  <div key={book.book_id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
                    <div>
                      <span className="font-medium text-gray-900">{book.title}</span>
                      <span className="text-sm text-gray-500 ml-2">by {book.author}</span>
                    </div>
                    <span className="text-red-600 font-bold text-lg">{book.stock_qty} left</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Activity - NOW FUNCTIONAL */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Today's Activity</h3>
            <div className="flex items-center space-x-2">
              <TrendingUp className="text-green-500" size={20} />
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Sales</span>
                <span className="font-bold text-green-600">
                  ${todayActivity.sales.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Transactions</span>
                <span className="font-bold text-gray-900">
                  {todayActivity.transactions}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Avg Transaction</span>
                <span className="font-bold text-gray-900">
                  ${todayActivity.avgTransaction.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={loadTodayActivity}
            disabled={loading}
            className="mt-4 w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Refreshing...' : 'Refresh Activity'}
          </button>
        </div>
        
        {/* Books in Inventory */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Books in Inventory</h3>
            <BarChart3 className="text-blue-500" size={20} />
          </div>
          <div className="space-y-3">
            {topBooks.length > 0 ? (
              topBooks.map((book, index) => (
                <div key={book.book_id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div className="flex-1">
                    <span className="text-gray-700 font-medium">{book.title}</span>
                    <span className="text-sm text-gray-500 block">{book.author}</span>
                  </div>
                  <span className={`font-bold ${book.stock_qty < 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {book.stock_qty} in stock
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No books in inventory yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Welcome Message if no books */}
      {(!books || books.length === 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Package className="text-blue-500 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to Library POS!</h3>
          <p className="text-gray-600 mb-4">
            Get started by adding books to your inventory.
          </p>
          <button
            onClick={onRefresh}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Refresh Data
          </button>
        </div>
      )}
    </div>
    
  );
}

export default Dashboard;