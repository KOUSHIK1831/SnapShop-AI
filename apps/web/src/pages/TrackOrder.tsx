import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { useSocketEvent } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ExternalLink,
  ShoppingBag,
  User,
  Calendar,
  ShieldCheck,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface TrackingLog {
  id: string;
  status: string;
  description: string;
  changed_at: string;
}

interface OrderDetails {
  id: string;
  status: string;
  pay_status: string;
  payment_proof_url?: string | null;
  created_at: string;
  del_type: 'courier' | 'self_delivery';
  tracking_provider?: string;
  tracking_number?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
  delivery_address: {
    name: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  product: {
    title: string;
    price: number;
    image_url: string | null;
  } | null;
  seller: {
    store_name: string | null;
    store_slug: string | null;
  } | null;
}

const STATUS_STEPS = [
  { id: 'pending', label: 'Order Placed', icon: Clock },
  { id: 'preparing', label: 'Preparing', icon: Package },
  { id: 'ready_for_dispatch', label: 'Ready', icon: ShieldCheck },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'out_for_delivery', label: 'Out for Delivery', icon: Package },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

export default function TrackOrder() {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [logs, setLogs] = useState<TrackingLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!orderId) return;
    try {
      const [orderRes, logsRes] = await Promise.all([
        apiClient.get<{ order: any }>(`/orders/${orderId}`),
        apiClient.get<{ events: any[] }>(`/orders/${orderId}/events`),
      ]);

      if (orderRes?.order) setOrder(orderRes.order as unknown as OrderDetails);
      if (logsRes?.events) setLogs(logsRes.events);
    } catch (err) {
      console.error('Fetch order tracking error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId && user) {
      fetchData();
    }
  }, [orderId, user?.id]);

  useSocketEvent('order:status', (data: any) => {
    if (data?.orderId === orderId) {
      fetchData();
    }
  });

  if (loading) return <TrackOrderSkeleton />;

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <AlertCircle className="size-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">{t('auto.order_not_found')}</h1>
        <Button
          variant="ghost"
          onClick={() => navigate('/buyer')}
          className="mt-4"
        >
          <ArrowLeft className="size-4 mr-2" />
          {t('auto.back_to_orders')}
        </Button>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(
    step => step.id === order.status,
  );
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/buyer')}
              className="size-9 p-0 rounded-full"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-lg font-bold">{t('auto.track_order')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Order Brief */}
        <Card className="border-border/50 shadow-surface overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="p-5 flex-1 flex gap-4 bg-muted/5">
                {order.product?.image_url ? (
                  <img
                    src={order.product.image_url}
                    alt=""
                    className="size-20 rounded-lg object-cover border border-border/50"
                  />
                ) : (
                  <div className="size-20 rounded-lg bg-muted flex items-center justify-center border border-border/50">
                    <ShoppingBag className="size-8 text-muted-foreground/30" />
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    {t('auto.order')}
                    {order.id.slice(0, 8)}
                  </p>
                  <h2 className="font-semibold text-foreground">
                    {order.product?.title}
                  </h2>
                  <p className="text-sm text-primary font-bold mt-1">
                    ₹{order.product?.price}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('auto.seller_384')}
                    {order.seller?.store_name}
                  </p>
                </div>
              </div>
              <div className="p-5 sm:w-64 border-t sm:border-t-0 sm:border-l border-border/50 flex flex-col justify-center">
                <Badge
                  variant={
                    isCancelled ? t('auto.destructive') : t('auto.outline')
                  }
                  className="w-fit mb-2 capitalize"
                >
                  {order.status.replace(/_/g, ' ')}
                </Badge>
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">
                    {t('auto.placed_on')}
                    {format(new Date(order.created_at), 'PPP')}
                  </p>
                  <p className="text-[10px] font-semibold text-primary uppercase">
                    {t('auto.payment')}
                    {order.pay_status}
                  </p>
                  {order.payment_proof_url && (
                    <p className="text-[10px] text-green-600 font-medium">
                      {t('auto.payment_proof_submitted')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Progress */}
        {!isCancelled && (
          <div className="px-2 py-4 sm:px-8 sm:py-10 bg-card border border-border/50 rounded-2xl shadow-surface overflow-x-auto no-scrollbar">
            <div className="flex min-w-[600px] justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 w-full h-0.5 bg-muted z-0">
                <div
                  className="h-full bg-primary transition-all duration-1000"
                  style={{
                    width: `${(Math.max(0, currentStepIndex) / (STATUS_STEPS.length - 1)) * 100}%`,
                  }}
                />
              </div>

              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center gap-3 relative z-10"
                  >
                    <div
                      className={`size-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        isCompleted
                          ? t('auto.bg_primary_border_primary_text')
                          : t('auto.bg_background_border_muted_tex')
                      }`}
                    >
                      <StepIcon className="size-5" />
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wider ${isCompleted ? t('auto.text_foreground') : t('auto.text_muted_foreground')}`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-[9px] text-primary animate-pulse font-medium">
                          {t('auto.currently')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="p-8 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl flex flex-col items-center text-center">
            <XCircle className="size-12 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-red-900 dark:text-red-400">
              {t('auto.order_cancelled')}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-500 max-w-sm mt-2">
              {t('auto.this_order_has_been_cancelled')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tracking Details */}
          {(order.status === 'shipped' ||
            order.status === 'out_for_delivery' ||
            order.status === 'delivered') && (
            <Card className="border-border/50 shadow-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  {t('auto.delivery_details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.del_type === 'courier' ? (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Truck className="size-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">
                          {order.tracking_provider}
                        </p>
                        <p className="text-sm font-semibold">
                          {t('auto.id_913')}
                          {order.tracking_number}
                        </p>
                      </div>
                    </div>
                    {order.tracking_provider
                      ?.toLowerCase()
                      .includes('fedex') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://www.fedex.com/fedextrack/?trknbr=${order.tracking_number}`,
                            '_blank',
                          )
                        }
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="size-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">
                          {t('auto.delivery_partner')}
                        </p>
                        <p className="text-sm font-semibold">
                          {order.delivery_person_name}
                        </p>
                      </div>
                    </div>
                    {order.delivery_person_phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600"
                        onClick={() =>
                          window.open(
                            `tel:${order.delivery_person_phone}`,
                            '_self',
                          )
                        }
                      >
                        <Phone className="size-4" />
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                      {t('auto.delivery_address')}
                    </p>
                    <p className="text-sm text-foreground">
                      {order.delivery_address?.name}
                      <br />
                      {order.delivery_address?.line1},{' '}
                      {order.delivery_address?.city},{' '}
                      {order.delivery_address?.state} -{' '}
                      {order.delivery_address?.pincode}
                      <br />
                      {t('auto.phone')}
                      {order.delivery_address?.phone}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Logs */}
          <Card className="border-border/50 shadow-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                {t('auto.activity_log')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                {logs.map((log, i) => (
                  <div key={log.id} className="relative pl-8">
                    <div
                      className={`absolute left-0 top-1 size-4 rounded-full border-2 border-background ${i === 0 ? t('auto.bg_primary') : t('auto.bg_muted')}`}
                    />

                    <p className="text-xs font-bold text-foreground capitalize">
                      {log.status.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {log.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="size-2.5" />{' '}
                      {format(new Date(log.changed_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function TrackOrderSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-border/50 animate-pulse bg-muted/20" />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
