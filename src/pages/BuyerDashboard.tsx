import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Store, MapPin, Search, ExternalLink, Share2, LogOut,
  ShoppingBag, Phone, Package, Clock, CheckCircle2,
  XCircle, ChevronRight, MessageCircle, User, Truck, 
  CreditCard, Banknote, Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface ShopListing {
  id: string;
  store_name: string | null;
  store_slug: string | null;
  store_description: string | null;
  location: string | null;
  banner_url: string | null;
  theme_color: string | null;
  contact_number: string | null;
  phone: string | null;
  product_count?: number;
  categories?: string[];
}

interface BuyerOrder {
  id: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
  pay_method: 'cod' | 'online';
  pay_status: 'pending' | 'paid' | 'failed' | 'refunded';
  quantity: number;
  created_at: string;
  del_type?: 'courier' | 'self_delivery';
  tracking_provider?: string;
  tracking_number?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
  product: { title: string; price: number; image_url: string | null } | null;
  seller: { store_name: string | null; store_slug: string | null; contact_number: string | null; phone: string | null } | null;
}

type Tab = 'shops' | 'orders';

const STATUS_CONFIG = {
  pending:          { label: 'Pending',          icon: Clock,         class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  accepted:         { label: 'Accepted',         icon: CheckCircle2,  class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  confirmed:        { label: 'Confirmed',        icon: CheckCircle2,  class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  shipped:          { label: 'Shipped',          icon: Truck,         class: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
  out_for_delivery: { label: 'Out for Delivery', icon: Package,       class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' },
  delivered:        { label: 'Delivered',        icon: CheckCircle2,  class: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
  completed:        { label: 'Completed',        icon: CheckCircle2,  class: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
  cancelled:        { label: 'Cancelled',        icon: XCircle,       class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
};

export default function BuyerDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('shops');
  const [shops, setShops] = useState<ShopListing[]>([]);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load shops
  useEffect(() => {
    async function loadShops() {
      const { data } = await supabase
        .from('sellers')
        .select('id, store_name, store_slug, store_description, location, banner_url, theme_color, contact_number, phone')
        .not('store_slug', 'is', null)
        .neq('store_slug', '')
        .neq('status', 'blocked')
        .order('created_at', { ascending: false });

      if (!data) { setShopsLoading(false); return; }

      // Fetch product counts + categories per shop
      const extras = await Promise.all(
        data.map(async (s) => {
          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', s.id);
          const { data: cats } = await supabase
            .from('products')
            .select('category')
            .eq('seller_id', s.id)
            .not('category', 'is', null);
          const categories = [...new Set((cats || []).map((c) => c.category).filter(Boolean))] as string[];
          return { product_count: count ?? 0, categories };
        })
      );

      setShops(data.map((s, i) => ({ ...s, ...extras[i] })));
      setShopsLoading(false);
    }
    loadShops();
  }, []);

  // Load buyer orders
  useEffect(() => {
    if (!user) return;
    async function loadOrders() {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, status, pay_method, pay_status, quantity, created_at,
          del_type, tracking_provider, tracking_number,
          delivery_person_name, delivery_person_phone,
          product:products(title, price, image_url),
          seller:sellers(store_name, store_slug, contact_number, phone)
        `)
        .eq('buyer_id', user!.id)
        .order('created_at', { ascending: false });

      setOrders((data as unknown as BuyerOrder[]) || []);
      setOrdersLoading(false);
    }
    loadOrders();
  }, [user]);

  // All unique categories across all shops for filter bar
  const allCategories = [...new Set(shops.flatMap((s) => s.categories || []))];

  const filteredShops = shops.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.store_name?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q) ||
      s.store_description?.toLowerCase().includes(q);
    const matchesCategory =
      !activeCategory || (s.categories || []).includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  const handleShare = async (shop: ShopListing) => {
    const url = `${window.location.origin}/store/${shop.store_slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shop.store_name || 'Store', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied!', description: `${shop.store_name} store link copied to clipboard.` });
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!', description: `${shop.store_name} store link copied to clipboard.` });
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-gradient-brand rounded-lg flex items-center justify-center">
              <Store className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">ApnaBazar</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="size-4" />
              <span>{user?.name || user?.email?.split('@')[0]}</span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="border-border/50">
              <LogOut className="size-3.5 mr-1.5" /> Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {user?.name || 'Buyer'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Discover shops and track your orders</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit mb-8 border border-border/50">
          <TabButton active={tab === 'shops'} onClick={() => setTab('shops')}>
            <Store className="size-4" /> Shops
          </TabButton>
          <TabButton active={tab === 'orders'} onClick={() => setTab('orders')}>
            <Package className="size-4" /> My Orders
            {pendingCount > 0 && (
              <span className="ml-1.5 size-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabButton>
        </div>

        {/* ── SHOPS TAB ── */}
        {tab === 'shops' && (
          <>
            {/* Search + category filters */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search shops or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {allCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                      !activeCategory
                        ? 'bg-primary text-white border-primary'
                        : 'border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                        activeCategory === cat
                          ? 'bg-primary text-white border-primary'
                          : 'border-border/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {shopsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-64 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="text-center py-24">
                <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="size-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {search || activeCategory ? 'No shops match your filters.' : 'No shops available yet.'}
                </p>
                {(search || activeCategory) && (
                  <button
                    onClick={() => { setSearch(''); setActiveCategory(null); }}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredShops.length} shop{filteredShops.length !== 1 ? 's' : ''} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredShops.map((shop) => (
                    <ShopCard
                      key={shop.id}
                      shop={shop}
                      onVisit={() => navigate(`/store/${shop.store_slug}`)}
                      onShare={() => handleShare(shop)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <>
            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-24 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-24">
                <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="size-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No orders yet</p>
                <button
                  onClick={() => setTab('shops')}
                  className="mt-3 text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
                >
                  Browse shops <ChevronRight className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onVisitStore={() => order.seller?.store_slug && navigate(`/store/${order.seller.store_slug}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-card text-foreground shadow-sm border border-border/50'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function ShopCard({ shop, onVisit, onShare }: { shop: ShopListing; onVisit: () => void; onShare: () => void }) {
  return (
    <div className="group bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
      {/* Banner */}
      <div className="h-28 relative overflow-hidden" style={{ backgroundColor: shop.theme_color || '#8B5CF6' }}>
        {shop.banner_url ? (
          <img src={shop.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        )}
        <div className="absolute bottom-3 left-4">
          <div className="size-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Store className="size-5 text-white" />
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="absolute top-3 right-3 size-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center text-white transition-colors"
          title="Share store link"
        >
          <Share2 className="size-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-foreground text-base leading-tight mb-1">
          {shop.store_name || 'Unnamed Store'}
        </h3>

        {shop.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="size-3 shrink-0" /> {shop.location}
          </p>
        )}

        {shop.store_description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {shop.store_description}
          </p>
        )}

        {/* Category pills */}
        {shop.categories && shop.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {shop.categories.slice(0, 3).map((cat) => (
              <span key={cat} className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                {cat}
              </span>
            ))}
            {shop.categories.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                +{shop.categories.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {shop.product_count} product{shop.product_count !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            {(shop.contact_number || shop.phone) && (
              <a
                href={`https://wa.me/${(shop.contact_number || shop.phone)?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I found your store on ApnaBazar!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="size-8 border border-border/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-green-600 transition-colors"
                title="Chat on WhatsApp"
              >
                <MessageCircle className="size-3.5" />
              </a>
            )}
            <Button
              size="sm"
              onClick={onVisit}
              className="bg-gradient-brand hover:opacity-90 transition-opacity h-8 px-3 text-xs"
            >
              <ExternalLink className="size-3 mr-1.5" /> Visit Store
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onVisitStore }: { order: BuyerOrder; onVisitStore: () => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const contact = order.seller?.contact_number || order.seller?.phone;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 flex gap-4 items-start shadow-sm group hover:shadow-md transition-all duration-300">
      {/* Product image or placeholder */}
      <div className="size-20 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/50">
        {order.product?.image_url ? (
          <img src={order.product.image_url} alt={order.product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="size-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-foreground text-sm leading-tight truncate">
            {order.product?.title || 'Product'}
          </p>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.class}`}>
            <StatusIcon className="size-3" />
            {cfg.label}
          </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-1">
          <p className="text-xs text-muted-foreground">
            {order.seller?.store_name || 'Store'} · Qty: {order.quantity}
          </p>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-current/10 ${
            order.pay_status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
          }`}>
            {order.pay_method === 'online' ? <CreditCard className="size-2.5" /> : <Banknote className="size-2.5" />}
            {order.pay_method === 'cod' ? 'COD' : 'Online'}: {order.pay_status}
          </span>
          </div>


        <p className="text-sm font-bold text-primary mb-2">
          ₹{order.product?.price ?? '—'}
        </p>

        <div className="flex gap-2 mb-3">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs flex-1 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
            onClick={() => navigate(`/track-order/${order.id}`)}
          >
            <Truck className="size-3.5 mr-1.5" /> Track Order
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 text-xs flex-1"
            onClick={onVisitStore}
          >
            Visit Store
          </Button>
        </div>

        {/* Tracking Details (Brief) */}
        {(order.status === 'shipped' || order.status === 'out_for_delivery' || order.status === 'delivered') && (
          <div className="mb-3 p-2.5 bg-muted/50 rounded-lg border border-border/50 space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tracking Information</p>
            {order.del_type === 'courier' ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                    <Truck className="size-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{order.tracking_provider}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {order.tracking_number}</p>
                  </div>
                </div>
                {order.tracking_provider?.toLowerCase().includes('fedex') && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => window.open(`https://www.fedex.com/fedextrack/?trknbr=${order.tracking_number}`, '_blank')}>
                    Track <ExternalLink className="size-3 ml-1" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                    <User className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{order.delivery_person_name}</p>
                    <p className="text-[10px] text-muted-foreground">{order.delivery_person_phone}</p>
                  </div>
                </div>
                {order.delivery_person_phone && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] px-2 text-green-600"
                    onClick={() => window.open(`tel:${order.delivery_person_phone}`, '_self')}
                  >
                    Call <Phone className="size-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Calendar className="size-3" />
            {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>

          {contact && (
            <a
              href={`https://wa.me/${contact.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I placed an order for "${order.product?.title}" on ApnaBazar. Order status: ${order.status}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-green-600 hover:underline font-medium flex items-center gap-0.5"
            >
              <MessageCircle className="size-3" /> WhatsApp Seller
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
