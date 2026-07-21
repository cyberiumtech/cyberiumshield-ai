import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organization: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('cyberiumshield_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('cyberiumshield_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });
      // const data = await response.json();

      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validate credentials (temporary - replace with API)
      if (email && password.length >= 6) {
        const mockUser: User = {
          id: '1',
          name: email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          email,
          role: 'Security Analyst',
          organization: 'CyberiumShield Security',
        };

        localStorage.setItem('cyberiumshield_user', JSON.stringify(mockUser));
        setUser(mockUser);
        navigate('/dashboard');
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, organization: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name, email, password, organization }),
      // });
      // const data = await response.json();

      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockUser: User = {
        id: Date.now().toString(),
        name,
        email,
        role: 'Security Analyst',
        organization,
      };

      localStorage.setItem('cyberiumshield_user', JSON.stringify(mockUser));
      setUser(mockUser);
      navigate('/dashboard');
    } catch (error) {
      throw new Error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('cyberiumshield_user');
    setUser(null);
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
