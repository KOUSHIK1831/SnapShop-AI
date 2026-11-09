import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  MapPin,
  Search,
  ExternalLink,
  Share2,
  LogOut,
  ShoppingBag,
  Phone,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  MessageCircle,
  User,
  Truck,
  CreditCard,
  Banknote,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import NavMenu from '@/components/NavMenu';
import FeedbackModal from '@/components/FeedbackModal';
import { cn } from '@/lib/utils';

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
  status:
    | 'pending'
    | 'accepted'
    | 'confirmed'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  pay_method: 'cod' | 'online';
  pay_status:
    'pending' | 'paid' | 'failed' | 'refunded' | 'awaiting_verification';
  payment_proof_url?: string | null;
  quantity: number;
  created_at: string;
  del_type?: 'courier' | 'self_delivery';
  tracking_provider?: string;
  tracking_number?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
  product: { title: string; price: number; image_url: string | null } | null;
  seller: {
    store_name: string | null;
    store_slug: string | null;
    contact_number: string | null;
    phone: string | null;
  } | null;
}

type Tab = 'shops' | 'orders' | 'profile';

const STATUS_CONFIG = {
  pending: {
    label: 'orders.status.pending',
    icon: Clock,
    class:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  },
  accepted: {
    label: 'orders.status.confirmed',
    icon: CheckCircle2,
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  },
  confirmed: {
    label: 'orders.status.confirmed',
    icon: CheckCircle2,
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  },
  shipped: {
    label: 'auto.shipped',
    icon: Truck,
    class:
      'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  },
  out_for_delivery: {
    label: 'auto.out_for_delivery',
    icon: Package,
    class:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  },
  delivered: {
    label: 'auto.delivered',
    icon: CheckCircle2,
    class:
      'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  },
  completed: {
    label: 'orders.status.completed',
    icon: CheckCircle2,
    class:
      'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  },
  cancelled: {
    label: 'orders.status.cancelled',
    icon: XCircle,
    class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  },
};

export default function BuyerDashboard() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = (searchParams.get('tab') as Tab) || 'shops';
  const setTab = (t: Tab) => setSearchParams({ tab: t });

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
        .select(
          'id, store_name, store_slug, store_description, location, banner_url, theme_color, contact_number, phone',
        )
        .not('store_slug', 'is', null)
        .neq('store_slug', '')
        .neq('status', 'blocked')
        .eq('verification_status', 'approved')
        .order('created_at', { ascending: false });

      if (!data) {
        setShopsLoading(false);
        return;
      }

      // Fetch product counts + categories per shop
      const extras = await Promise.all(
        data.map(async s => {
          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', s.id);
          const { data: cats } = await supabase
            .from('products')
            .select('category')
            .eq('seller_id', s.id)
            .not('category', 'is', null);
          const categories = [
            ...new Set((cats || []).map(c => c.category).filter(Boolean)),
          ] as string[];
          return { product_count: count ?? 0, categories };
        }),
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
        .select(
          'id, status, pay_method, pay_status, quantity, created_at, del_type, tracking_provider, tracking_number, delivery_person_name, delivery_person_phone, product:products(title, price, image_url), seller:sellers(store_name, store_slug, contact_number, phone)',
        )
        .eq('buyer_id', user!.id)
        .order('created_at', { ascending: false });

      setOrders((data as unknown as BuyerOrder[]) || []);
      setOrdersLoading(false);
    }
    loadOrders();
  }, [user?.id]);

  // All unique categories across all shops for filter bar
  const allCategories = [...new Set(shops.flatMap(s => s.categories || []))];

  const filteredShops = shops.filter(s => {
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
        toast({
          title: 'Link copied!',
          description: `${shop.store_name} store link copied to clipboard.`,
        });
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied!',
        description: `${shop.store_name} store link copied to clipboard.`,
      });
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
              <Store className="size-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              {t('common.appName')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="size-4" />
              <span>{user?.name || user?.email?.split('@')[0]}</span>
            </div>
            <NavMenu
              role={user?.role}
              onFeedback={() => setFeedbackOpen(true)}
            />
            <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="border-border/50"
            >
              <LogOut className="size-3.5 mr-1.5" />
              {t('auto.sign_out')}
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            {t('auto.welcome_back')}
            {user?.name || 'Buyer'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('auto.discover_shops_and_track_your')}
          </p>
        </div>

        {/* ── SHOPS TAB ── */}
        {tab === 'shops' && (
          <>
            {/* Search + category filters */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={t('auto.search_shops_or_location')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {allCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                      !activeCategory
                        ? t('auto.bg_primary_text_white_border_p')
                        : t('auto.border_border_50_text_muted_fo')
                    }`}
                  >
                    {t('storefront.all')}
                  </button>
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() =>
                        setActiveCategory(activeCategory === cat ? null : cat)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                        activeCategory === cat
                          ? t('auto.bg_primary_text_white_border_p')
                          : t('auto.border_border_50_text_muted_fo')
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
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div
                    key={n}
                    className="h-64 rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="text-center py-24">
                <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="size-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {search || activeCategory
                    ? t('auto.no_shops_match_your_filters')
                    : t('auto.no_shops_available_yet')}
                </p>
                {(search || activeCategory) && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setActiveCategory(null);
                    }}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    {t('auto.clear_filters')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredShops.length}
                  {t('auto.shop')}
                  {filteredShops.length !== 1 ? t('auto.s') : ''}
                  {t('auto.found')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredShops.map(shop => (
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
                {[1, 2, 3].map(n => (
                  <div
                    key={n}
                    className="h-24 rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-24">
                <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="size-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {t('auto.no_orders_yet')}
                </p>
                <button
                  onClick={() => setTab('shops')}
                  className="mt-3 text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
                >
                  {t('auto.browse_shops')}

                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onVisitStore={() =>
                      order.seller?.store_slug &&
                      navigate(`/store/${order.seller.store_slug}`)
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="max-w-md mx-auto bg-card border border-border/50 rounded-2xl p-6 shadow-sm animate-fade-in">
            <div className="flex flex-col items-center mb-6">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <User className="size-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {user?.name || 'Buyer'}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  {t('auto.account_role')}
                </p>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-none capitalize">
                  {user?.role}
                </Badge>
              </div>

              <Button
                variant="destructive"
                className="w-full mt-6"
                onClick={signOut}
              >
                <LogOut className="size-4 mr-2" />
                {t('auto.sign_out')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? t('auto.bg_card_text_foreground_shadow')
          : t('auto.text_muted_foreground_hover_te')
      }`}
    >
      {children}
    </button>
  );
}

function ShopCard({
  shop,
  onVisit,
  onShare,
}: {
  shop: ShopListing;
  onVisit: () => void;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="group bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
      {/* Banner */}
      <div
        className="h-28 relative overflow-hidden"
        style={{ backgroundColor: shop.theme_color || '#8B5CF6' }}
      >
        {shop.banner_url ? (
          <img
            src={shop.banner_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        )}
        <div className="absolute bottom-3 left-4">
          <div className="size-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Store className="size-5 text-white" />
          </div>
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onShare();
          }}
          className="absolute top-3 right-3 size-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center text-white transition-colors"
          title={t('auto.share_store_link')}
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
            {shop.categories.slice(0, 3).map(cat => (
              <span
                key={cat}
                className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium"
              >
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
            {shop.product_count}
            {t('auto.product')}
            {shop.product_count !== 1 ? t('auto.s') : ''}
          </span>
          <div className="flex gap-2">
            {(shop.contact_number || shop.phone) && (
              <a
                href={`https://wa.me/${(shop.contact_number || shop.phone)?.replace(/\D/g, '')}?text=${encodeURIComponent(t('auto.hi_i_found_your_store_on_apnab'))}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="size-8 border border-border/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-green-600 transition-colors"
                title={t('orders.whatsapp')}
              >
                <MessageCircle className="size-3.5" />
              </a>
            )}
            <Button
              size="sm"
              onClick={onVisit}
              className="bg-primary hover:bg-primary/90 transition-opacity h-8 px-3 text-xs"
            >
              <ExternalLink className="size-3 mr-1.5" />
              {t('auto.visit_store')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onVisitStore,
}: {
  order: BuyerOrder;
  onVisitStore: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const contact = order.seller?.contact_number || order.seller?.phone;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 flex gap-4 items-start shadow-sm group hover:shadow-md transition-all duration-300">
      {/* Product image or placeholder */}
      <div className="size-20 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/50">
        {order.product?.image_url ? (
          <img
            src={order.product.image_url}
            alt={order.product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
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
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.class}`}
          >
            <StatusIcon className="size-3" />
            {t(cfg.label as any)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-1">
          <p className="text-xs text-muted-foreground">
            {order.seller?.store_name || 'Store'}
            {t('auto.qty')}
            {order.quantity}
          </p>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-current/10 ${
              order.pay_status === 'paid'
                ? t('auto.bg_green_100_text_green_700_da_769')
                : order.pay_status === 'awaiting_verification'
                  ? t('auto.bg_blue_500_10_text_blue_600_b')
                  : t('auto.bg_amber_100_text_amber_700_da_980')
            }`}
          >
            {order.pay_method === 'online' ? (
              <CreditCard className="size-2.5" />
            ) : (
              <Banknote className="size-2.5" />
            )}
            {order.pay_method === 'cod'
              ? t('auto.cod_843')
              : t('auto.online_881')}
            : {order.pay_status}
          </span>
          {order.payment_proof_url && (
            <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
              <CheckCircle2 className="size-2.5" />
              {t('auto.proof_submitted')}
            </span>
          )}
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
            <Truck className="size-3.5 mr-1.5" />
            {t('auto.track_order')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs flex-1"
            onClick={onVisitStore}
          >
            {t('auto.visit_store')}
          </Button>
        </div>

        {/* Tracking Details (Brief) */}
        {(order.status === 'shipped' ||
          order.status === 'out_for_delivery' ||
          order.status === 'delivered') && (
          <div className="mb-3 p-2.5 bg-muted/50 rounded-lg border border-border/50 space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t('auto.tracking_information')}
            </p>
            {order.del_type === 'courier' ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                    <Truck className="size-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {order.tracking_provider}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('auto.id_913')}
                      {order.tracking_number}
                    </p>
                  </div>
                </div>
                {order.tracking_provider?.toLowerCase().includes('fedex') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] px-2"
                    onClick={() =>
                      window.open(
                        `https://www.fedex.com/fedextrack/?trknbr=${order.tracking_number}`,
                        '_blank',
                      )
                    }
                  >
                    {t('auto.track')}
                    <ExternalLink className="size-3 ml-1" />
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
                    <p className="text-xs font-medium text-foreground">
                      {order.delivery_person_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {order.delivery_person_phone}
                    </p>
                  </div>
                </div>
                {order.delivery_person_phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] px-2 text-green-600"
                    onClick={() =>
                      window.open(`tel:${order.delivery_person_phone}`, '_self')
                    }
                  >
                    {t('auto.call')}

                    <Phone className="size-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Calendar className="size-3" />
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>

          {contact && (
            <a
              href={`https://wa.me/${contact.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I placed an order for "${order.product?.title}" on SnapShop AI. Order status: ${order.status}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-green-600 hover:underline font-medium flex items-center gap-0.5"
            >
              <MessageCircle className="size-3" />
              {t('auto.whatsapp_seller')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
