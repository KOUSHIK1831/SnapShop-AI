import { useTranslation } from 'react-i18next';
import { useEffect, useState, useReducer, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LogOut,
  Store,
  Users,
  Package,
  ShoppingBag,
  LayoutDashboard,
  ArrowLeft,
  ChevronRight,
  Search,
  ExternalLink,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Ban,
  UserX,
  MessageSquare,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity,
  Bell,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface Feedback {
  id: string;
  content: string;
  status: string;
  created_at: string;
  user_id: string;
  seller_id?: string;
  admin_response?: string;
  user_email?: string;
  store_name?: string;
}

interface Profile {
  id: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

interface Seller {
  id: string;
  user_id: string;
  store_name: string;
  store_slug: string;
  location: string;
  status: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  verification_documents: string[] | null;
  admin_feedback: string | null;
  gstin: string | null;
  registered_business_name: string | null;
  ai_daily_limit: number;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  stock: number;
  image_url: string;
}

interface Order {
  id: string;
  status: string;
  pay_status: string;
  buyer_name: string;
  created_at: string;
  confirmed_at?: string;
  completed_at?: string;
  product: { title: string; price: number };
}

interface NotificationLog {
  id: string;
  email: string | null;
  type: string;
  status: string;
  error: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
}

interface AdminState {
  profiles: Profile[];
  sellers: Seller[];
  totalProducts: number;
  totalOrders: number;
  selectedSeller: Seller | null;
  sellerProducts: Product[];
  sellerOrders: Order[];
  feedback: Feedback[];
  notificationLogs: NotificationLog[];
  auditLogs: AuditLog[];
  search: string;
  userSearch: string;
}

type AdminAction =
  | {
      type: 'SET_STATS';
      payload: {
        profiles: Profile[];
        sellers: Seller[];
        totalProducts: number;
        totalOrders: number;
        feedback: Feedback[];
        notificationLogs: NotificationLog[];
        auditLogs: AuditLog[];
      };
    }
  | {
      type: 'SET_SELECTED_SELLER';
      payload: { seller: Seller | null; products: Product[]; orders: Order[] };
    }
  | { type: 'UPDATE_FEEDBACK'; payload: Feedback[] }
  | { type: 'UPDATE_PROFILES'; payload: Profile[] }
  | { type: 'UPDATE_SELLERS'; payload: Seller[] }
  | { type: 'UPDATE_NOTIFICATION_LOGS'; payload: NotificationLog[] }
  | { type: 'UPDATE_AUDIT_LOGS'; payload: AuditLog[] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_USER_SEARCH'; payload: string };

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'SET_STATS':
      return { ...state, ...action.payload };
    case 'SET_SELECTED_SELLER':
      return {
        ...state,
        selectedSeller: action.payload.seller,
        sellerProducts: action.payload.products,
        sellerOrders: action.payload.orders,
      };
    case 'UPDATE_FEEDBACK':
      return { ...state, feedback: action.payload };
    case 'UPDATE_PROFILES':
      return { ...state, profiles: action.payload };
    case 'UPDATE_SELLERS':
      return { ...state, sellers: action.payload };
    case 'SET_SEARCH':
      return { ...state, search: action.payload };
    case 'SET_USER_SEARCH':
      return { ...state, userSearch: action.payload };
    default:
      return state;
  }
}

const initialAdminState: AdminState = {
  profiles: [],
  sellers: [],
  totalProducts: 0,
  totalOrders: 0,
  selectedSeller: null,
  sellerProducts: [],
  sellerOrders: [],
  feedback: [],
  notificationLogs: [],
  auditLogs: [],
  search: '',
  userSearch: '',
};

import { useNavigate, useSearchParams } from 'react-router-dom';
// ...
export default function Admin() {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(adminReducer, initialAdminState);
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'sellers';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const fetchGlobalStats = useCallback(async () => {
    try {
      const data = await apiClient.get<{
        profiles: Profile[];
        sellers: Seller[];
        totalProducts: number;
        totalOrders: number;
        feedback: Feedback[];
        notificationLogs: NotificationLog[];
        auditLogs: AuditLog[];
      }>('/admin/overview');
      dispatch({ type: 'SET_STATS', payload: data });
    } catch (error) {
      toast({
        title: 'Could not load admin data',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleViewDocument = async (url: string) => {
    if (!url) return;

    // If it's already a full URL (legacy data), just open it
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const result = await apiClient.get<{ url: string }>(
        `/admin/documents/signed-url?key=${encodeURIComponent(url)}`,
      );
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error generating signed URL:', err);
      toast({
        title: 'Error',
        description: 'Could not open document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    void fetchGlobalStats();
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchGlobalStats();
    }, 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [fetchGlobalStats]);

  const updateFeedbackStatus = async (
    id: string,
    status: string,
    admin_response?: string,
  ) => {
    try {
      await apiClient.patch(`/admin/feedback/${id}`, {
        status,
        ...(admin_response !== undefined ? { response: admin_response } : {}),
      });
    } catch (error) {
      toast({
        title: t('admin.toasts.updateFailed'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
      return;
    }
    dispatch({
      type: 'UPDATE_FEEDBACK',
      payload: state.feedback.map(f =>
        f.id === id
          ? { ...f, status, admin_response: admin_response ?? f.admin_response }
          : f,
      ),
    });
    toast({ title: t('admin.toasts.updateSuccess') });
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm(t('admin.confirm.deleteFeedback'))) return;
    try {
      await apiClient.delete(`/admin/feedback/${id}`);
    } catch (error) {
      toast({
        title: 'Could not delete feedback',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
      return;
    }
    dispatch({
      type: 'UPDATE_FEEDBACK',
      payload: state.feedback.filter(f => f.id !== id),
    });
    toast({ title: t('admin.toasts.feedbackDeleted') });
  };

  const fetchSellerDetails = async (seller: Seller) => {
    try {
      const details = await apiClient.get<{
        seller: Seller;
        products: Product[];
        orders: Order[];
      }>(`/admin/sellers/${seller.id}`);
      dispatch({ type: 'SET_SELECTED_SELLER', payload: details });
    } catch (error) {
      toast({
        title: 'Could not load seller details',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm(t('admin.confirm.deleteProduct'))) return;
    try {
      await apiClient.delete(`/admin/products/${id}`);
    } catch (error) {
      toast({
        title: 'Could not delete product',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
      return;
    }
    dispatch({
      type: 'SET_SELECTED_SELLER',
      payload: {
        seller: state.selectedSeller,
        products: state.sellerProducts.filter(p => p.id !== id),
        orders: state.sellerOrders,
      },
    });
    fetchGlobalStats();
    toast({ title: t('admin.toasts.productDeleted') });
  };

  const toggleSellerStatus = async (seller: Seller) => {
    const newStatus = seller.status === 'active' ? 'blocked' : 'active';
    if (
      !confirm(
        newStatus === 'blocked'
          ? t('admin.confirm.blockStore')
          : t('admin.confirm.unblockStore'),
      )
    )
      return;

    try {
      await apiClient.patch(`/admin/sellers/${seller.id}/status`, {
        status: newStatus,
      });
    } catch (error) {
      toast({
        title: 'Could not update store status',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
      return;
    }

    const updated = { ...seller, status: newStatus };
    dispatch({
      type: 'SET_SELECTED_SELLER',
      payload: {
        seller: updated,
        products: state.sellerProducts,
        orders: state.sellerOrders,
      },
    });
    dispatch({
      type: 'UPDATE_SELLERS',
      payload: state.sellers.map(s => (s.id === seller.id ? updated : s)),
    });

    // Also update profiles in state if they are loaded
    dispatch({
      type: 'UPDATE_PROFILES',
      payload: state.profiles.map(p =>
        p.id === seller.user_id
          ? { ...p, is_blocked: newStatus === 'blocked' }
          : p,
      ),
    });

    toast({
      title:
        newStatus === 'blocked'
          ? t('admin.toasts.storeBlocked')
          : t('admin.toasts.storeUnblocked'),
      variant:
        newStatus === 'blocked' ? t('auto.destructive') : t('auto.default'),
    });
  };

  const toggleUserBlock = async (profile: Profile) => {
    const isBlocking = !profile.is_blocked;
    if (
      !confirm(
        profile.is_blocked
          ? t('admin.confirm.unblockUser')
          : t('admin.confirm.blockUser'),
      )
    )
      return;

    try {
      await apiClient.patch(`/admin/users/${profile.id}/block`, {
        blocked: isBlocking,
      });
    } catch (error) {
      toast({
        title: 'Could not update user status',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
      return;
    }

    if (profile.role === 'seller') {
      dispatch({
        type: 'UPDATE_SELLERS',
        payload: state.sellers.map(s =>
          s.user_id === profile.id
            ? {
                ...s,
                status: isBlocking ? 'blocked' : 'active',
              }
            : s,
        ),
      });
    }

    dispatch({
      type: 'UPDATE_PROFILES',
      payload: state.profiles.map(p =>
        p.id === profile.id ? { ...p, is_blocked: isBlocking } : p,
      ),
    });
    toast({
      title: profile.is_blocked
        ? t('admin.toasts.userUnblocked')
        : t('admin.toasts.userBlocked'),
      variant: profile.is_blocked ? t('auto.default') : t('auto.destructive'),
    });
  };

  const updateVerificationStatus = async (
    sellerId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
  ) => {
    try {
      await apiClient.patch(`/admin/sellers/${sellerId}/verify`, {
        status,
        feedback,
      });
    } catch (error) {
      toast({
        title: 'Could not update seller verification',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: `Seller ${status === 'approved' ? t('auto.approved') : t('auto.rejected')}`,
    });
    fetchGlobalStats();
  };

  const filteredSellers = useMemo(
    () =>
      state.sellers.filter(
        s =>
          s.store_name?.toLowerCase().includes(state.search.toLowerCase()) ||
          s.store_slug?.toLowerCase().includes(state.search.toLowerCase()),
      ),
    [state.sellers, state.search],
  );

  const pendingVerifications = useMemo(
    () => state.sellers.filter(s => s.verification_status === 'pending'),
    [state.sellers],
  );

  const filteredUsers = useMemo(
    () =>
      state.profiles.filter(p =>
        p.email?.toLowerCase().includes(state.userSearch.toLowerCase()),
      ),
    [state.profiles, state.userSearch],
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader t={t} signOut={signOut} />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {state.selectedSeller ? (
          <SellerDetails
            seller={state.selectedSeller}
            products={state.sellerProducts}
            orders={state.sellerOrders}
            onBack={() =>
              dispatch({
                type: 'SET_SELECTED_SELLER',
                payload: { seller: null, products: [], orders: [] },
              })
            }
            onDeleteProduct={deleteProduct}
            onToggleStatus={toggleSellerStatus}
            onVerify={updateVerificationStatus}
            t={t}
          />
        ) : (
          <>
            <GlobalStats
              profiles={state.profiles}
              sellers={state.sellers}
              products={state.totalProducts}
              orders={state.totalOrders}
              t={t}
            />

            <div className="w-full pb-16 sm:pb-0">
              {activeTab === 'sellers' && (
                <SellersTab
                  sellers={filteredSellers}
                  search={state.search}
                  onSearch={(v: string) =>
                    dispatch({ type: 'SET_SEARCH', payload: v })
                  }
                  onSelect={fetchSellerDetails}
                  t={t}
                />
              )}
              {activeTab === 'verifications' && (
                <VerificationsTab
                  sellers={pendingVerifications}
                  onSelect={fetchSellerDetails}
                  t={t}
                />
              )}
              {activeTab === 'users' && (
                <UsersTab
                  users={filteredUsers}
                  search={state.userSearch}
                  onSearch={(v: string) =>
                    dispatch({ type: 'SET_USER_SEARCH', payload: v })
                  }
                  onToggleBlock={toggleUserBlock}
                  t={t}
                />
              )}
              {activeTab === 'feedback' && (
                <FeedbackTab
                  feedback={state.feedback}
                  onUpdateStatus={updateFeedbackStatus}
                  onDelete={deleteFeedback}
                  t={t}
                />
              )}
              {activeTab === 'monitoring' && (
                <MonitoringTab
                  notificationLogs={state.notificationLogs}
                  auditLogs={state.auditLogs}
                  profiles={state.profiles}
                  t={t}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MonitoringTab({ notificationLogs, auditLogs, profiles, t }: any) {
  const failedNotifications = useMemo(
    () => notificationLogs.filter((n: any) => n.status === 'failed'),
    [notificationLogs],
  );

  const blockedUsers = useMemo(
    () => profiles.filter((p: any) => p.is_blocked),
    [profiles],
  );

  return (
    <div className="space-y-6 mt-6 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-surface bg-red-500/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-red-600 flex items-center gap-2">
              <AlertCircle className="size-3.5" />
              {t('auto.failed_notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-red-700">
              {failedNotifications.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-surface">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="size-3.5" />
              {t('auto.blocked_accounts')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-foreground">
              {blockedUsers.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-surface">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="size-3.5" />
              {t('auto.recent_events_24h')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-foreground">
              {auditLogs.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={t('auto.notifications')} className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-4">
          <TabsTrigger value={t('auto.notifications')} className="text-xs">
            <Bell className="size-3 mr-1.5" />
            {t('auto.notifications_153')}
          </TabsTrigger>
          <TabsTrigger value={t('auto.audit')} className="text-xs">
            <ShieldCheck className="size-3 mr-1.5" />
            {t('auto.audit_trail')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={t('auto.notifications')}>
          <Card className="border-border/50 shadow-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('auto.type')}
                    </th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('auto.recipient')}
                    </th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('orders.status')}
                    </th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('auto.last_attempt')}
                    </th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('common.error')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {notificationLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/10">
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium capitalize">
                          {log.type?.replace(/_/g, ' ') || 'unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {log.email || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            log.status === 'sent'
                              ? t('auto.default')
                              : t('auto.destructive')
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-[10px] text-red-600 font-mono truncate max-w-[200px]">
                          {log.error || '—'}
                        </p>
                      </td>
                    </tr>
                  ))}
                  {notificationLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-muted-foreground italic text-xs"
                      >
                        {t('auto.no_notification_logs_found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value={t('auto.audit')}>
          <Card className="border-border/50 shadow-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('auto.action')}
                    </th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('auto.entity')}
                    </th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('auto.changes')}
                    </th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('auto.time')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/10">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {t('auto.actor')}
                            {log.actor_id?.slice(0, 8) || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground capitalize">
                        {log.entity} ({log.entity_id?.slice(0, 8) || '—'})
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[10px] flex flex-col gap-0.5">
                          {log.metadata != null && (
                            <span className="text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded truncate max-w-[300px]">
                              {JSON.stringify(log.metadata)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center text-muted-foreground italic text-xs"
                      >
                        {t('auto.no_audit_logs_found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminHeader({ t, signOut }: { t: any; signOut: () => void }) {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
            <LayoutDashboard className="size-4 text-primary-foreground" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">
            {t('admin.portal')}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {t('admin.devMode')}
          </span>
          <ThemeToggle />
          <LanguageSwitcher variant="compact" />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4 mr-2" />
            {t('common.signOut')}
          </Button>
        </div>
      </div>
    </header>
  );
}

function GlobalStats({ profiles, sellers, products, orders, t }: any) {
  const stats = [
    { label: t('admin.users'), value: profiles.length, icon: Users },
    { label: t('admin.sellers'), value: sellers.length, icon: Store },
    { label: t('admin.products'), value: products, icon: Package },
    { label: t('admin.orders'), value: orders, icon: ShoppingBag },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(s => (
        <Card key={s.label} className="border-border/50 shadow-surface">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <s.icon className="size-3.5" /> {s.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SellersTab({ sellers, search, onSearch, onSelect, t }: any) {
  return (
    <div className="space-y-4">
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t('admin.searchStores')}
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sellers.map((seller: Seller) => (
          <Card
            key={seller.id}
            className="border-border/50 shadow-surface hover:shadow-surface-lg transition-all cursor-pointer group"
            onClick={() => onSelect(seller)}
          >
            <CardHeader className="p-5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`size-10 rounded-xl flex items-center justify-center ${seller.verification_status === 'approved' ? t('auto.bg_green_100_text_green_600') : seller.verification_status === 'rejected' ? t('auto.bg_red_100_text_red_600') : t('auto.bg_amber_100_text_amber_600')}`}
                >
                  {seller.verification_status === 'approved' ? (
                    <ShieldCheck className="size-5" />
                  ) : seller.verification_status === 'rejected' ? (
                    <ShieldAlert className="size-5" />
                  ) : (
                    <Clock className="size-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {seller.store_name}
                    </CardTitle>
                    {seller.status === 'blocked' && (
                      <Badge
                        variant="destructive"
                        className="text-[8px] uppercase h-4"
                      >
                        {t('auto.blocked')}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {t('auto.store')}
                    {seller.store_slug}
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VerificationsTab({ sellers, onSelect, t }: any) {
  return (
    <div className="space-y-4 mt-4">
      {sellers.length === 0 ? (
        <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed border-border/50">
          <ShieldCheck className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {t('auto.no_pending_verification_reques')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sellers.map((seller: Seller) => (
            <Card
              key={seller.id}
              className="border-border/50 shadow-surface hover:shadow-surface-lg transition-all cursor-pointer group border-l-4 border-l-amber-500"
              onClick={() => onSelect(seller)}
            >
              <CardHeader className="p-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {seller.store_name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {t('auto.pending_review')}
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab({ users, search, onSearch, onToggleBlock, t }: any) {
  return (
    <div className="space-y-4">
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t('admin.searchUsers')}
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      <Card className="border-border/50 shadow-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">
                  {t('admin.userEmail')}
                </th>
                <th className="text-left py-3 px-4 font-medium">
                  {t('admin.role')}
                </th>
                <th className="text-left py-3 px-4 font-medium">
                  {t('admin.status')}
                </th>
                <th className="text-left py-3 px-4 font-medium">
                  {t('admin.joined')}
                </th>
                <th className="text-right py-3 px-4 font-medium">
                  {t('admin.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((profile: Profile) => (
                <tr
                  key={profile.id}
                  className="border-b border-border/30 hover:bg-muted/30"
                >
                  <td className="py-3 px-4 font-medium">{profile.email}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase"
                    >
                      {profile.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {profile.is_blocked ? (
                      <Badge
                        variant="destructive"
                        className="text-[10px] flex items-center gap-1 w-fit"
                      >
                        <ShieldAlert className="size-3" />
                        {t('auto.blocked_858')}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] flex items-center gap-1 w-fit text-green-600 border-green-600/30 bg-green-500/5"
                      >
                        <ShieldCheck className="size-3" />
                        {t('auto.active_736')}
                      </Badge>
                    )}
                  </td>
                  <td
                    className="py-3 px-4 text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {profile.role !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleBlock(profile)}
                        className={
                          profile.is_blocked
                            ? t('auto.text_green_600_hover_text_gree')
                            : t('auto.text_destructive_hover_text_de')
                        }
                      >
                        {profile.is_blocked ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <UserX className="size-4" />
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FeedbackTab({ feedback, onUpdateStatus, onDelete, t }: any) {
  return (
    <div className="grid grid-cols-1 gap-4 mt-6">
      {feedback.map((item: Feedback) => (
        <Card
          key={item.id}
          className="border-border/50 shadow-surface overflow-hidden"
        >
          <CardHeader className="p-4 bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${item.status === 'open' ? t('auto.bg_amber_100_text_amber_600') : item.status === 'resolved' ? t('auto.bg_green_100_text_green_600') : t('auto.bg_muted_text_muted_foreground')}`}
              >
                <MessageSquare className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm font-semibold">
                    {item.user_email || 'Anonymous/Deleted'}
                  </CardTitle>
                  {item.store_name && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-primary/10 text-primary border-none whitespace-nowrap"
                    >
                      <Store className="size-3 mr-1" /> {item.store_name}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-[10px] flex items-center gap-1">
                  <Clock className="size-3" />{' '}
                  <span suppressHydrationWarning>
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={item.status}
                onChange={e =>
                  onUpdateStatus(item.id, e.target.value, item.admin_response)
                }
                className="text-[10px] bg-background border border-border/50 rounded px-2 py-1 outline-none"
              >
                <option value={t('auto.open')}>{t('auto.open_327')}</option>
                <option value={t('auto.in_progress')}>
                  {t('auto.in_progress_67')}
                </option>
                <option value={t('auto.resolved')}>
                  {t('auto.resolved_441')}
                </option>
                <option value={t('auto.closed')}>{t('auto.closed_463')}</option>
              </select>
              <Badge
                variant={
                  item.status === 'open'
                    ? t('auto.destructive')
                    : item.status === 'resolved'
                      ? t('auto.default')
                      : t('auto.outline')
                }
                className="text-[8px] uppercase"
              >
                {t(`orders.status.${item.status}` as never)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8 p-0"
                title={t('auto.delete_feedback')}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {t('admin.userMessage')}
              </p>
              <p className="text-sm text-foreground leading-relaxed italic">
                "{item.content}"
              </p>
            </div>
            <div className="pt-3 border-t border-border/30">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <ShieldCheck className="size-3" /> {t('feedback.adminResponse')}
              </p>
              <AdminResponseInput
                initialValue={item.admin_response || ''}
                onSave={val => onUpdateStatus(item.id, item.status, val)}
              />
            </div>
          </CardContent>
        </Card>
      ))}
      {feedback.length === 0 && (
        <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed border-border/50">
          <MessageSquare className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {t('admin.noFeedbackReceived')}
          </p>
        </div>
      )}
    </div>
  );
}

function SellerDetails({
  seller,
  products,
  orders,
  onBack,
  onDeleteProduct,
  onToggleStatus,
  onVerify,
  t,
}: any) {
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [newAiLimit, setNewAiLimit] = useState(
    seller.ai_daily_limit?.toString() || '25',
  );
  const [updatingLimit, setUpdatingLimit] = useState(false);
  const { toast } = useToast();

  const handleUpdateLimit = async () => {
    setUpdatingLimit(true);
    try {
      await apiClient.patch(`/admin/sellers/${seller.id}/limit`, {
        limit: parseInt(newAiLimit),
      });
      toast({ title: 'Limit updated successfully' });
    } catch (error) {
      toast({
        title: 'Could not update AI limit',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setUpdatingLimit(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="size-4 mr-2" /> {t('admin.backToOverview')}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-6 rounded-2xl border border-border/50">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  {seller.store_name}
                </h2>
                <Badge
                  variant={
                    seller.status === 'active'
                      ? t('auto.default')
                      : t('auto.destructive')
                  }
                  className="uppercase text-[10px]"
                >
                  {seller.status}
                </Badge>
                <Badge
                  variant={
                    seller.verification_status === 'approved'
                      ? t('auto.default')
                      : seller.verification_status === 'rejected'
                        ? t('auto.destructive')
                        : t('auto.outline')
                  }
                  className="uppercase text-[10px]"
                >
                  {seller.verification_status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Store className="size-3.5" />
                {t('auto.store')}
                {seller.store_slug}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="size-3.5" />{' '}
                {seller.location || 'No location'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`/store/${seller.store_slug}`, '_blank')
                }
              >
                <ExternalLink className="size-4 mr-2" />{' '}
                {t('admin.viewPublicStore')}
              </Button>
              <Button
                variant={
                  seller.status === 'active'
                    ? t('auto.destructive')
                    : t('auto.default')
                }
                size="sm"
                onClick={() => onToggleStatus(seller)}
              >
                {seller.status === 'active' ? (
                  <>
                    <Ban className="size-4 mr-2" /> {t('admin.blockStore')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4 mr-2" />{' '}
                    {t('admin.unblockStore')}
                  </>
                )}
              </Button>
            </div>
          </div>

          <Tabs defaultValue={t('auto.inventory')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1">
              <TabsTrigger value={t('auto.inventory')}>
                {t('admin.inventory')} ({products.length})
              </TabsTrigger>
              <TabsTrigger value={t('auto.orders')}>
                {t('admin.orders')} ({orders.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value={t('auto.inventory')} className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {products.map((product: Product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden border-border/50 shadow-surface group"
                  >
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="size-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-muted-foreground">
                          <Package className="size-8" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-md">
                        ₹{product.price}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground truncate">
                        {product.title}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {product.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t('auto.stock_11')}
                          {product.stock}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteProduct(product.id)}
                        className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                      >
                        <Trash2 className="size-3.5 mr-2" />{' '}
                        {t('product.delete')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value={t('auto.orders')} className="mt-6">
              <Card className="border-border/50 shadow-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-muted-foreground">
                        <th className="text-left py-3 px-4 font-medium">
                          {t('admin.orders')}
                          {t('auto.id')}
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          {t('orders.customer')}
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          {t('admin.products')}
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          {t('admin.status')}
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          {t('admin.joined')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order: Order) => (
                        <tr
                          key={order.id}
                          className="border-b border-border/30 hover:bg-muted/30"
                        >
                          <td className="py-3 px-4 font-mono text-[10px]">
                            {order.id.slice(0, 8)}...
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">
                              {order.buyer_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="size-3" />
                              <span suppressHydrationWarning>
                                {new Date(
                                  order.created_at,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {order.product?.title || t('dashboard.noProducts')}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase mb-1 block w-fit"
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td
                            className="py-3 px-4 text-muted-foreground"
                            suppressHydrationWarning
                          >
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-surface">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                {t('auto.ai_usage_limits')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  {t('auto.daily_ai_credits')}
                </label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={newAiLimit}
                    onChange={e => setNewAiLimit(e.target.value)}
                    className="h-9 text-sm"
                  />

                  <Button
                    size="sm"
                    onClick={handleUpdateLimit}
                    disabled={
                      updatingLimit ||
                      newAiLimit === seller.ai_daily_limit?.toString()
                    }
                  >
                    {updatingLimit ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      t('auto.update')
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  {t('auto.standard_limit_is_25_per_day_i')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-surface">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                {t('auto.verification_details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  {t('auto.gstin_384')}
                </label>
                <p className="text-sm font-mono bg-muted/50 p-2 rounded mt-1 border border-border/30">
                  {seller.gstin || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  {t('auto.business_name')}
                </label>
                <p className="text-sm font-medium p-2 bg-muted/50 rounded mt-1 border border-border/30">
                  {seller.registered_business_name || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  {t('orders.status')}
                </label>
                <div className="mt-1">
                  <Badge
                    variant={
                      seller.verification_status === 'approved'
                        ? t('auto.default')
                        : seller.verification_status === 'rejected'
                          ? t('auto.destructive')
                          : t('auto.outline')
                    }
                    className="uppercase text-[10px]"
                  >
                    {seller.verification_status}
                  </Badge>
                </div>
              </div>

              {seller.verification_documents &&
                seller.verification_documents.length > 0 && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">
                      {t('auto.documents_shop_photos')}
                    </label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {seller.verification_documents.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => handleViewDocument(url)}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-xs w-full text-left"
                        >
                          <FileText className="size-4 text-primary" />
                          <span className="truncate flex-1">
                            {t('auto.verification_item')}
                            {i + 1}
                          </span>
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {seller.verification_status === 'pending' && (
                <div className="pt-4 space-y-3 border-t border-border/30">
                  {!isRejecting ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => onVerify(seller.id, 'approved')}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="size-4 mr-2" />
                        {t('auto.approve_seller')}
                      </Button>
                      <Button
                        onClick={() => setIsRejecting(true)}
                        variant="outline"
                        className="w-full text-destructive hover:bg-destructive/5 border-destructive/20"
                      >
                        <XCircle className="size-4 mr-2" />
                        {t('auto.reject_seller')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] uppercase font-bold text-destructive">
                        {t('auto.rejection_reason')}
                      </label>
                      <textarea
                        value={rejectFeedback}
                        onChange={e => setRejectFeedback(e.target.value)}
                        placeholder={t('auto.explain_why_the_verification_w')}
                        className="w-full min-h-[100px] text-xs p-3 rounded-lg border border-destructive/30 bg-destructive/5 focus:outline-none focus:ring-1 focus:ring-destructive"
                      />

                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            onVerify(seller.id, 'rejected', rejectFeedback);
                            setIsRejecting(false);
                          }}
                          disabled={!rejectFeedback.trim()}
                          className="flex-1 bg-destructive hover:bg-destructive/90"
                        >
                          {t('auto.confirm_reject')}
                        </Button>
                        <Button
                          onClick={() => setIsRejecting(false)}
                          variant="ghost"
                          className="flex-1"
                        >
                          {t('auto.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {seller.verification_status === 'rejected' &&
                seller.admin_feedback && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                      {t('auto.previous_rejection_feedback')}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1 italic">
                      "{seller.admin_feedback}"
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminResponseInput({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (val: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (value === initialValue) return;
    setIsSaving(true);
    try {
      await onSave(value);
    } catch (err) {
      console.error('Failed to save admin response:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder={t('auto.write_a_response_to_the_user')}
        value={value}
        onChange={e => setValue(e.target.value)}
        className="text-xs h-8"
        disabled={isSaving}
      />

      <Button
        size="sm"
        variant="outline"
        className="h-8 text-[10px]"
        disabled={value === initialValue || isSaving}
        onClick={handleSave}
      >
        {isSaving ? t('common.saving') : t('common.save')}
      </Button>
    </div>
  );
}
