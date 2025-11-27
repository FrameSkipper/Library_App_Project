// frontend/src/App.jsx - Mobile-Optimized Version
import React, { useState, useEffect } from 'react';
import { Menu, X, BarChart3, Package, ShoppingCart, FileText, LogOut, Users, Home } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Billing from './components/Billing';
import Reports from './components/Reports';
import Analytics from './components/Analytics';
import { useAuth } from './hooks/useAuth';
import { booksAPI, publishersAPI } from './services/api';
import apiClient from './services/api';

function App() {
  const { isAuthenticated, login, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [books, setBooks] = useState([]);  
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Auto-close sidebar on mobile when view changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [currentView]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      loadUserInfo();
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentView('dashboard');
    setUserInfo(null);
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      'ADMIN': 'Administrator',
      'MANAGER': 'Manager',
      'CLERK': 'Clerk',
      'DOCUMENTALIST': 'Documentalist'
    };
    return roleMap[role] || role;
  };

  const handleNavClick = (view) => {
    setCurrentView(view);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-blue-800">
            <h1 className="text-xl lg:text-2xl font-bold">FRC Library POS</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden hover:bg-blue-800 p-2 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'dashboard' ? 'bg-blue-800 shadow-lg' : 'hover:bg-blue-800'
              }`}
            >
              <Home size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
            
            <button
              onClick={() => handleNavClick('inventory')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'inventory' ? 'bg-blue-800 shadow-lg' : 'hover:bg-blue-800'
              }`}
            >
              <Package size={20} />
              <span className="font-medium">Inventory</span>
            </button>
            
            <button
              onClick={() => handleNavClick('billing')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'billing' ? 'bg-blue-800 shadow-lg' : 'hover:bg-blue-800'
              }`}
            >
              <ShoppingCart size={20} />
              <span className="font-medium">Billing</span>
            </button>
            
            <button
              onClick={() => handleNavClick('reports')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'reports' ? 'bg-blue-800 shadow-lg' : 'hover:bg-blue-800'
              }`}
            >
              <FileText size={20} />
              <span className="font-medium">Reports</span>
            </button>
            
            <button
              onClick={() => handleNavClick('analytics')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
                currentView === 'analytics' ? 'bg-blue-800 shadow-lg' : 'hover:bg-blue-800'
              }`}
            >
              <BarChart3 size={20} />
              <span className="font-medium">Analytics</span>
            </button>
          </nav>
        </div>
        
        {/* User Info & Logout */}
        <div className="p-4 border-t border-blue-800 bg-blue-950">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
              <Users size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {userInfo ? userInfo.name : 'Loading...'}
              </div>
              <div className="text-xs text-blue-300 truncate">
                {userInfo ? getRoleDisplay(userInfo.role) : ''}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-blue-800 hover:bg-blue-700 rounded-lg transition"
          >
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {currentView === 'dashboard' && 'Dashboard'}
            {currentView === 'inventory' && 'Inventory'}
            {currentView === 'billing' && 'Billing'}
            {currentView === 'reports' && 'Reports'}
            {currentView === 'analytics' && 'Analytics'}
          </h2>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
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
      </main>
    </div>
  );
}

export default App;