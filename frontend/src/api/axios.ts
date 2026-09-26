import axios from 'axios';
import type { ApiError } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError: ApiError = {
      error: {
        code: error.response?.status || 500,
        message: error.response?.data?.detail || error.message || 'An unexpected error occurred',
        path: error.config?.url || '',
      },
    };
    return Promise.reject(normalizedError);
  }
);

export default apiClient;
