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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import AppTour from '@/components/AppTour';
import FeedbackModal from '@/components/FeedbackModal';
import { useWelcomeTour } from '@/hooks/useWelcomeTour';

export type Tab = 'products' | 'orders' | 'upload' | 'inventory' | 'settings';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const {
    seller,
    products,
    orders,
    loading,
    createSeller,
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

  useEffect(() => {
    let channel: any = null;
    if (seller?.id) {
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
        <DashboardStats productsCount={products.length} seller={seller} t={t} />
        <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} orders={orders} t={t} />
        <div className="animate-fade-in">
          {activeTab === 'products' && (
            <ProductsList products={products} t={t} onUpload={() => setActiveTab('upload')} onUpdate={updateProduct} onDelete={deleteProduct} />
          )}
          {activeTab === 'orders' && <Orders orders={orders} onUpdateStatus={updateOrderStatus} />}
          {activeTab === 'upload' && <UploadZone sellerId={seller.id} onComplete={fetchProducts} />}
          {activeTab === 'inventory' && <InventoryEditor products={products} onUpdate={updateProduct} onDelete={deleteProduct} />}
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

function DashboardStats({ productsCount, seller, t }: any) {
  return (
    <div id="tour-welcome" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
      <StatCard icon={Package} value={productsCount} label={t('dashboard.totalProducts')} />
      <StatCard icon={Upload} value={productsCount > 0 ? t('dashboard.active') : t('dashboard.ready')} label={t('dashboard.aiAgent')} color="green" />
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

function DashboardTabs({ activeTab, setActiveTab, orders, t }: any) {
  const tabs = [
    { id: 'products', label: t('dashboard.tabs.products'), icon: LayoutGrid },
    { id: 'orders', label: t('dashboard.tabs.orders'), icon: ShoppingBag },
    { id: 'upload', label: t('dashboard.tabs.upload'), icon: Upload },
    { id: 'inventory', label: 'Inventory', icon: ClipboardList },
    { id: 'settings', label: t('dashboard.tabs.settings'), icon: Settings },
  ];
  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1 rounded-xl bg-muted/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-tour={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${ activeTab === tab.id ? 'bg-card text-foreground shadow-surface' : 'text-muted-foreground hover:text-foreground' }`}
          >
            <tab.icon className="size-4" />{tab.label}
            {tab.id === 'orders' && orders.filter((o: any) => o.status === 'pending').length > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {orders.filter((o: any) => o.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
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
