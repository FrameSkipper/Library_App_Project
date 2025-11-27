// frontend/src/services/api.js
import axios from 'axios';

// Auto-detect API base URL
function getApiBaseUrl() {
  // Check environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For production Vercel deployment, use Railway backend
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://libraryappproject-production.up.railway.app/api';
  }
  
  // For local development
  return 'http://localhost:8000/api';
}

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 API_BASE_URL:', API_BASE_URL);

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 API Request:', config.method.toUpperCase(), config.url, config.headers.Authorization ? '✓ Authenticated' : '⚠️ No token');
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.method.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status);
    
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/token/`, {
      username,
      password,
    });
    
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    console.log('✓ Login successful, tokens saved');
    
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    console.log('✓ Logout successful, tokens cleared');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};

// Books API
export const booksAPI = {
  getAll: async (searchTerm = '') => {
    try {
      const response = await apiClient.get('/books/', {
        params: searchTerm ? { search: searchTerm } : {},
      });
      console.log('📚 Books loaded:', response.data);
      // Handle both array and paginated responses
      if (response.data.results) {
        return response.data.results;
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('❌ Failed to load books:', error);
      throw error;
    }
  },

  getById: async (id) => {
    const response = await apiClient.get(`/books/${id}/`);
    return response.data;
  },

  create: async (bookData) => {
    const dataToSend = {
      title: bookData.title,
      author: bookData.author,
      isbn: bookData.isbn,
      stock_qty: parseInt(bookData.stock_qty) || 0,
      unit_price: parseFloat(bookData.unit_price) || 0,
      pub_id: parseInt(bookData.pub_id) 
    };
    
    console.log('📝 Creating book:', dataToSend);
    
    const response = await apiClient.post('/books/', dataToSend);
    console.log('✓ Book created:', response.data);
    return response.data;
  },

  update: async (id, bookData) => {
    const dataToSend = {
      title: bookData.title,
      author: bookData.author,
      isbn: bookData.isbn,
      stock_qty: parseInt(bookData.stock_qty) || 0,
      unit_price: parseFloat(bookData.unit_price) || 0,
      pub_id: parseInt(bookData.pub_id)
    };
    
    console.log('📝 Updating book:', dataToSend);
    
    const response = await apiClient.put(`/books/${id}/`, dataToSend);
    console.log('✓ Book updated:', response.data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/books/${id}/`);
    console.log('✓ Book deleted:', id);
    return response.data;
  },

  getLowStock: async () => {
    const response = await apiClient.get('/books/low_stock/');
    return response.data;
  },
};

// Publishers API
export const publishersAPI = {
  getAll: async () => {
    try {
      const response = await apiClient.get('/publishers/');
      console.log('🏢 Publishers loaded:', response.data);
      // Django REST Framework returns paginated data with 'results' key
      return response.data.results || response.data;
    } catch (error) {
      console.error('❌ Failed to load publishers:', error);
      throw error;
    }
  },

  create: async (publisherData) => {
    console.log('📝 Creating publisher:', publisherData);
    const response = await apiClient.post('/publishers/', publisherData);
    console.log('✓ Publisher created:', response.data);
    return response.data;
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: async () => {
    try {
      const response = await apiClient.get('/transactions/');
      console.log('💳 Transactions loaded:', response.data);
      return response.data.results || response.data;
    } catch (error) {
      console.error('❌ Failed to load transactions:', error);
      throw error;
    }
  },

  create: async (transactionData) => {
    console.log('📝 Creating transaction:', transactionData);
    const response = await apiClient.post('/transactions/', transactionData);
    console.log('✓ Transaction created:', response.data);
    return response.data;
  },

  getToday: async () => {
    try {
      const response = await apiClient.get('/transactions/today/');
      console.log('✓ Today\'s transactions:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load today\'s transactions:', error);
      throw error;
    }
  },

  getStats: async (period = 'daily') => {
    const response = await apiClient.get('/transactions/stats/', {
      params: { period },
    });
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  generateSalesReport: async (period = 'daily') => {
    const response = await apiClient.get('/reports/sales_report/', {
      params: { period },
    });
    return response.data;
  },

  generateInventoryReport: async () => {
    const response = await apiClient.get('/reports/inventory_report/');
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getCustomerAnalytics: async (days = 30) => {
    try {
      const response = await apiClient.get('/analytics/customers/', {
        params: { days },
      });
      console.log('👥 Customer analytics loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load customer analytics:', error);
      throw error;
    }
  },

  getInventoryAnalytics: async (days = 30) => {
    try {
      const response = await apiClient.get('/analytics/inventory/', {
        params: { days },
      });
      console.log('📦 Inventory analytics loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load inventory analytics:', error);
      throw error;
    }
  },

  getSalesAnalytics: async (days = 30) => {
    try {
      const response = await apiClient.get('/analytics/sales/', {
        params: { days },
      });
      console.log('💰 Sales analytics loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load sales analytics:', error);
      throw error;
    }
  },

  getSalesPerPeriod: async (period = 'daily', days = 30) => {
    try {
      const response = await apiClient.get('/analytics/per_period/', {
        params: { period, days },
      });
      console.log('📊 Sales per period loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load sales per period:', error);
      throw error;
    }
  },
};

export default apiClient;