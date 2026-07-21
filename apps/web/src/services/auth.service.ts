import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  organization_name: string;
  organization_slug?: string;
  country?: string;
  timezone?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  password: string;
  password_confirmation: string;
  token: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified_at: string | null;
  role: string;
  organization_id: string;
  organization_name: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at?: string;
}

class AuthService {
  async getCsrfCookie(): Promise<void> {
    // TODO: Implement CSRF cookie endpoint when backend is ready
    // await api.get('/csrf-cookie');
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await this.getCsrfCookie();
    // TODO: Replace with actual Laravel Sanctum endpoint
    // const response = await api.post<AuthResponse>('/auth/login', credentials);

    // Temporary mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockUser: User = {
      id: '1',
      name: credentials.email.split('@')[0],
      email: credentials.email,
      email_verified_at: new Date().toISOString(),
      role: 'security_analyst',
      organization_id: '1',
      organization_name: 'Demo Organization',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockToken = 'mock_token_' + Date.now();

    return {
      user: mockUser,
      token: mockToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    await this.getCsrfCookie();
    // TODO: Replace with actual Laravel Sanctum endpoint
    // const response = await api.post<AuthResponse>('/auth/register', data);

    // Temporary mock implementation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockUser: User = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      email_verified_at: null,
      role: 'security_analyst',
      organization_id: Date.now().toString(),
      organization_name: data.organization_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockToken = 'mock_token_' + Date.now();

    return {
      user: mockUser,
      token: mockToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async logout(): Promise<void> {
    // TODO: Replace with actual Laravel Sanctum endpoint
    // await api.post('/auth/logout');

    localStorage.removeItem('cyberiumshield_token');
    localStorage.removeItem('cyberiumshield_user');
  }

  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    await this.getCsrfCookie();
    // TODO: Replace with actual Laravel endpoint
    // const response = await api.post('/auth/forgot-password', data);
    // return response.data;

    await new Promise(resolve => setTimeout(resolve, 1000));
    return { message: 'Password reset link sent to your email' };
  }

  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    await this.getCsrfCookie();
    // TODO: Replace with actual Laravel endpoint
    // const response = await api.post('/auth/reset-password', data);
    // return response.data;

    await new Promise(resolve => setTimeout(resolve, 1000));
    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(id: string, hash: string): Promise<{ message: string }> {
    // TODO: Replace with actual Laravel endpoint
    // const response = await api.get(`/auth/verify-email/${id}/${hash}`);
    // return response.data;

    await new Promise(resolve => setTimeout(resolve, 1000));
    return { message: 'Email verified successfully' };
  }

  async resendVerification(): Promise<{ message: string }> {
    // TODO: Replace with actual Laravel endpoint
    // const response = await api.post('/auth/email/verification-notification');
    // return response.data;

    await new Promise(resolve => setTimeout(resolve, 1000));
    return { message: 'Verification email sent' };
  }

  async getCurrentUser(): Promise<User> {
    // TODO: Replace with actual Laravel Sanctum endpoint
    // const response = await api.get<User>('/auth/user');
    // return response.data;

    const storedUser = localStorage.getItem('cyberiumshield_user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
    throw new Error('Not authenticated');
  }
}

export const authService = new AuthService();
export default authService;
