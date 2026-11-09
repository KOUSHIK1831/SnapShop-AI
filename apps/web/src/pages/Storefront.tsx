import { useTranslation } from 'react-i18next';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { Seller, Product } from '@/hooks/useSeller';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import OrderConfirmation, {
  DeliveryAddress,
} from '@/components/OrderConfirmation';
import BuyerAuthModal from '@/components/BuyerAuthModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Store,
  MapPin,
  Phone,
  Hash,
  ShoppingBag,
  ShoppingCart,
  MessageCircle,
  ExternalLink,
  Ban,
  ShieldCheck,
  ArrowLeft,
  FileText,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { trackEvent } from '@/lib/analytics';

function StorefrontContent() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { cart, addItem, openCart } = useCart();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [orderedProduct, setOrderedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const sellerRes = await apiClient.get<{ seller: any }>(
          `/sellers/${slug}`,
        );
        const sellerData = sellerRes?.seller;

        if (!sellerData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (
          sellerData.status === 'blocked' ||
          sellerData.verification_status !== 'approved'
        ) {
          setSeller(sellerData);
          setLoading(false);
          return;
        }

        setSeller(sellerData);

        const prodRes = await apiClient.get<{ items: any[] }>(
          `/sellers/${slug}/products?pageSize=100`,
        );
        setProducts(prodRes?.items || []);
        setLoading(false);
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Check for pending order after returning from auth (fallback for full page redirects)
  useEffect(() => {
    if (!loading && user && products.length > 0) {
      const pendingProductId = sessionStorage.getItem(
        'pending_order_product_id',
      );
      if (pendingProductId) {
        const product = products.find(p => p.id === pendingProductId);
        if (product) {
          setPendingProduct(product);
          setShowOrderConfirm(true);
          sessionStorage.removeItem('pending_order_product_id');
          toast({
            title: t('auto.welcome_back_280'),
            description: t('auto.please_complete_your_order_det'),
          });
        }
      }
    }
  }, [loading, user, products, toast]);

  useEffect(() => {
    if (seller) {
      trackEvent('storefront_visited', { slug, storeName: seller.store_name });
    }
  }, [seller, slug]);

  const openWhatsAppChat = (message: string) => {
    const contactNumber = seller?.contact_number || seller?.phone;
    if (!contactNumber) {
      toast({
        title: t('storefront.contactUnavailable'),
        description: t('storefront.contactUnavailableDesc'),
      });
      return;
    }

    const cleanPhone = contactNumber.replace(/\D/g, '');
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
      '_blank',
    );
  };

  const handleWhatsAppChat = (product: Product) => {
    trackEvent('whatsapp_clicked', {
      productId: product.id,
      productTitle: product.title,
    });
    openWhatsAppChat(
      `Hi, I'm interested in ${product.title} from ${seller?.store_name || 'your store'}. The listed price is Rs. ${product.price}. Can you share more details?`,
    );
  };

  const handleSellerContact = () => {
    openWhatsAppChat(
      `Hi, I'm interested in the products from ${seller?.store_name || 'your store'}. Can you share more details?`,
    );
  };

  const categories = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return [
      ...new Set(products.flatMap(p => (p.category ? [p.category] : []))),
    ];
  }, [products]) as string[];

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return selectedCategory
      ? products.filter(p => p.category === selectedCategory)
      : products;
  }, [products, selectedCategory]);

  const handleOrder = async (product: Product) => {
    if (
      product.size_variants &&
      product.size_variants.length > 0 &&
      !selectedSize
    ) {
      toast({
        title: 'Please select a size',
        description: 'Choose a size before placing your order.',
        variant: 'default',
      });
      return;
    }

    if (user?.role === 'seller') {
      toast({
        title: 'Action Restricted',
        description: 'Sellers cannot place orders. Please use a buyer account.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      setPendingProduct(product);
      setShowAuth(true);
      return;
    }
    if (!user.email_confirmed) {
      setPendingProduct(product);
      setShowAuth(true);
      return;
    }
    await placeOrder(product);
  };

  const placeOrder = async (
    product: Product,
    buyerPhone: string = '',
    buyerId?: string,
  ) => {
    const currentUser = user;
    if (currentUser?.role === 'seller') {
      toast({
        title: 'Order restricted',
        description: 'Sellers cannot place orders. Please use a buyer account.',
        variant: 'destructive',
      });
      return;
    }
    const uid = buyerId || currentUser?.id;
    if (!uid) {
      setPendingProduct(product);
      setShowAuth(true);
      return;
    }
    setPendingProduct(product);
    setShowOrderConfirm(true);
  };

  const handlePlaceOrderWithAddress = async (
    address: DeliveryAddress,
    payMethod: 'cod' | 'online',
    onlineType?: 'upi_qr' | 'razorpay',
    paymentProofUrl?: string,
  ) => {
    const product = pendingProduct;
    if (!product) return;
    const currentUser = user;
    const uid = currentUser?.id;
    if (!uid) {
      toast({
        title: 'Order failed',
        description: 'Please sign in to place an order.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const gatewayId = null;
      let payStatus: 'pending' | 'paid' | 'awaiting_verification' = 'pending';

      // If user chose Razorpay, trigger the modal before saving to DB
      if (payMethod === 'online' && onlineType === 'razorpay') {
        const isRazorpayReady = await loadRazorpay();
        if (!isRazorpayReady) {
          toast({
            title: 'Payment Error',
            description: 'Razorpay SDK failed to load. Please try again.',
            variant: 'destructive',
          });
          return;
        }

        const currentUnitPrice =
          product.discount_percent && product.discount_percent > 0
            ? Math.round(product.price * (1 - product.discount_percent / 100))
            : product.price;

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
          amount: Math.round(currentUnitPrice * 100),
          currency: 'INR',
          name: 'SnapShop AI',
          description: `Order for ${product.title}`,
          image: '/placeholder.svg',
          handler: async function (response: any) {
            await finalizeOrder(
              product,
              address,
              payMethod,
              'paid',
              response.razorpay_payment_id,
              undefined,
            );
          },
          prefill: {
            name: address.name,
            email: currentUser?.email || '',
            contact: address.phone,
          },
          theme: { color: seller?.theme_color || '#7c3aed' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return; // Finalize happens in the callback
      }

      // Handle COD or UPI QR (Manual verification)
      if (payMethod === 'online' && onlineType === 'upi_qr') {
        payStatus = 'awaiting_verification';
      }

      await finalizeOrder(
        product,
        address,
        payMethod,
        payStatus,
        null,
        paymentProofUrl,
      );
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const finalizeOrder = async (
    product: Product,
    address: DeliveryAddress,
    payMethod: string,
    payStatus: any,
    gatewayId: string | null = null,
    paymentProofUrl?: string,
  ) => {
    const currentUser = user;
    const uid = currentUser?.id;

    const currentUnitPrice =
      product.discount_percent && product.discount_percent > 0
        ? Math.round(product.price * (1 - product.discount_percent / 100))
        : product.price;

    try {
      const selectedVariant = product.size_variants?.find(
        (v: any) => v.size === selectedSize,
      );
      await apiClient.post('/orders', {
        sellerId: product.seller_id,
        buyerName:
          address.name ||
          currentUser?.name ||
          currentUser?.email?.split('@')[0] ||
          'Buyer',
        buyerPhone: address.phone || currentUser?.phone || '9999999999',
        deliveryAddress: address,
        deliveryType: 'courier',
        payMethod:
          payMethod === 'online'
            ? 'online'
            : payMethod === 'upi'
              ? 'upi'
              : 'cod',
        items: [
          {
            productId: product.id,
            variantId: (selectedVariant as any)?.id,
            quantity: 1,
          },
        ],
      });

      setOrderedProduct(product);
      trackEvent('order_placed', {
        productId: product.id,
        productTitle: product.title,
        price: product.price,
        payMethod,
        size: selectedSize,
      });
      toast({
        title: t('storefront.orderPlaced'),
        description:
          payStatus === 'paid'
            ? t('auto.payment_successful_order_sent')
            : t('storefront.orderSent'),
      });
      setSelectedSize(null);
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: 'Order failed',
        description: 'Could not place order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const loadRazorpay = () => {
    return new Promise(resolve => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAuthSuccess = async (phone?: string) => {
    setShowAuth(false);
    if (pendingProduct) {
      // Show address modal now that user is authenticated
      setShowOrderConfirm(true);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-background py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-4 w-32 mx-auto mb-16" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(num => (
              <Skeleton key={`skeleton-${num}`} className="h-96 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            {t('storefront.storeNotFound')}
          </h1>

          <p className="text-muted-foreground">
            {t('storefront.storeNotFoundDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (seller?.status === 'blocked') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        {' '}
        <div className="max-w-md w-full text-center animate-fade-in space-y-4">
          {' '}
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            {' '}
            <Ban className="w-10 h-10 text-destructive" />{' '}
          </div>{' '}
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            {t('storefront.storeBlocked')}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t('storefront.storeBlockedDesc')}
          </p>
          <div className="pt-8">
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
              className="w-full h-12 text-base rounded-xl border-border/50"
            >
              {' '}
              {t('auto.back_to_home')}{' '}
            </Button>{' '}
          </div>{' '}
        </div>{' '}
      </div>
    );
  }
  return (
    <div
      className="min-h-screen bg-background"
      style={
        seller?.theme_color
          ? ({ '--theme-color': seller.theme_color } as React.CSSProperties)
          : undefined
      }
    >
      {' '}
      {/* Store Header */}{' '}
      <header className="relative overflow-hidden">
        {' '}
        {seller?.banner_url ? (
          <div className="absolute inset-0">
            {' '}
            <img
              src={seller.banner_url}
              alt=""
              className="w-full h-full object-cover"
            />{' '}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40" />{' '}
          </div>
        ) : (
          <>
            {' '}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: seller?.theme_color || '#8B5CF6',
                opacity: 0.9,
              }}
            />{' '}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />{' '}
          </>
        )}{' '}
        <div className="relative max-w-5xl mx-auto px-6 py-12 text-white">
          {' '}
          <div className="flex items-center gap-3 mb-4 animate-fade-in">
            {' '}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="size-9 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              {' '}
              <Store className="w-6 h-6" />{' '}
            </div>{' '}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {seller?.store_name}
                </h1>
                {seller?.verification_status === 'approved' && (
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm flex items-center gap-1 h-6 text-[10px] uppercase font-bold px-2">
                    <ShieldCheck className="size-3 text-green-400" />
                    {t('auto.verified')}
                  </Badge>
                )}
              </div>
              {seller?.location && (
                <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" /> {seller.location}
                  {seller.store_number && <span> · {seller.store_number}</span>}
                </p>
              )}
              {seller?.verification_status === 'approved' && (
                <div className="flex flex-col gap-0.5 mt-2 opacity-70">
                  {seller.registered_business_name && (
                    <p className="text-[10px] font-medium flex items-center gap-1 uppercase">
                      <FileText className="size-2.5" />{' '}
                      {seller.registered_business_name}
                    </p>
                  )}
                  {seller.gstin && (
                    <p className="text-[10px] font-medium flex items-center gap-1 uppercase tracking-wider">
                      <Hash className="size-2.5" />
                      {t('auto.gst')}
                      {seller.gstin}
                    </p>
                  )}
                </div>
              )}
            </div>{' '}
          </div>{' '}
          <div className="absolute top-6 right-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={openCart}
                className="relative size-9 p-0 rounded-full bg-white/20 hover:bg-white/30 text-white"
                title="Open Cart"
              >
                <ShoppingBag className="size-4" />
                {cart && cart.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full size-4 flex items-center justify-center">
                    {cart.count}
                  </span>
                )}
              </Button>
              <ThemeToggle /> <LanguageSwitcher variant="compact" />
            </div>
          </div>{' '}
          {seller?.store_description && (
            <p className="text-white/80 max-w-xl mb-4 animate-slide-up">
              {seller.store_description}
            </p>
          )}{' '}
          <div className="flex flex-wrap gap-2 animate-slide-up">
            {' '}
            {(seller?.contact_number || seller?.phone) && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                onClick={handleSellerContact}
              >
                {' '}
                <Phone className="w-3.5 h-3.5 mr-1.5" />{' '}
                {seller.contact_number || seller.phone}{' '}
              </Button>
            )}{' '}
            {seller?.store_number && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-md text-sm backdrop-blur-sm">
                {' '}
                <Hash className="w-3.5 h-3.5" /> {seller.store_number}{' '}
              </div>
            )}{' '}
          </div>{' '}
        </div>{' '}
      </header>{' '}
      {/* Maps */}{' '}
      {seller?.maps_url && (
        <div className="max-w-5xl mx-auto px-6 -mt-4 relative z-10 mb-8">
          {' '}
          <div className="rounded-xl overflow-hidden border border-border/50 shadow-surface-lg">
            {' '}
            <iframe
              src={seller.maps_url}
              width="100%"
              height="200"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={t('auto.store_location')}
            />{' '}
          </div>{' '}
        </div>
      )}{' '}
      {/* Category Filters */}{' '}
      {seller?.verification_status !== 'approved' ? (
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="size-20 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="size-10 text-amber-600 animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {seller?.status === 'blocked'
              ? t('admin.toasts.storeBlocked')
              : t('auto.store_under_review')}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            {seller?.status === 'blocked'
              ? t('auto.this_store_has_been_blocked_by')
              : t('auto.our_team_is_currently_verifyin')}
          </p>
          <Button
            variant="outline"
            className="mt-8 border-border/50"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="size-4 mr-2" />
            {t('auto.back_to_home')}
          </Button>
        </div>
      ) : (
        <>
          {categories.length > 0 && (
            <div className="max-w-5xl mx-auto px-6 py-4">
              {' '}
              <div className="flex flex-wrap gap-2">
                {' '}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    !selectedCategory
                      ? t('auto.bg_primary_text_white_shadow_s_539')
                      : t('auto.bg_muted_text_muted_foreground_147')
                  }`}
                >
                  {t('storefront.all')} ({products.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === cat
                        ? t('auto.bg_primary_text_white_shadow_s_539')
                        : t('auto.bg_muted_text_muted_foreground_147')
                    }`}
                  >
                    {' '}
                    {cat} ({products.filter(p => p.category === cat).length}
                    ){' '}
                  </button>
                ))}{' '}
              </div>{' '}
            </div>
          )}
          {/* Products */}{' '}
          <main className="max-w-5xl mx-auto px-6 py-8">
            {' '}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 animate-fade-in">
                {' '}
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  {' '}
                  <ShoppingBag className="w-6 h-6 text-muted-foreground" />{' '}
                </div>{' '}
                <p className="text-muted-foreground">
                  {t('storefront.noProducts')}
                </p>{' '}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="group bg-card rounded-xl border border-border/40 overflow-hidden shadow-surface hover:shadow-surface-lg transition-all duration-300"
                  >
                    {product.image_url && (
                      <div className="aspect-[4/5] overflow-hidden bg-muted/50">
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="font-medium text-foreground leading-snug">
                          {product.title}
                        </h3>
                        <div className="text-right shrink-0">
                          {(product.discount_percent ?? 0) > 0 ? (
                            <div>
                              <div className="font-bold text-foreground tabular-nums text-lg leading-none">
                                ₹
                                {Math.round(
                                  product.price *
                                    (1 - (product.discount_percent ?? 0) / 100),
                                )}
                              </div>
                              <div className="flex items-center gap-1 justify-end mt-1">
                                <span className="text-xs text-muted-foreground line-through">
                                  ₹{product.price}
                                </span>
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                                  {product.discount_percent}
                                  {t('auto.off')}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="font-bold text-foreground tabular-nums text-lg leading-none">
                              ₹{product.price}
                            </span>
                          )}
                        </div>
                      </div>

                      {product.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {product.size_variants &&
                      product.size_variants.length > 0 ? (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            {t('auto.select_size')}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {product.size_variants.map(v => (
                              <button
                                key={v.size}
                                disabled={v.stock === 0}
                                onClick={() => setSelectedSize(v.size)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                  selectedSize === v.size
                                    ? t(
                                        'auto.border_primary_bg_primary_text_230',
                                      )
                                    : v.stock === 0
                                      ? t('auto.border_border_40_bg_muted_30_t')
                                      : t('auto.border_border_40_hover_border')
                                }`}
                              >
                                {v.size}
                                {v.stock > 0 && v.stock <= 5 && (
                                  <span className="ml-1 text-[9px] text-muted-foreground">
                                    ({v.stock})
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : product.size ? (
                        <p className="text-xs text-muted-foreground">
                          {t('auto.size_426')}{' '}
                          <span className="font-medium text-foreground">
                            {product.size}
                          </span>
                        </p>
                      ) : null}

                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {product.tags.map(tag => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] uppercase tracking-wider font-medium"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {product.stock !== undefined &&
                        (!product.size_variants ||
                          product.size_variants.length === 0) && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              product.stock === 0
                                ? t('auto.bg_red_50_text_red_600_dark_bg')
                                : product.stock <=
                                    (product.low_stock_threshold || 5)
                                  ? t('auto.bg_amber_50_text_amber_600_dar')
                                  : t('auto.bg_green_50_text_green_600_dar')
                            }`}
                          >
                            {product.stock === 0
                              ? t('auto.out_of_stock')
                              : `In stock (${product.stock})`}
                          </span>
                        )}

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          data-testid={`buy-now-btn-${product.id}`}
                          className="flex-1 bg-primary hover:bg-primary/90 transition-opacity text-sm"
                          onClick={() => handleOrder(product)}
                        >
                          <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                          {t('storefront.orderNow')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`add-to-cart-btn-${product.id}`}
                          className="border-border/40"
                          onClick={() => {
                            const selectedVariant = product.size_variants?.find(
                              (v: any) => v.size === selectedSize,
                            );
                            addItem(
                              product.id,
                              (selectedVariant as any)?.id,
                              1,
                            );
                          }}
                          title="Add to cart"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`whatsapp-btn-${product.id}`}
                          className="border-border/40"
                          onClick={() => handleWhatsAppChat(product)}
                          title={t('orders.whatsapp')}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {t('auto.place_your_order_and_the_selle')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}{' '}
          </main>{' '}
          {/* Footer */}{' '}
          <footer className="max-w-5xl mx-auto px-6 mt-12 py-8 border-t border-border/50 text-center">
            {' '}
            <div className="flex items-center justify-center gap-2 mb-2">
              {' '}
              <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center">
                {' '}
                <Store className="w-2.5 h-2.5 text-primary-foreground" />{' '}
              </div>{' '}
              <span className="text-xs font-semibold text-foreground">
                {t('storefront.poweredBy')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('storefront.empowering')}
            </p>
          </footer>
        </>
      )}
      <OrderConfirmation
        isOpen={showOrderConfirm}
        onClose={() => {
          setShowOrderConfirm(false);
          setOrderedProduct(null);
          setPendingProduct(null);
          setSelectedSize(null);
        }}
        productTitle={pendingProduct?.title || orderedProduct?.title || ''}
        productPrice={pendingProduct?.price || orderedProduct?.price || 0}
        discountPercent={
          pendingProduct?.discount_percent ||
          orderedProduct?.discount_percent ||
          0
        }
        sellerName={seller?.store_name || undefined}
        sellerContact={seller?.contact_number || seller?.phone || undefined}
        sellerUpiId={seller?.seller_upi_id}
        razorpayAccountId={seller?.razorpay_account_id}
        preferredPaymentMethod={seller?.preferred_payment_method}
        initialAddress={{
          name: user?.name || '',
          phone: user?.phone?.replace(/^\+91/, '') || '',
        }}
        selectedSize={selectedSize}
        onConfirm={handlePlaceOrderWithAddress}
      />
      <BuyerAuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
        storeName={seller?.store_name}
      />
    </div>
  );
}

export default function Storefront() {
  return <StorefrontContent />;
}
