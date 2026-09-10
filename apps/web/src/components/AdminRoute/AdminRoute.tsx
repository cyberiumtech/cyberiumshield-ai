import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function isAdminRole(role?: string | null) {
  return ['admin', 'administrator'].includes(
    (role ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ')
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center" role="status">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <span className="sr-only">Checking administrator access</span>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/auth/login" replace state={{ from: location }} />;
  if (!isAdminRole(user?.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
