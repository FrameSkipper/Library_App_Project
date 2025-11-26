import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import apiClient from '../services/api';

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('daily');
  
  // State for different analytics data
  const [summary, setSummary] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [customerData, setCustomerData] = useState(null);

  useEffect(() => {
    loadAllAnalytics();
  }, [period]);

  const loadAllAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📊 Loading analytics data...');
      
      const [summaryRes, inventoryRes, salesRes, customerRes] = await Promise.all([
        apiClient.get('/analytics/dashboard_summary/'),
        apiClient.get('/analytics/inventory/'),
        apiClient.get('/analytics/sales/', { params: { period } }),
        apiClient.get('/analytics/customer/'),
      ]);

      console.log('✅ Analytics loaded successfully');
      
      setSummary(summaryRes.data);
      setInventoryData(inventoryRes.data);
      setSalesData(salesRes.data);
      setCustomerData(customerRes.data);
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(
      {
        summary,
        inventory: inventoryData,
        sales: salesData,
        customer: customerData,
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadAllAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Comprehensive insights into your library operations</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Last 7 Days</option>
            <option value="weekly">Last 12 Weeks</option>
            <option value="monthly">Last 12 Months</option>
          </select>
          <button
            onClick={loadAllAnalytics}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${summary.today.revenue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.today.transactions} transactions
                </p>
              </div>
              <DollarSign className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${summary.week.revenue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.week.transactions} transactions
                </p>
              </div>
              <TrendingUp className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${summary.month.revenue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.month.transactions} transactions
                </p>
              </div>
              <Calendar className="text-purple-600" size={32} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${summary.inventory.total_value.toFixed(2)}
                </p>
                <p className="text-sm text-red-500 mt-1">
                  {summary.inventory.low_stock_items} low stock
                </p>
              </div>
              <Package className="text-orange-600" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Charts Row 1: Sales Trend & Top Books */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        {salesData && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData.sales_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" name="Revenue ($)" />
                <Line type="monotone" dataKey="transactions" stroke="#10B981" name="Transactions" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">${salesData.total_revenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-xl font-bold text-gray-900">{salesData.total_transactions}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg. Transaction</p>
                <p className="text-xl font-bold text-gray-900">${salesData.avg_transaction_value.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Selling Books */}
        {salesData && salesData.top_books && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Books</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {salesData.top_books.slice(0, 10).map((book, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{book.book__title}</p>
                    <p className="text-sm text-gray-600">{book.book__author}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{book.total_sold} sold</p>
                    <p className="text-sm text-gray-600">${parseFloat(book.revenue).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 2: Inventory Distribution & Stock Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Books by Publisher */}
        {inventoryData && inventoryData.books_by_publisher && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Books by Publisher</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inventoryData.books_by_publisher}
                  dataKey="count"
                  nameKey="publisher"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {inventoryData.books_by_publisher.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stock Distribution */}
        {inventoryData && inventoryData.stock_distribution && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryData.stock_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" name="Number of Books" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {inventoryData && inventoryData.low_stock_items && inventoryData.low_stock_items.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="text-red-600" size={24} />
            <h3 className="text-lg font-semibold text-red-900">Low Stock Alert</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryData.low_stock_items.map((book) => (
              <div key={book.book_id} className="bg-white p-4 rounded-lg border border-red-200">
                <p className="font-medium text-gray-900">{book.title}</p>
                <p className="text-sm text-gray-600">{book.author}</p>
                <p className="text-sm text-red-600 font-semibold mt-2">
                  Only {book.stock_qty} left in stock
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Customers */}
      {customerData && customerData.top_customers && customerData.top_customers.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
            <Users className="text-blue-600" size={24} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Transactions</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Spent</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Last Purchase</th>
                </tr>
              </thead>
              <tbody>
                {customerData.top_customers.map((customer, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{customer.name}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{customer.transactions}</td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-600">
                      ${customer.total_spent.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 text-sm">
                      {customer.last_purchase}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>{customerData.total_customers}</strong> unique customers | 
              <strong className="ml-2">{customerData.named_transactions}</strong> named transactions | 
              <strong className="ml-2">{customerData.anonymous_transactions}</strong> anonymous
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;