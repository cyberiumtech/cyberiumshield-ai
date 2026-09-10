/**
 * API client with automatic token refresh
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_BASE_URL = /\/api\/v1\/?$/.test(configuredApiUrl)
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api/v1`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add access token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          // Store new access token
          localStorage.setItem('access_token', data.access_token);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token - redirect to login
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
