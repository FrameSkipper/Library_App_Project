import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { analyticsAPI } from '../services/api';

function Analytics() {
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAllAnalytics();
  }, [period, days]);

  const loadAllAnalytics = async () => {
    setLoading(true);
    try {
      const [sales, inventory, customer] = await Promise.all([
        analyticsAPI.getSalesAnalytics(period, days),
        analyticsAPI.getInventoryAnalytics(),
        analyticsAPI.getCustomerAnalytics(days),
      ]);
      
      setSalesData(sales);
      setInventoryData(inventory);
      setCustomerData(customer);
    } catch (error) {
      console.error('Error loading analytics:', error);
      alert('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify({
      salesData,
      inventoryData,
      customerData,
      exportDate: new Date().toISOString()
    }, null, 2);
    
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
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
            <p className="text-gray-600">Comprehensive insights into your library operations</p>
          </div>
          
          <div className="flex gap-3">
            {/* Period Selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            
            {/* Days Range */}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            
            {/* Action Buttons */}
            <button
              onClick={loadAllAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            
            <button
              onClick={exportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 border-b">
          {['overview', 'sales', 'inventory', 'customers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={`$${salesData?.overall_metrics?.total_revenue?.toFixed(2) || '0.00'}`}
              change={salesData?.overall_metrics?.growth_rate || 0}
              icon={<DollarSign size={24} />}
              color="green"
            />
            
            <MetricCard
              title="Transactions"
              value={salesData?.overall_metrics?.total_transactions || 0}
              icon={<ShoppingCart size={24} />}
              color="blue"
            />
            
            <MetricCard
              title="Avg Transaction"
              value={`$${salesData?.overall_metrics?.avg_transaction_value?.toFixed(2) || '0.00'}`}
              icon={<TrendingUp size={24} />}
              color="purple"
            />
            
            <MetricCard
              title="Inventory Value"
              value={`$${inventoryData?.total_inventory?.total_value?.toFixed(2) || '0.00'}`}
              icon={<Package size={24} />}
              color="orange"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Over Time */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Sales Trend</h3>
              <SalesChart data={salesData?.sales_over_time || []} period={period} />
            </div>
            
            {/* Stock Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Stock Distribution</h3>
              <StockDistributionChart data={inventoryData?.stock_distribution || {}} />
            </div>
          </div>

          {/* Top Selling Books */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">Top Selling Books</h3>
            <TopBooksTable books={salesData?.top_selling_books || []} />
          </div>
        </>
      )}

      {/* Sales Tab */}
      {activeTab === 'sales' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detailed Sales Chart */}
            <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
              <h3 className="text-lg font-bold mb-4">Sales Performance</h3>
              <DetailedSalesChart data={salesData?.sales_over_time || []} />
            </div>
            
            {/* Staff Performance */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Staff Performance</h3>
              <StaffPerformanceTable staff={salesData?.staff_performance || []} />
            </div>
            
            {/* Revenue Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Revenue Analysis</h3>
              <RevenueBreakdown data={salesData} />
            </div>
          </div>
        </>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Overview */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Inventory Overview</h3>
              <InventoryOverview data={inventoryData?.total_inventory || {}} />
            </div>
            
            {/* Value by Publisher */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Value by Publisher</h3>
              <PublisherValueChart data={inventoryData?.value_by_publisher || []} />
            </div>
            
            {/* Restock Needed */}
            <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
              <h3 className="text-lg font-bold mb-4">Books Needing Restock</h3>
              <RestockTable books={inventoryData?.restock_needed || []} />
            </div>
          </div>
        </>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Patterns */}
            <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
              <h3 className="text-lg font-bold mb-4">Frequently Purchased Together</h3>
              <FrequentPairsTable pairs={customerData?.frequent_pairs || []} />
            </div>
            
            {/* Customer Metrics */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Customer Metrics</h3>
              <CustomerMetrics data={customerData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, change, icon, color }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Simple Bar Chart Component (using CSS)
function SalesChart({ data, period }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">No data available</p>;
  }

  const maxValue = Math.max(...data.map(d => d.total_sales || 0));

  return (
    <div className="space-y-2">
      {data.map((item, index) => {
        const height = maxValue > 0 ? (item.total_sales / maxValue) * 100 : 0;
        const date = new Date(item.period).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        
        return (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-24">{date}</span>
            <div className="flex-1 bg-gray-100 rounded-full overflow-hidden h-8">
              <div
                className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                style={{ width: `${height}%` }}
              >
                {height > 20 && (
                  <span className="text-white text-xs font-medium">
                    ${item.total_sales?.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            {height <= 20 && (
              <span className="text-xs text-gray-600 w-16">
                ${item.total_sales?.toFixed(2)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Stock Distribution Donut (using CSS circles)
function StockDistributionChart({ data }) {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  
  const distribution = [
    { label: 'Out of Stock', value: data.out_of_stock, color: 'bg-red-500' },
    { label: 'Low Stock', value: data.low_stock, color: 'bg-orange-500' },
    { label: 'Medium Stock', value: data.medium_stock, color: 'bg-yellow-500' },
    { label: 'High Stock', value: data.high_stock, color: 'bg-green-500' }
  ];

  return (
    <div className="space-y-4">
      {distribution.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-medium">
                {item.value} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`${item.color} h-3 rounded-full transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Top Books Table
function TopBooksTable({ books }) {
  if (!books || books.length === 0) {
    return <p className="text-gray-500 text-center py-8">No data available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {books.map((book, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                #{index + 1}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{book.book__title}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{book.book__author}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                {book.total_quantity}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                ${book.total_revenue?.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Additional component stubs (implement based on your needs)
function DetailedSalesChart({ data }) {
  return <SalesChart data={data} />;
}

function StaffPerformanceTable({ staff }) {
  if (!staff || staff.length === 0) {
    return <p className="text-gray-500 text-center py-8">No staff data available</p>;
  }

  return (
    <div className="space-y-3">
      {staff.map((member, index) => (
        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">{member.staff__name}</p>
            <p className="text-sm text-gray-600">{member.transaction_count} transactions</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-green-600">${member.total_sales?.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Avg: ${member.avg_sale?.toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RevenueBreakdown({ data }) {
  const metrics = data?.overall_metrics || {};
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
        <span className="text-gray-700">Current Period</span>
        <span className="text-xl font-bold text-green-600">
          ${metrics.total_revenue?.toFixed(2) || '0.00'}
        </span>
      </div>
      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
        <span className="text-gray-700">Previous Period</span>
        <span className="text-xl font-bold text-gray-600">
          ${metrics.previous_period_revenue?.toFixed(2) || '0.00'}
        </span>
      </div>
      <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
        <span className="text-gray-700">Growth Rate</span>
        <span className={`text-xl font-bold ${metrics.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {metrics.growth_rate >= 0 ? '+' : ''}{metrics.growth_rate?.toFixed(2) || '0.00'}%
        </span>
      </div>
    </div>
  );
}

function InventoryOverview({ data }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between p-3 border-b">
        <span className="text-gray-600">Total Books</span>
        <span className="font-bold">{data.total_books || 0}</span>
      </div>
      <div className="flex justify-between p-3 border-b">
        <span className="text-gray-600">Unique Titles</span>
        <span className="font-bold">{data.unique_titles || 0}</span>
      </div>
      <div className="flex justify-between p-3 border-b">
        <span className="text-gray-600">Total Value</span>
        <span className="font-bold text-green-600">${data.total_value?.toFixed(2) || '0.00'}</span>
      </div>
      <div className="flex justify-between p-3">
        <span className="text-gray-600">Avg Price</span>
        <span className="font-bold">${data.avg_price?.toFixed(2) || '0.00'}</span>
      </div>
    </div>
  );
}

function PublisherValueChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">No publisher data</p>;
  }

  const maxValue = Math.max(...data.map(p => p.total_value || 0));

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((publisher, index) => {
        const percentage = maxValue > 0 ? (publisher.total_value / maxValue) * 100 : 0;
        
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">{publisher.pub__name}</span>
              <span className="font-medium text-green-600">
                ${publisher.total_value?.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RestockTable({ books }) {
  if (!books || books.length === 0) {
    return <p className="text-gray-500 text-center py-8">No books need restocking</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-red-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Publisher</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {books.map((book, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{book.title}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{book.author}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{book.pub__name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                <span className={`font-medium ${book.stock_qty === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                  {book.stock_qty}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                ${book.unit_price?.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FrequentPairsTable({ pairs }) {
  if (!pairs || pairs.length === 0) {
    return <p className="text-gray-500 text-center py-8">No purchase patterns found</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book 1</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book 2</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Times Together</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pairs.map((pair, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{pair.book1}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{pair.book2}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                {pair.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerMetrics({ data }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Avg Items per Transaction</p>
        <p className="text-2xl font-bold text-blue-600">
          {data?.avg_items_per_transaction?.toFixed(2) || '0.00'}
        </p>
      </div>
    </div>
  );
}

export default Analytics;