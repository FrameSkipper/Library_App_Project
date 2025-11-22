import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, ShoppingCart, TrendingUp, Calendar, User, Download } from 'lucide-react';
import { transactionsAPI } from '../services/api';

function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [transactions]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await transactionsAPI.getAll();
      console.log('Transactions loaded:', data);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      alert('Failed to load transactions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const filtered = getFilteredTransactions();
    const totalSales = filtered.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);
    const totalTransactions = filtered.length;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    setStats({
      totalSales,
      totalTransactions,
      averageTransaction,
    });
  };

  const getFilteredTransactions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return transactions.filter(t => {
      const transDate = new Date(t.trans_date);
      
      switch(filter) {
        case 'today':
          return transDate >= today;
        case 'week':
          return transDate >= weekAgo;
        case 'month':
          return transDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const filtered = getFilteredTransactions();
    
    // CSV Headers
    let csv = 'Transaction ID,Date,Staff,Customer,Total Amount\n';
    
    // CSV Data
    filtered.forEach(t => {
      csv += `${t.trans_id},"${formatDate(t.trans_date)}","${t.staff_name || 'N/A'}","${t.customer_name || 'Walk-in'}",${t.total_amount}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${filter}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>
        <div className="flex items-center space-x-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sales</p>
              <p className="text-3xl font-bold text-green-600">
                ${stats.totalSales.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="text-green-600" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Transactions</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.totalTransactions}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <ShoppingCart className="text-blue-600" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg. Transaction</p>
              <p className="text-3xl font-bold text-purple-600">
                ${stats.averageTransaction.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="text-purple-600" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Transaction History ({filteredTransactions.length})
          </h3>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="text-gray-300 mx-auto mb-4" size={64} />
            <p className="text-gray-600 text-lg">No transactions found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filter !== 'all' ? 'Try changing the filter period' : 'Complete a sale to see it here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.trans_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        #{transaction.trans_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={14} className="mr-2" />
                        {formatDate(transaction.trans_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <User size={14} className="mr-2 text-gray-400" />
                        {transaction.staff_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-green-600">
                        ${parseFloat(transaction.total_amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.details?.length || 0} items
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;