import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getErrorMessage } from '../utils/errors';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  created_at: string;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load user on mount if tokens exist
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.get<User>('/users/me');
      setUser(data);
    } catch (error) {
      // Token invalid or expired - clear storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });

      // Store tokens
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // Load user data
      await loadUser();

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Login failed. Please check your credentials.'));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (registerData: RegisterData) => {
    setIsLoading(true);
    try {
      // Register user
      await api.post('/auth/register', registerData);

      // Auto-login after registration
      await login(registerData.email, registerData.password);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');

    // Revoke refresh token on server
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        // Ignore errors - still logout locally
        console.error('Logout error:', error);
      }
    }

    // Clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Clear user state
    setUser(null);

    // Navigate to home
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
