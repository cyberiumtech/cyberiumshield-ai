import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cyberiumshield_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      localStorage.removeItem('cyberiumshield_token');
      localStorage.removeItem('cyberiumshield_user');

      window.location.href = '/auth/login';
    }

    if (error.response?.status === 419) {
      try {
        await api.get('/csrf-cookie');
        return api(originalRequest);
      } catch (csrfError) {
        return Promise.reject(csrfError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
