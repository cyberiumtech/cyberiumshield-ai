import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import authService, {
  getAuthenticatedHomePath,
  LoginCredentials,
  mergeCachedUser,
  RegisterData,
  User,
} from '../services/auth.service';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('cybershield_token');
        if (!token) return null;

        const freshUser = await authService.getCurrentUser();
        const user = mergeCachedUser(freshUser, localStorage.getItem('cybershield_user'));
        localStorage.setItem('cybershield_user', JSON.stringify(user));
        return user;
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
      localStorage.setItem('cybershield_token', data.token);
      localStorage.setItem('cybershield_user', JSON.stringify(data.user));
      queryClient.setQueryData(['user'], data.user);

      if (data.user.email_verified_at) {
        const requestedLocation = (location.state as {
          from?: { pathname?: string; search?: string; hash?: string };
        } | null)?.from;
        const requestedPath = requestedLocation?.pathname
          ? `${requestedLocation.pathname}${requestedLocation.search ?? ''}${requestedLocation.hash ?? ''}`
          : null;

        navigate(requestedPath ?? getAuthenticatedHomePath(data.user), { replace: true });
      } else {
        navigate('/auth/verify-email');
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: (data) => {
      localStorage.setItem('cybershield_token', data.token);
      localStorage.setItem('cybershield_user', JSON.stringify(data.user));
      queryClient.setQueryData(['user'], data.user);
      navigate('/auth/verify-email');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      localStorage.removeItem('cybershield_token');
      localStorage.removeItem('cybershield_user');
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
