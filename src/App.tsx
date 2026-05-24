import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/useAuth';
import { NetworkProvider } from '@/hooks/useNetworkStrength';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Storefront from './pages/Storefront';
import BuyerDashboard from './pages/BuyerDashboard';
import TrackOrder from './pages/TrackOrder';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';
import BottomNav from './components/BottomNav';

import ThemeProvider from '@/components/ThemeProvider';

const queryClient = new QueryClient();
const App = () => {
  const { t } = useTranslation();
  return (
    <ThemeProvider>
      <NetworkProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <OfflineBanner />
              <AuthProvider>
                <div className="pb-16 sm:pb-0">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path={t('auto.auth')} element={<Auth />} />
                    <Route
                      path={t('auto.dashboard')}
                      element={
                        <ProtectedRoute requiredRole={t('auto.seller')}>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={t('auto.admin')}
                      element={
                        <ProtectedRoute requiredRole={t('auto.admin_413')}>
                          <Admin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={t('auto.store_slug')}
                      element={<Storefront />}
                    />
                    <Route
                      path={t('auto.buyer')}
                      element={
                        <ProtectedRoute requiredRole={t('auto.buyer_795')}>
                          <BuyerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={t('auto.track_order_orderid')}
                      element={
                        <ProtectedRoute requiredRole={t('auto.buyer_795')}>
                          <TrackOrder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={t('auto.reset_password')}
                      element={<ResetPassword />}
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <BottomNav />
                </div>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
};

export default App;
