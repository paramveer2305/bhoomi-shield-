import axios from 'axios';
import type { ApiError } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Standardized API Error class that extends JavaScript Error and
 * preserves backward compatibility with the ApiError interface structure.
 */
export class ApiRequestError extends Error implements ApiError {
  code: number;
  path: string;
  error: {
    code: number;
    message: string;
    path: string;
  };

  constructor(message: string, code: number = 500, path: string = '') {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.path = path;
    this.error = {
      code,
      message,
      path,
    };
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

// Helper to extract descriptive error message
const extractErrorMessage = (error: any): string => {
  if (error.response?.data) {
    const data = error.response.data;

    // Backend returns `error: { message, code, path }` or `error: string`
    if (data.error) {
      if (typeof data.error === 'string') {
        return data.error;
      }
      if (typeof data.error.message === 'string') {
        return data.error.message;
      }
    }

    // FastAPI returns `detail`
    if (data.detail) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item: any) => item.msg || item.message || JSON.stringify(item))
          .join(', ');
      }
      if (typeof data.detail === 'object') {
        return JSON.stringify(data.detail);
      }
    }

    if (typeof data.message === 'string') {
      return data.message;
    }
  }

  // Network / client errors
  if (error.code === 'ERR_NETWORK') {
    return 'Unable to connect to Bhoomi Shield server. Please check your network or ensure the backend server is running.';
  }
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. The server took too long to respond. Please try again.';
  }
  if (error.response?.status === 401) {
    return 'Authentication required or session expired. Please sign in again.';
  }
  if (error.response?.status === 403) {
    return 'Access forbidden. You do not have permission to perform this action.';
  }
  if (error.response?.status === 404) {
    return 'The requested resource was not found.';
  }
  if (error.response?.status && error.response.status >= 500) {
    return 'Bhoomi Shield server encountered an internal error. Please try again later.';
  }

  return error.message || 'An unexpected error occurred while communicating with the server.';
};

// Response interceptor - normalize errors to ApiRequestError (proper Error instance)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status || 500;
    const path = error.config?.url || '';
    const message = extractErrorMessage(error);

    const normalizedError = new ApiRequestError(message, status, path);
    return Promise.reject(normalizedError);
  }
);

export default apiClient;

