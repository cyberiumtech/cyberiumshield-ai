import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import authService, { LoginCredentials, RegisterData, User } from '../services/auth.service';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('cyberiumshield_token');
        if (!token) return null;

        return await authService.getCurrentUser();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      localStorage.setItem('cyberiumshield_token', data.token);
      localStorage.setItem('cyberiumshield_user', JSON.stringify(data.user));
      queryClient.setQueryData(['user'], data.user);

      if (data.user.email_verified_at) {
        navigate('/dashboard');
      } else {
        navigate('/auth/verify-email');
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: (data) => {
      localStorage.setItem('cyberiumshield_token', data.token);
      localStorage.setItem('cyberiumshield_user', JSON.stringify(data.user));
      queryClient.setQueryData(['user'], data.user);
      navigate('/auth/verify-email');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      localStorage.removeItem('cyberiumshield_token');
      localStorage.removeItem('cyberiumshield_user');
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
      navigate('/');
    },
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
}
