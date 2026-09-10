import api from '../lib/api';

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

interface BackendUser {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  created_at: string;
}

interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

function mapBackendUser(user: BackendUser): User {
  return {
    id: String(user.id),
    name: user.full_name || user.username,
    email: user.email,
    email_verified_at: user.is_verified ? user.created_at : null,
    role: user.roles[0] || 'viewer',
    organization_id: 'cybershield',
    organization_name: 'CyberShield',
    created_at: user.created_at,
    updated_at: user.created_at,
  };
}

function usernameFromEmail(email: string): string {
  const candidate = email
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);

  return candidate.length >= 3 ? candidate : `user_${candidate}`;
}

export function getAuthenticatedHomePath(user?: Pick<User, 'role'> | null): string {
  const role = (user?.role ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  return role === 'admin' || role === 'administrator' ? '/admin' : '/dashboard';
}

class AuthService {
  async getCsrfCookie(): Promise<void> {
    // The FastAPI backend uses bearer tokens and does not require a CSRF cookie.
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data: tokens } = await api.post<BackendTokenResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });

    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);

    const { data: backendUser } = await api.get<BackendUser>('/users/me');

    return {
      user: mapBackendUser(backendUser),
      token: tokens.access_token,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    await api.post<BackendUser>('/auth/register', {
      email: data.email,
      username: usernameFromEmail(data.email),
      password: data.password,
      full_name: data.name,
    });

    return this.login({ email: data.email, password: data.password });
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('cybershield_token');
    localStorage.removeItem('cybershield_user');
  }

  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/request-password-reset', data);
    return response.data;
  }

  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token: data.token,
      new_password: data.password,
    });
    return response.data;
  }

  async verifyEmail(_id: string, _hash: string): Promise<{ message: string }> {
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
    const response = await api.get<BackendUser>('/users/me');
    return mapBackendUser(response.data);
  }
}

export const authService = new AuthService();
export default authService;
