// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Menu, X, BarChart3, Package, ShoppingCart, FileText, LogOut, Users } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Billing from './components/Billing';
import Reports from './components/Reports';
import Analytics from './components/Analytics';
import OfflineIndicator from './components/OfflineIndicator';
import { useAuth } from './hooks/useAuth';
import { booksAPI, publishersAPI } from './services/offlineApi';
import syncManager from './utils/syncManager';

function App() {
  const { isAuthenticated, login, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [books, setBooks] = useState([]);  
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      loadUserInfo();
      
      // Start background sync
      syncManager.startAutoSync(30000); // Sync every 30 seconds
      
      // Listen for sync events to reload data
      const handleDataSync = () => {
        console.log('🔄 Data synced - reloading...');
        loadData();
      };
      
      window.addEventListener('dataSync', handleDataSync);
      
      return () => {
        window.removeEventListener('dataSync', handleDataSync);
      };
    } else {
      // Stop sync when logged out
      syncManager.stopAutoSync();
    }
  }, [isAuthenticated]);

  const loadUserInfo = async () => {
    try {
      const response = await apiClient.get('/staff/');
      const staffData = response.data.results || response.data;
      
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.user_id;
        
        const currentUserStaff = Array.isArray(staffData) 
          ? staffData.find(staff => staff.user === userId)
          : null;
        
        if (currentUserStaff) {
          setUserInfo({
            name: currentUserStaff.name,
            role: currentUserStaff.role,
            email: currentUserStaff.email
          });
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserInfo({
        name: 'User',
        role: 'CLERK',
        email: ''
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📄 Loading data...');
      
      // Use offline-aware APIs
      const [booksData, publishersData] = await Promise.all([
        booksAPI.getAll(),
        publishersAPI.getAll(),
      ]);
      
      console.log('📚 Books loaded:', booksData);
      console.log('🏢 Publishers loaded:', publishersData);
      
      setBooks(booksData);
      setPublishers(publishersData);
      
      console.log('✅ State updated');
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Show user-friendly message
      if (!navigator.onLine) {
        console.log('📴 Loading from offline cache');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-blue-800">
            <h1 className="text-2xl font-bold">FRC Library POS</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden hover:bg-blue-800 p-2 rounded"
            >
              <X size={24} />
            </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'dashboard' ? 'bg-blue-800' : 'hover:bg-blue-800'
              }`}
            >
              <BarChart3 size={20} />
              <span>Dashboard</span>
            </button>
            
            <button
              onClick={() => setCurrentView('inventory')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'inventory' ? 'bg-blue-800' : 'hover:bg-blue-800'
              }`}
            >
              <Package size={20} />
              <span>Inventory</span>
            </button>
            
            <button
              onClick={() => setCurrentView('billing')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'billing' ? 'bg-blue-800' : 'hover:bg-blue-800'
              }`}
            >
              <ShoppingCart size={20} />
              <span>Billing</span>
            </button>
            
            <button
              onClick={() => setCurrentView('reports')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'reports' ? 'bg-blue-800' : 'hover:bg-blue-800'
              }`}
            >
              <FileText size={20} />
              <span>Reports</span>
            </button>
            
            <button
              onClick={() => setCurrentView('analytics')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'analytics' ? 'bg-blue-800' : 'hover:bg-blue-800'
              }`}
            >
              <BarChart3 size={20} />
              <span>Analytics</span>
            </button>
          </nav>
        </div>
        
        <div className="absolute bottom-0 w-64 p-4 border-t border-blue-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
              <Users size={20} />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                {userInfo ? userInfo.name : 'Loading...'}
              </div>
              <div className="text-xs text-blue-300">
                {userInfo ? userInfo.role : ''}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-blue-800 hover:bg-blue-700 rounded-lg transition"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={`fixed top-4 left-4 z-20 lg:hidden bg-blue-900 text-white p-2 rounded-lg ${
          sidebarOpen ? 'hidden' : 'block'
        }`}
      >
        <Menu size={24} />
      </button>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <div className="p-8">
          {currentView === 'dashboard' && (
            <Dashboard books={books} publishers={publishers} />
          )}
          {currentView === 'inventory' && (
            <Inventory 
              books={books} 
              publishers={publishers} 
              onBooksUpdate={loadData}
            />
          )}
          {currentView === 'billing' && (
            <Billing 
              books={books} 
              publishers={publishers}
              onTransactionComplete={loadData}
            />
          )}
          {currentView === 'reports' && (
            <Reports books={books} />
          )}
          {currentView === 'analytics' && <Analytics />}
        </div>
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default App;