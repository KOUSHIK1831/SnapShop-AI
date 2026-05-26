import { useTranslation } from 'react-i18next';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to={t('auto.auth')} replace />;

  if (!user.email_confirmed) return <Navigate to={t('auto.auth')} replace />;

  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'admin') return <Navigate to={t('auto.admin')} replace />;
    if (user.role === 'seller')
      return <Navigate to={t('auto.dashboard')} replace />;
    if (user.role === 'buyer') return <Navigate to={t('auto.buyer')} replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
