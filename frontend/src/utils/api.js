// frontend/src/utils/api.js
import axios from 'axios';

// ✅ Use Vite's environment variable format
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
console.log('🌍 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
});

// ✅ Automatically attach access token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');

  // If sending FormData, let the browser/axios set the Content-Type (including boundary)
  if (config && config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) delete config.headers['Content-Type'];
  }

  // Don't add token for login or register routes
  if (
    token &&
    !config.url.includes('/auth/login') &&
    !config.url.includes('/auth/register')
  ) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


// ✅ Optional: Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('🔒 Unauthorized - token may have expired');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('role');
      localStorage.removeItem('user');

      const currentPath = window.location.pathname;
      const isAuthPage =
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/register') ||
        currentPath.startsWith('/forgot-password') ||
        currentPath.startsWith('/reset-password');

      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
