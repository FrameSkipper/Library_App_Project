import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { booksAPI, publishersAPI, transactionsAPI } from '../services/offlineApi';

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [analytics, setAnalytics] = useState({
    customer: null,
    inventory: null,
    sales: null,
  });
  const [transactions, setTransactions] = useState([]);
  const [books, setBooks] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      console.log('📊 Loading analytics data...');
      
      // Load all analytics data in parallel
      const [customerData, inventoryData, salesData, transData, booksData] = await Promise.all([
        analyticsAPI.getCustomerAnalytics(period),
        analyticsAPI.getInventoryAnalytics(period),
        analyticsAPI.getSalesAnalytics(period),
        transactionsAPI.getAll(),
        booksAPI.getAll(),
      ]);

      setAnalytics({
        customer: customerData,
        inventory: inventoryData,
        sales: salesData,
      });
      
      setTransactions(Array.isArray(transData) ? transData : []);
      setBooks(Array.isArray(booksData) ? booksData : []);
      
      console.log('✅ Analytics loaded successfully');
    } catch (error) {
      console.error('Error loading analytics:', error);
      alert('Failed to load analytics data. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(
      {
        analytics,
        transactions,
        books,
        exportDate: new Date().toISOString(),
        period,
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
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate derived metrics
  const totalRevenue = analytics.sales?.total_revenue || 0;
  const totalTransactions = analytics.sales?.total_transactions || 0;
  const avgTransaction = analytics.sales?.avg_transaction_value || 0;
  const totalBooks = analytics.inventory?.total_stock_quantity || 0;

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={28} />
              Analytics Dashboard
            </h2>
            <p className="text-gray-600">Comprehensive insights into your library operations</p>
          </div>

          <div className="flex gap-3">
            {/* Days Range */}
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>

            {/* Action Buttons */}
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={exportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={<DollarSign size={24} />}
          color="green"
          subtitle={`${period} days`}
        />

        <MetricCard
          title="Transactions"
          value={totalTransactions}
          icon={<ShoppingCart size={24} />}
          color="blue"
          subtitle={`Avg: $${avgTransaction.toFixed(2)}`}
        />

        <MetricCard
          title="Total Books in Stock"
          value={totalBooks}
          icon={<Package size={24} />}
          color="purple"
          subtitle={`${analytics.inventory?.total_books || 0} unique titles`}
        />

        <MetricCard
          title="Inventory Value"
          value={`$${(analytics.inventory?.total_inventory_value || 0).toFixed(2)}`}
          icon={<TrendingUp size={24} />}
          color="orange"
          subtitle="Total stock value"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Low Stock Items</h3>
          <p className="text-3xl font-bold text-orange-600">
            {analytics.inventory?.low_stock_items || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Items with stock ≤ 10</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Out of Stock</h3>
          <p className="text-3xl font-bold text-red-600">
            {analytics.inventory?.out_of_stock_items || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Items with 0 stock</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Book Value</h3>
          <p className="text-3xl font-bold text-blue-600">
            ${(analytics.inventory?.avg_book_value || 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Per title in stock</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ShoppingCart size={20} />
          Recent Transactions
        </h3>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400 mt-2">Complete a sale in the Billing section to see data here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.slice(0, 10).map((trans) => (
                  <tr key={trans.trans_id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{trans.trans_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(trans.trans_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {trans.staff_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      ${parseFloat(trans.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales Chart */}
      {analytics.sales?.sales_by_date && analytics.sales.sales_by_date.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Sales Over Time
          </h3>
          <SalesChart data={analytics.sales.sales_by_date} />
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon, color, subtitle }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div>
        <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
      </div>
    </div>
  );
}

// Sales Chart Component
function SalesChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No sales data available</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="space-y-3">
      {data.slice(-10).map((item, index) => {
        const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;

        return (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-28 flex-shrink-0">
              {new Date(item.date).toLocaleDateString()}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full overflow-hidden h-10">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                style={{ width: `${Math.max(height, 5)}%` }}
              >
                {height > 15 && (
                  <span className="text-white text-sm font-medium">
                    ${item.revenue.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            {height <= 15 && (
              <span className="text-sm text-gray-600 w-20 text-right">
                ${item.revenue.toFixed(2)}
              </span>
            )}
            <span className="text-xs text-gray-500 w-16 text-right">
              {item.transactions} {item.transactions === 1 ? 'sale' : 'sales'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default Analytics;