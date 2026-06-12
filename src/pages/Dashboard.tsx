import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSeller } from '@/hooks/useSeller';
import UploadZone from '@/components/UploadZone';
import ProductCard from '@/components/ProductCard';
import StoreSetup from '@/components/StoreSetup';
import StoreSettings from '@/components/StoreSettings';
import Orders from '@/components/Orders';
import InventoryEditor from '@/components/InventoryEditor';
import Analytics from '@/components/Analytics';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  ExternalLink,
  Package,
  Upload,
  Store,
  Settings,
  LayoutGrid,
  Copy,
  Check,
  ShoppingBag,
  ClipboardList,
  HelpCircle,
  Ban,
  Clock,
  Lock,
  BarChart3,
  Wrench,
  User,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import AppTour from '@/components/AppTour';
import FeedbackModal from '@/components/FeedbackModal';
import { useWelcomeTour } from '@/hooks/useWelcomeTour';
import { NetworkStrengthIndicator } from '@/components/NetworkStrengthIndicator';
import WhatsAppAgentSetup from '@/components/WhatsAppAgentSetup';
import { cn } from '@/lib/utils';

export type Tab = 'products' | 'tools' | 'profile';
export type SubTab =
  | 'orders'
  | 'upload'
  | 'inventory'
  | 'analytics'
  | 'settings'
  | 'whatsapp-agent';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab) || 'products';
  const subTab = (searchParams.get('sub') as SubTab) || null;

  const setActiveTab = (tab: Tab) => setSearchParams({ tab });
  const setSubTab = (sub: SubTab | null) => {
    if (sub) setSearchParams({ tab: activeTab, sub });
    else setSearchParams({ tab: activeTab });
  };

  const { toast } = useToast();
  const { t } = useTranslation();
  const {
    seller,
    products,
    orders,
    ai_usage_today,
    loading,
    createSeller,
    submitForVerification,
    fetchProducts,
    fetchOrders,
    updateSellerProfile,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
  } = useSeller();
  const [copied, setCopied] = useState(false);
  const { startTour } = useWelcomeTour(setActiveTab);

  const isApproved = seller?.verification_status === 'approved';

  useEffect(() => {
    if (seller && !isApproved && activeTab !== 'profile') {
      setSearchParams({ tab: 'profile', sub: 'settings' });
      toast({
        title: 'Access Restricted',
        description:
          'Please complete your store setup and wait for admin approval to unlock all features.',
        variant: 'default',
      });
    }
  }, [seller, isApproved, activeTab, toast]);

  useEffect(() => {
    let channel: any = null;
    if (seller?.id && isApproved) {
      fetchProducts();
      channel = supabase
        .channel('orders-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${seller.id}`,
          },
          () => {
            toast({
              title: t('orders.newOrder'),
              description: t('orders.newOrderDesc'),
            });
            fetchOrders();
          },
        )
        .subscribe();
    }
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [seller?.id, toast, t, fetchProducts, fetchOrders]);

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin');
  }, [user?.role, navigate]);

  useEffect(() => {
    const lowStock = products.filter(
      p =>
        p.stock !== undefined &&
        p.stock > 0 &&
        p.stock <= (p.low_stock_threshold || 5),
    );
    if (lowStock.length > 0 && seller?.store_name) {
      toast({
        title: 'Low Stock Alert',
        description: `${lowStock.length} product(s) running low on stock.`,
      });
    }
  }, [products, seller?.store_name, toast]);

  const copyStoreLink = () => {
    if (seller?.store_slug) {
      navigator.clipboard.writeText(
        `${window.location.origin}/store/${seller.store_slug}`,
      );
      setCopied(true);
      toast({
        title: t('dashboard.copied'),
        description: t('settings.shareLink'),
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!seller?.store_name) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <DashboardNav
            t={t}
            signOut={signOut}
            startTour={startTour}
            showHeaderOnly
          />

          <StoreSetup
            onComplete={async data => {
              const result = await createSeller(data);
              if (result?.error)
                toast({
                  title: 'Error creating store',
                  description:
                    (result.error as any).message || String(result.error),
                  variant: 'destructive',
                });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <AppTour setActiveTab={setActiveTab} />
      <DashboardHeader
        seller={seller}
        t={t}
        signOut={signOut}
        startTour={startTour}
        copied={copied}
        copyStoreLink={copyStoreLink}
        navigate={navigate}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        <VerificationStatusBanner
          seller={seller}
          onSubmit={submitForVerification}
        />

        <div className="animate-fade-in">
          {activeTab === 'products' && (
            <>
              <DashboardStats
                productsCount={products.length}
                seller={seller}
                t={t}
                isApproved={isApproved}
              />

              <ProductsList
                products={products}
                t={t}
                onUpload={() =>
                  setSearchParams({ tab: 'tools', sub: 'upload' })
                }
                onUpdate={updateProduct}
                onDelete={deleteProduct}
              />
            </>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6">
              {!subTab ? (
                <>
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    {t('auto.store_management')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ToolCard
                      icon={ShoppingBag}
                      label={t('dashboard.tabs.orders')}
                      description={t('auto.manage_and_track_customer_orde')}
                      onClick={() => setSubTab('orders')}
                      color="green"
                      t={t}
                    />

                    <ToolCard
                      icon={Upload}
                      label={t('dashboard.tabs.upload')}
                      description={t('auto.digitize_new_products_with_ai')}
                      onClick={() => setSubTab('upload')}
                      color="blue"
                      t={t}
                    />

                    <ToolCard
                      icon={ClipboardList}
                      label={t('admin.inventory')}
                      description={t('auto.quickly_edit_stock_and_prices')}
                      onClick={() => setSubTab('inventory')}
                      color="amber"
                      t={t}
                    />

                    <ToolCard
                      icon={MessageCircle}
                      label={t('auto.whatsapp_agent')}
                      description={t('auto.whatsapp_agent_desc')}
                      onClick={() => setSubTab('whatsapp-agent')}
                      color="purple"
                      comingSoon
                      t={t}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setSubTab(null)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                  >
                    <ChevronRight className="size-4 rotate-180" />
                    {t('auto.back_to_manage')}
                  </button>
                  {subTab === 'orders' && (
                    <Orders
                      orders={orders}
                      onUpdateStatus={updateOrderStatus}
                    />
                  )}
                  {subTab === 'upload' && (
                    <UploadZone
                      sellerId={seller.id}
                      onComplete={fetchProducts}
                      usageToday={ai_usage_today}
                      dailyLimit={seller.ai_daily_limit}
                    />
                  )}
                  {subTab === 'inventory' && (
                    <InventoryEditor
                      products={products}
                      onUpdate={updateProduct}
                      onDelete={deleteProduct}
                    />
                  )}
                  {subTab === 'whatsapp-agent' && (
                    <WhatsAppAgentSetup seller={seller} t={t} />
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center p-8 bg-card border border-border/50 rounded-3xl shadow-sm">
                <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <User className="size-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {seller.store_name}
                </h2>
                <p className="text-muted-foreground">{user?.email}</p>

                <div className="flex gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubTab('analytics')}
                    className={cn(
                      (subTab === 'analytics' || !subTab) &&
                        'bg-primary/5 border-primary text-primary',
                    )}
                  >
                    <BarChart3 className="size-4 mr-2" />
                    {t('auto.analytics')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubTab('settings')}
                    className={cn(
                      subTab === 'settings' &&
                        'bg-primary/5 border-primary text-primary',
                    )}
                  >
                    <Settings className="size-4 mr-2" />
                    {t('auto.settings')}
                  </Button>
                </div>
              </div>

              <div className="animate-fade-in">
                {(subTab === 'analytics' || !subTab) && (
                  <Analytics orders={orders} />
                )}
                {subTab === 'settings' && (
                  <StoreSettings
                    seller={seller}
                    onUpdate={updateSellerProfile}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function DashboardNav({ t, signOut, startTour, showHeaderOnly = false }: any) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
          <Store className="size-4 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {t('common.appName')}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <LanguageSwitcher />
        {!showHeaderOnly && (
          <>
            <FeedbackModal />
            <Button
              variant="ghost"
              size="sm"
              onClick={startTour}
              className="text-muted-foreground hover:text-primary"
            >
              <HelpCircle className="size-4" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="size-4 mr-2" />
          {t('common.signOut')}
        </Button>
      </div>
    </div>
  );
}

function DashboardHeader({
  seller,
  t,
  signOut,
  startTour,
  copied,
  copyStoreLink,
  navigate,
}: any) {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className="size-8 shrink-0 bg-primary rounded-lg flex items-center justify-center">
                <Store className="size-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground leading-tight">
                  {t('common.appName')}
                </h1>
                <p className="truncate text-[11px] text-muted-foreground leading-tight">
                  {seller.store_name}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <NetworkStrengthIndicator />
              <ThemeToggle />
              <LanguageSwitcher variant="compact" />
              <FeedbackModal />
              <Button
                variant="ghost"
                size="sm"
                onClick={startTour}
                title={t('auto.help_tour')}
              >
                <HelpCircle className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                title={t('common.signOut')}
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
            <div className="flex w-max items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyStoreLink}
                className="shrink-0 border-border/50 text-xs"
              >
                {copied ? (
                  <Check className="mr-1.5 size-3.5" />
                ) : (
                  <Copy className="mr-1.5 size-3.5" />
                )}
                <span>
                  {copied ? t('dashboard.copied') : t('dashboard.copyLink')}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/store/${seller.store_slug}`)}
                className="shrink-0 border-border/50 text-xs"
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                <span>{t('dashboard.viewStore')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardStats({ productsCount, seller, t, isApproved }: any) {
  return (
    <div
      id="tour-welcome"
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in"
    >
      <StatCard
        icon={Package}
        value={isApproved ? productsCount : '—'}
        label={t('dashboard.totalProducts')}
      />

      <StatCard
        icon={isApproved ? Upload : Lock}
        value={
          !isApproved
            ? t('auto.locked')
            : productsCount > 0
              ? t('dashboard.active')
              : t('dashboard.ready')
        }
        label={t('dashboard.aiAgent')}
        color={!isApproved ? t('auto.amber') : t('auto.green')}
      />

      <StatCard
        icon={Store}
        value={`/store/${seller.store_slug}`}
        label={t('dashboard.storeUrl')}
        color="amber"
        truncate
      />
    </div>
  );
}

function ToolCard({
  icon: Icon,
  label,
  description,
  onClick,
  color,
  active,
  comingSoon,
  t,
}: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center p-5 rounded-xl border transition-all duration-300 text-left gap-4 relative group hover:shadow-surface-lg',
        active
          ? t('auto.border_primary_bg_primary_5_sh')
          : t('auto.border_border_50_bg_card_hover'),
      )}
    >
      <div className="size-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
        <Icon className="size-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {description}
        </p>
      </div>
      {comingSoon && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
          {t('auto.coming_soon') || 'Coming Soon'}
        </span>
      )}
      <ChevronRight className="size-4 ml-auto text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors duration-300" />
    </button>
  );
}

function StatCard({ icon: Icon, value, label, color, truncate }: any) {
  const { t } = useTranslation();
  return (
    <div className="border border-border/40 rounded-xl p-5 bg-card shadow-surface hover:shadow-surface-lg transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p
            className={`text-2xl font-bold text-foreground ${truncate ? t('auto.text_sm_truncate_max_w_140px') : t('auto.tabular_nums')}`}
          >
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ProductsList({ products, t, onUpload, onUpdate, onDelete }: any) {
  if (products.length === 0) {
    return (
      <div className="border border-dashed border-border/50 rounded-xl p-16 text-center">
        <div className="size-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">
          {t('dashboard.noProducts')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('dashboard.noProductsDesc')}
        </p>
        <Button
          onClick={onUpload}
          className="bg-primary hover:bg-primary/90 transition-opacity"
        >
          <Upload className="size-4 mr-2" />
          {t('dashboard.uploadProducts')}
        </Button>
      </div>
    );
  }
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {t('dashboard.catalog')} ({products.length})
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={onUpload}
          className="w-full border-border/50 sm:w-auto"
        >
          <Upload className="size-3.5 mr-1.5" />
          {t('dashboard.addProducts')}
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product: any) => (
          <ProductCard
            key={product.id}
            product={product}
            editable
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}

function VerificationStatusBanner({
  seller,
  onSubmit,
}: {
  seller: any;
  onSubmit: any;
}) {
  const [showResubmit, setShowResubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  if (seller.verification_status === 'approved') return null;

  if (seller.verification_status === 'pending') {
    return (
      <div className="mb-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
        <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Clock className="size-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400">
            {t('auto.store_verification_pending')}
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
            {t('auto.our_admins_are_reviewing_your')}
          </p>
        </div>
      </div>
    );
  }

  if (seller.verification_status === 'rejected') {
    const lastSubmitted = seller.last_submitted_at
      ? new Date(seller.last_submitted_at)
      : null;
    const now = new Date();
    const hoursDiff = lastSubmitted
      ? (now.getTime() - lastSubmitted.getTime()) / (1000 * 60 * 60)
      : 24;
    const canResubmit = hoursDiff >= 24;
    const hoursLeft = Math.ceil(24 - hoursDiff);

    return (
      <div className="mb-6 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 space-y-4">
        <div className="flex items-start gap-4">
          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Ban className="size-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-900 dark:text-red-400">
              {t('auto.verification_rejected')}
            </h3>
            <p className="text-xs text-red-700 dark:text-red-500 mt-1">
              {t('auto.reason')}
              <span className="font-semibold italic">
                "{seller.admin_feedback || 'Documentation incomplete'}"
              </span>
            </p>
            {!canResubmit && (
              <p className="text-[10px] text-red-600 mt-2 font-medium flex items-center gap-1">
                <Clock className="size-3" />
                {t('auto.you_can_resubmit_in')}
                {hoursLeft}
                {t('auto.hours')}
              </p>
            )}
          </div>
          {canResubmit && !showResubmit && (
            <Button
              size="sm"
              onClick={() => setShowResubmit(true)}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              {t('auto.update_resubmit')}
            </Button>
          )}
        </div>

        {showResubmit && (
          <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-2">
            <StoreSetup
              onComplete={async data => {
                setIsSubmitting(true);
                const { error } = await onSubmit({
                  gstin: data.gstin,
                  registered_business_name: data.registered_business_name,
                  documents: data.verification_documents,
                });
                setIsSubmitting(false);
                if (error)
                  toast({
                    title: 'Error',
                    description: error.message,
                    variant: 'destructive',
                  });
                else {
                  toast({
                    title: 'Resubmitted!',
                    description:
                      'Your details have been sent for re-verification.',
                  });
                  setShowResubmit(false);
                }
              }}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResubmit(false)}
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {t('auto.cancel')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
