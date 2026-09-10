import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAuthenticatedHomePath } from '../../services/auth.service';

interface GuestRouteProps {
  children: React.ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getAuthenticatedHomePath(user)} replace />;
  }

  return <>{children}</>;
}
