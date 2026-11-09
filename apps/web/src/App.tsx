import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import { CartDrawer } from '@/components/CartDrawer';
import { NetworkProvider } from '@/hooks/useNetworkStrength';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Storefront from './pages/Storefront';
import BuyerDashboard from './pages/BuyerDashboard';
import TrackOrder from './pages/TrackOrder';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import VolunteerManualPage from './pages/volunteer/VolunteerManualPage';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';
import BottomNav from './components/BottomNav';

import ThemeProvider from '@/components/ThemeProvider';

const queryClient = new QueryClient();
const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1000000000000-dummygoogleclientidforlocaldev.apps.googleusercontent.com';

const App = () => {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <GoogleOAuthProvider clientId={googleClientId}>
              <BrowserRouter>
                <OfflineBanner />
                <AuthProvider>
                  <CartProvider>
                    <CartDrawer />
                    <div className="pb-16 sm:pb-0">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute requiredRole="seller">
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute requiredRole="admin">
                              <Admin />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/store/:slug" element={<Storefront />} />
                        <Route
                          path="/buyer"
                          element={
                            <ProtectedRoute requiredRole="buyer">
                              <BuyerDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/track-order/:orderId"
                          element={
                            <ProtectedRoute requiredRole="buyer">
                              <TrackOrder />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/reset-password"
                          element={<ResetPassword />}
                        />
                        <Route
                          path="/manual"
                          element={<VolunteerManualPage />}
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      <BottomNav />
                    </div>
                  </CartProvider>
                </AuthProvider>
              </BrowserRouter>
            </GoogleOAuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
};

export default App;
