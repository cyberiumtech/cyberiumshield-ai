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

export interface MalwareScanResult {
  filename: string;
  classification: 'Malware' | 'Legitimate' | 'Unknown';
  family: string;
  threat_score: number;
  confidence: number;
  method: string;
  file_info: {
    mime_type?: string;
    extension?: string;
    size?: number;
    md5?: string;
    sha1?: string;
    sha256?: string;
    is_executable?: boolean;
    is_archive?: boolean;
    is_document?: boolean;
    is_script?: boolean;
  };
  timestamp: string;
  error?: string;
}

const malwareApi = axios.create({
  baseURL: import.meta.env.VITE_MALWARE_API_URL || '/malware-api',
  headers: { Accept: 'application/json' },
});

export async function scanMalwareFile(file: File): Promise<MalwareScanResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await malwareApi.post<MalwareScanResult>('/api/scan', formData);
  return response.data;
}

export interface PhishingScanResult {
  url: string;
  prediction: 'phishing' | 'legitimate';
  phishing_probability: number;
  confidence: number;
  risk_level: 'critical' | 'high' | 'low' | 'minimal';
  signals: Array<{ label: string; value: string | number; flagged: boolean }>;
  model: string;
}

const phishingApi = axios.create({
  baseURL: import.meta.env.VITE_PHISHING_API_URL || '/phishing-api',
  headers: { Accept: 'application/json' },
});

export async function scanPhishingUrl(url: string): Promise<PhishingScanResult> {
  const response = await phishingApi.post<PhishingScanResult>('/api/predict', { url });
  return response.data;
}

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
