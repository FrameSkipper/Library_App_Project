// frontend/src/services/api.js
import axios from 'axios';
import { db } from '../utils/db';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
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
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
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
    
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
      // Handle both array and paginated responses
      if (response.data.results) {
        return response.data.results;
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      // If offline, return cached data
      if (!navigator.onLine) {
        await db.init();
        const cachedBooks = await db.getBooks();
        console.log('Using cached books (offline mode)');
        return cachedBooks;
      }
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
    
    console.log('Sending book data:', dataToSend);
    
    const response = await apiClient.post('/books/', dataToSend);
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
    
    console.log('Updating book data:', dataToSend); // Debug log
    
    const response = await apiClient.put(`/books/${id}/`, dataToSend);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/books/${id}/`);
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
    const response = await apiClient.get('/publishers/');
    // Django REST Framework returns paginated data with 'results' key
    return response.data.results || response.data;
  },

  create: async (publisherData) => {
    const response = await apiClient.post('/publishers/', publisherData);
    return response.data;
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: async () => {
    const response = await apiClient.get('/transactions/');
    return response.data.results || response.data;
  },
  
  create: async (transactionData) => {
    const response = await apiClient.post('/transactions/', transactionData);
    return response.data;
  },

  getToday: async () => {
    const response = await apiClient.get('/transactions/today/');
    return response.data;
  },

  getStats: async (period = 'daily') => {
    const response = await apiClient.get('/transactions/stats/', {
      params: { period },
    });
    return response.data;
  },
  create: async (transactionData) => {
    try {
      const response = await apiClient.post('/transactions/', transactionData);
      return response.data;
    } catch (error) {
      // If offline, save to pending transactions
      if (!navigator.onLine) {
        await db.init();
        await db.savePendingTransaction(transactionData);
        
        // Register background sync
        if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-transactions');
        }
        
        throw new Error('Transaction saved offline. Will sync when online.');
      }
      throw error;
    }
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

export const analyticsAPI = {
  getSalesAnalytics: async (period = 'daily', days = 30) => {
    const response = await apiClient.get('/analytics/sales/', {
      params: { period, days },
    });
    return response.data;
  },

  getInventoryAnalytics: async () => {
    const response = await apiClient.get('/analytics/inventory/');
    return response.data;
  },

  getCustomerAnalytics: async (days = 30) => {
    const response = await apiClient.get('/analytics/customers/', {
      params: { days },
    });
    return response.data;
  },
};

export default apiClient;