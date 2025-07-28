import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (userData: any) =>
    api.post('/auth/register', userData),
  getCurrentUser: () =>
    api.get('/auth/me'),
  refreshToken: () =>
    api.post('/auth/refresh'),
};

// Equipment API
export const equipmentAPI = {
  getAll: (params = {}) =>
    api.get('/equipment', { params }),
  getById: (id: string) =>
    api.get(`/equipment/${id}`),
  create: (data: any) =>
    api.post('/equipment', data),
  update: (id: string, data: any) =>
    api.put(`/equipment/${id}`, data),
  delete: (id: string) =>
    api.delete(`/equipment/${id}`),
  getCategories: () =>
    api.get('/equipment/categories/all'),
  createCategory: (data: any) =>
    api.post('/equipment/categories', data),
};

// Requests API
export const requestsAPI = {
  getAll: (params = {}) =>
    api.get('/requests', { params }),
  getById: (id: string) =>
    api.get(`/requests/${id}`),
  create: (data: any) =>
    api.post('/requests', data),
  updateStatus: (id: string, data: any) =>
    api.put(`/requests/${id}`, data),
  markAsReturned: (id: string, data: any) =>
    api.post(`/requests/${id}/return`, data),
  getDashboardStats: () =>
    api.get('/requests/stats/dashboard'),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params = {}) =>
    api.get('/notifications', { params }),
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
  markAsRead: (id: string) =>
    api.put(`/notifications/${id}/read`),
  markAllAsRead: () =>
    api.put('/notifications/mark-all-read'),
  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};

// Users API
export const usersAPI = {
  getAll: (params = {}) =>
    api.get('/users', { params }),
  getById: (id: string) =>
    api.get(`/users/${id}`),
  updateStatus: (id: string, isActive: boolean) =>
    api.put(`/users/${id}/status`, { isActive }),
  getStats: () =>
    api.get('/users/stats/overview'),
};

export default api;
