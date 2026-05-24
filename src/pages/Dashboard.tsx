import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import AppTour from '@/components/AppTour';
import FeedbackModal from '@/components/FeedbackModal';
import { useWelcomeTour } from '@/hooks/useWelcomeTour';

export type Tab = 'products' | 'orders' | 'upload' | 'inventory' | 'analytics' | 'settings';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
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
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [copied, setCopied] = useState(false);
  const { startTour } = useWelcomeTour(setActiveTab);

  const isApproved = seller?.verification_status === 'approved';

  useEffect(() => {
    if (seller && !isApproved && activeTab !== 'settings') {
      setActiveTab('settings');
      toast({ 
        title: "Access Restricted", 
        description: "Please complete your store setup and wait for admin approval to unlock all features.",
        variant: "default"
      });
    }
  }, [seller, isApproved, activeTab, toast]);

  useEffect(() => {
    let channel: any = null;
    if (seller?.id && isApproved) {
      fetchProducts();
      channel = supabase.channel("orders-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `seller_id=eq.${seller.id}` }, () => {
          toast({ title: t('orders.newOrder'), description: t('orders.newOrderDesc') });
          fetchOrders();
        })
        .subscribe();
    }
    return () => { if (channel) channel.unsubscribe(); };
  }, [seller?.id, toast, t, fetchProducts, fetchOrders]);

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin');
  }, [user?.role, navigate]);

  useEffect(() => {
    const lowStock = products.filter(p => p.stock !== undefined && p.stock > 0 && p.stock <= (p.low_stock_threshold || 5));
    if (lowStock.length > 0 && seller?.store_name) {
      toast({ title: "Low Stock Alert", description: `${lowStock.length} product(s) running low on stock.` });
    }
  }, [products, seller?.store_name, toast]);

  const copyStoreLink = () => {
    if (seller?.store_slug) {
      navigator.clipboard.writeText(`${window.location.origin}/store/${seller.store_slug}`);
      setCopied(true);
      toast({ title: t('dashboard.copied'), description: t('settings.shareLink') });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!seller?.store_name) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <DashboardNav t={t} signOut={signOut} startTour={startTour} showHeaderOnly />
          <StoreSetup onComplete={async (data) => {
            const result = await createSeller(data);
            if (result?.error) toast({ title: 'Error creating store', description: (result.error as any).message || String(result.error), variant: 'destructive' });
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
        <VerificationStatusBanner seller={seller} onSubmit={submitForVerification} />
        <DashboardStats productsCount={products.length} seller={seller} t={t} isApproved={isApproved} />
        <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} orders={orders} t={t} isApproved={isApproved} />
        <div className="animate-fade-in">
          {activeTab === 'products' && (
            <ProductsList products={products} t={t} onUpload={() => setActiveTab('upload')} onUpdate={updateProduct} onDelete={deleteProduct} />
          )}
          {activeTab === 'orders' && <Orders orders={orders} onUpdateStatus={updateOrderStatus} />}
          {activeTab === 'upload' && (
            <UploadZone 
              sellerId={seller.id} 
              onComplete={fetchProducts} 
              usageToday={ai_usage_today}
              dailyLimit={seller.ai_daily_limit}
            />
          )}
          {activeTab === 'inventory' && <InventoryEditor products={products} onUpdate={updateProduct} onDelete={deleteProduct} />}
          {activeTab === 'analytics' && <Analytics orders={orders} />}
          {activeTab === 'settings' && <StoreSettings seller={seller} onUpdate={updateSellerProfile} />}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function DashboardNav({ t, signOut, startTour, showHeaderOnly = false }: any) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="size-8 bg-gradient-brand rounded-lg flex items-center justify-center"><Store className="size-4 text-white" /></div>
        <h1 className="text-xl font-semibold text-foreground">ApnaBazar</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <LanguageSwitcher />
        {!showHeaderOnly && (
          <>
            <FeedbackModal />
            <Button variant="ghost" size="sm" onClick={startTour} className="text-muted-foreground hover:text-primary"><HelpCircle className="size-4" /></Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="size-4 mr-2" />{t('common.signOut')}</Button>
      </div>
    </div>
  );
}

function DashboardHeader({ seller, t, signOut, startTour, copied, copyStoreLink, navigate }: any) {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className="size-8 shrink-0 bg-gradient-brand rounded-lg flex items-center justify-center"><Store className="size-4 text-white" /></div>
              <div className="min-w-0"><h1 className="text-sm font-semibold text-foreground leading-tight">ApnaBazar</h1><p className="truncate text-[11px] text-muted-foreground leading-tight">{seller.store_name}</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle /><LanguageSwitcher variant="compact" /><FeedbackModal />
              <Button variant="ghost" size="sm" onClick={startTour} title="Help Tour"><HelpCircle className="size-4" /></Button>
              <Button variant="ghost" size="sm" onClick={signOut} title={t('common.signOut')}><LogOut className="size-3.5" /></Button>
            </div>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
            <div className="flex w-max items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyStoreLink} className="shrink-0 border-border/50 text-xs">
                {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
                <span>{copied ? t('dashboard.copied') : t('dashboard.copyLink')}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/store/${seller.store_slug}`)} className="shrink-0 border-border/50 text-xs">
                <ExternalLink className="mr-1.5 size-3.5" /><span>{t('dashboard.viewStore')}</span>
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
    <div id="tour-welcome" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
      <StatCard icon={Package} value={isApproved ? productsCount : "—"} label={t('dashboard.totalProducts')} />
      <StatCard 
        icon={isApproved ? Upload : Lock} 
        value={!isApproved ? "Locked" : productsCount > 0 ? t('dashboard.active') : t('dashboard.ready')} 
        label={t('dashboard.aiAgent')} 
        color={!isApproved ? "amber" : "green"} 
      />
      <StatCard icon={Store} value={`/store/${seller.store_slug}`} label={t('dashboard.storeUrl')} color="amber" truncate />
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color, truncate }: any) {
  return (
    <div className="border border-border/50 rounded-xl p-5 bg-card shadow-surface hover:shadow-surface-lg transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-xl flex items-center justify-center ${color === 'green' ? 'bg-green-500/10 text-green-500' : color === 'amber' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className={`text-2xl font-bold text-foreground ${truncate ? 'text-sm truncate max-w-[140px]' : 'tabular-nums'}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function DashboardTabs({ activeTab, setActiveTab, orders, t, isApproved }: any) {
  const tabs = [
    { id: 'products', label: t('dashboard.tabs.products'), icon: LayoutGrid, protected: true },
    { id: 'orders', label: t('dashboard.tabs.orders'), icon: ShoppingBag, protected: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, protected: true },
    { id: 'upload', label: t('dashboard.tabs.upload'), icon: Upload, protected: true },
    { id: 'inventory', label: 'Inventory', icon: ClipboardList, protected: true },
    { id: 'settings', label: t('dashboard.tabs.settings'), icon: Settings, protected: false },
  ];
  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1 rounded-xl bg-muted/50 p-1">
        {tabs.map((tab) => {
          const isLocked = tab.protected && !isApproved;
          return (
            <button
              key={tab.id}
              data-tour={tab.id}
              onClick={() => !isLocked && setActiveTab(tab.id as Tab)}
              disabled={isLocked}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-card text-foreground shadow-surface' 
                  : isLocked 
                    ? 'text-muted-foreground/40 cursor-not-allowed' 
                    : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isLocked ? <Lock className="size-3.5" /> : <tab.icon className="size-4" />}
              {tab.label}
              {!isLocked && tab.id === 'orders' && orders.filter((o: any) => o.status === 'pending').length > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  {orders.filter((o: any) => o.status === 'pending').length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductsList({ products, t, onUpload, onUpdate, onDelete }: any) {
  if (products.length === 0) {
    return (
      <div className="border border-dashed border-border/50 rounded-xl p-16 text-center">
        <div className="size-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4"><Package className="size-6 text-muted-foreground" /></div>
        <h3 className="font-medium text-foreground mb-2">{t('dashboard.noProducts')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('dashboard.noProductsDesc')}</p>
        <Button onClick={onUpload} className="bg-gradient-brand hover:opacity-90 transition-opacity"><Upload className="size-4 mr-2" />{t('dashboard.uploadProducts')}</Button>
      </div>
    );
  }
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('dashboard.catalog')} ({products.length})</h2>
        <Button size="sm" variant="outline" onClick={onUpload} className="w-full border-border/50 sm:w-auto"><Upload className="size-3.5 mr-1.5" />{t('dashboard.addProducts')}</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product: any) => (<ProductCard key={product.id} product={product} editable onUpdate={onUpdate} onDelete={onDelete} />))}
      </div>
    </>
  );
}

function VerificationStatusBanner({ seller, onSubmit }: { seller: any, onSubmit: any }) {
  const [showResubmit, setShowResubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (seller.verification_status === 'approved') return null;

  if (seller.verification_status === 'pending') {
    return (
      <div className="mb-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
        <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Clock className="size-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400">Store Verification Pending</h3>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
            Our admins are reviewing your business details. You can still manage your products, but your store might have limited visibility until approved.
          </p>
        </div>
      </div>
    );
  }

  if (seller.verification_status === 'rejected') {
    const lastSubmitted = seller.last_submitted_at ? new Date(seller.last_submitted_at) : null;
    const now = new Date();
    const hoursDiff = lastSubmitted ? (now.getTime() - lastSubmitted.getTime()) / (1000 * 60 * 60) : 24;
    const canResubmit = hoursDiff >= 24;
    const hoursLeft = Math.ceil(24 - hoursDiff);

    return (
      <div className="mb-6 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 space-y-4">
        <div className="flex items-start gap-4">
          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Ban className="size-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-900 dark:text-red-400">Verification Rejected</h3>
            <p className="text-xs text-red-700 dark:text-red-500 mt-1">
              Reason: <span className="font-semibold italic">"{seller.admin_feedback || 'Documentation incomplete'}"</span>
            </p>
            {!canResubmit && (
              <p className="text-[10px] text-red-600 mt-2 font-medium flex items-center gap-1">
                <Clock className="size-3" /> You can resubmit in {hoursLeft} hours.
              </p>
            )}
          </div>
          {canResubmit && !showResubmit && (
            <Button size="sm" onClick={() => setShowResubmit(true)} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              Update & Resubmit
            </Button>
          )}
        </div>

        {showResubmit && (
          <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-2">
            <StoreSetup onComplete={async (data) => {
              setIsSubmitting(true);
              const { error } = await onSubmit({
                gstin: data.gstin,
                registered_business_name: data.registered_business_name,
                documents: data.verification_documents
              });
              setIsSubmitting(false);
              if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
              else {
                toast({ title: "Resubmitted!", description: "Your details have been sent for re-verification." });
                setShowResubmit(false);
              }
            }} />
            <Button variant="ghost" size="sm" onClick={() => setShowResubmit(false)} className="w-full mt-2" disabled={isSubmitting}>Cancel</Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
