// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Menu, X, BarChart3, Package, ShoppingCart, FileText, LogOut, Users } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Billing from './components/Billing';
import Reports from './components/Reports';
import { useAuth } from './hooks/useAuth';
import { booksAPI, publishersAPI } from './services/api';
import apiClient from './services/api';
import Analytics from './components/Analytics';
import InstallPrompt from './components/InstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';

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
    }
  }, [isAuthenticated]);

  const loadUserInfo = async () => {
    try {
      // Fetch current user's staff profile
      const response = await apiClient.get('/staff/');
      const staffData = response.data.results || response.data;
      
      // Get the JWT token to find the user ID
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.user_id;
        
        // Find the staff profile for the current user
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
      // Fallback to default if we can't load user info
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
    console.error('❌ Error loading data:', error);
    alert('Failed to load data: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const handleLogout = () => {
    logout();
    setCurrentView('dashboard');
    setUserInfo(null);
  };

  // Helper function to display role nicely
  const getRoleDisplay = (role) => {
    const roleMap = {
      'ADMIN': 'Administrator',
      'MANAGER': 'Manager',
      'CLERK': 'Clerk',
      'DOCUMENTALIST': 'Documentalist'
    };
    return roleMap[role] || role;
  };

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <>
    <InstallPrompt />
    <OfflineIndicator />
    <div className="flex h-screen bg-gray-50">
      <div className="flex h-screen bg-gray-50">
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-blue-900 text-white transition-all duration-300 overflow-hidden relative`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-8">FRC Library POS</h1>
          
          <nav className="space-y-2">
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
                {userInfo ? getRoleDisplay(userInfo.role) : ''}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 p-2 bg-blue-800 rounded-lg hover:bg-blue-700 transition"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <h2 className="text-2xl font-bold text-gray-800">
              {currentView === 'dashboard' && 'Dashboard'}
              {currentView === 'inventory' && 'Inventory Management'}
              {currentView === 'billing' && 'Billing & Sales'}
              {currentView === 'reports' && 'Reports & Transactions'}
              {currentView === 'analytics' && 'Analytics'}
            </h2>
            
            <div className="w-10"></div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <Dashboard books={books} onRefresh={loadData} />
              )}
              {currentView === 'inventory' && (
                <Inventory 
                  books={books} 
                  publishers={publishers}
                  onRefresh={loadData} 
                />
              )}
              {currentView === 'billing' && (
                <Billing books={books} onRefresh={loadData} />
              )}
              {currentView === 'reports' && (
                <Reports />
              )}
              {currentView === 'analytics' && (
                <Analytics />
              )}
            </>
          )}
        </main>
      </div>
    </div>
    </div>
  </>
  );
}

export default App;// Force rebuild Mon, Nov 24, 2025 11:00:19 PM
