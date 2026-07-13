import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Order } from '@/hooks/useSeller';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PostgrestError } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShoppingBag,
  User,
  Calendar,
  MessageCircle,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Truck,
  Package,
  ExternalLink,
  MapPin,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';

interface TrackingInfo {
  del_type: 'courier' | 'self_delivery';
  tracking_provider?: string;
  tracking_number?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
}

interface PaymentInfo {
  pay_status: Order['pay_status'];
  gateway_payment_id?: string;
}

interface OrdersProps {
  orders: Order[];
  onUpdateStatus: (
    orderId: string,
    status: Order['status'],
    trackingInfo?: TrackingInfo,
    paymentInfo?: PaymentInfo,
  ) => Promise<{ error: PostgrestError | Error | null }>;
}

export default function Orders({ orders, onUpdateStatus }: OrdersProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);

  const handleStatusUpdate = async (
    orderId: string,
    status: Order['status'],
    trackingInfo?: TrackingInfo,
    paymentInfo?: PaymentInfo,
  ) => {
    setUpdatingId(orderId);
    try {
      const { error } = await onUpdateStatus(
        orderId,
        status,
        trackingInfo,
        paymentInfo,
      );
      if (error) {
        toast({
          title: 'Update failed',
          description: error.message || 'Could not update order status.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: paymentInfo
            ? t('auto.payment_status_updated')
            : `Order marked as ${status}.`,
        });
        setShippingOrderId(null);
      }
    } catch (err) {
      toast({
        title: 'Update failed',
        description:
          err instanceof Error
            ? err.message
            : t('auto.something_went_wrong_74'),
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return t('auto.bg_amber_500_10_text_amber_600_528');
      case 'confirmed':
      case 'accepted':
        return t('auto.bg_blue_500_10_text_blue_600_b');
      case 'shipped':
        return t('auto.bg_purple_500_10_text_purple_6');
      case 'out_for_delivery':
        return t('auto.bg_indigo_500_10_text_indigo_6');
      case 'delivered':
      case 'completed':
        return t('auto.bg_green_500_10_text_green_600');
      case 'cancelled':
        return t('auto.bg_red_500_10_text_red_600_bor');
      default:
        return t('auto.bg_slate_500_10_text_slate_600_124');
    }
  };

  const getPaymentStatusColor = (status: Order['pay_status']) => {
    switch (status) {
      case 'paid':
        return t('auto.bg_green_500_10_text_green_600_70');
      case 'awaiting_verification':
        return t('auto.bg_blue_500_10_text_blue_600_b');
      case 'failed':
        return t('auto.bg_red_500_10_text_red_600_bor');
      case 'refunded':
        return t('auto.bg_slate_500_10_text_slate_600_124');
      default:
        return t('auto.bg_amber_500_10_text_amber_600_528');
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="size-3.5 mr-1" />;
      case 'confirmed':
      case 'accepted':
        return <CheckCircle2 className="size-3.5 mr-1" />;
      case 'shipped':
        return <Truck className="size-3.5 mr-1" />;
      case 'out_for_delivery':
        return <Package className="size-3.5 mr-1" />;
      case 'delivered':
      case 'completed':
        return <CheckCircle2 className="size-3.5 mr-1" />;
      case 'cancelled':
        return <XCircle className="size-3.5 mr-1" />;
    }
  };

  const getWhatsAppLink = (phone: string, order: Order) => {
    const cleanPhone = phone.replace(/\D/g, '');
    let message = `Hi, I am the seller from SnapShop AI. I received your order for "${order.product?.title}". Status: ${order.status.toUpperCase()}.`;

    if (order.status === 'shipped') {
      if (order.del_type === 'courier') {
        message += ` It has been shipped via ${order.tracking_provider}. Tracking ID: ${order.tracking_number}`;
      } else {
        message += ` It is out for delivery with ${order.delivery_person_name}. Contact: ${order.delivery_person_phone}`;
      }
    }

    return `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(message)}`;
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-border/50 rounded-2xl bg-card/30 backdrop-blur-sm animate-fade-in">
        <div className="size-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {t('orders.noOrders')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {t('auto.share_your_store_link_with_cus')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <ShoppingBag className="size-6 text-primary" />
          {t('orders.title')}
          <Badge variant="secondary" className="ml-2 font-mono">
            {orders.length}
          </Badge>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.map(order => (
          <Card
            key={order.id}
            className="overflow-hidden border-border/50 shadow-surface hover:shadow-surface-lg transition-all duration-300 group"
          >
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                {/* Product Info */}
                <div className="p-5 flex-1 flex gap-4 border-b md:border-b-0 md:border-r border-border/50 bg-muted/5">
                  {order.product?.image_url ? (
                    <div className="w-20 h-24 rounded-lg overflow-hidden bg-secondary shrink-0 shadow-sm">
                      <img
                        src={order.product.image_url}
                        alt={order.product.title}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-24 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <ShoppingBag className="size-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex flex-col justify-center">
                    <OrderDate
                      date={order.created_at}
                      label={t('orders.placedOn')}
                    />

                    {order.confirmed_at && (
                      <OrderDate
                        date={order.confirmed_at}
                        label={t('orders.confirmedOn')}
                      />
                    )}
                    {order.completed_at && (
                      <OrderDate
                        date={order.completed_at}
                        label={t('orders.completedOn')}
                      />
                    )}
                    <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                      {order.product?.title || t('orders.product')}
                    </h3>
                    <p className="text-primary font-mono font-bold">
                      ₹{order.product?.price || 0}
                    </p>

                    {order.status === 'shipped' && order.tracking_number && (
                      <div className="mt-2 text-xs flex items-center gap-1 text-purple-600 font-medium">
                        <Truck className="size-3" />
                        {order.tracking_provider}: {order.tracking_number}
                      </div>
                    )}
                    {order.status === 'shipped' &&
                      order.del_type === 'self_delivery' && (
                        <div className="mt-2 text-xs flex items-center gap-1 text-indigo-600 font-medium">
                          <User className="size-3" />
                          {order.delivery_person_name}
                        </div>
                      )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="p-5 flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center">
                      <User className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        {t('orders.customer')}
                      </p>
                      <p className="font-medium text-foreground truncate max-w-[180px]">
                        {order.buyer_name || 'Buyer'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={`font-medium ${getStatusColor(order.status)}`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status === 'confirmed'
                        ? t('orders.status.confirmed')
                        : t(`orders.status.${order.status}`)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`font-bold capitalize ${getPaymentStatusColor(order.pay_status)}`}
                    >
                      {order.pay_method === 'online' ? (
                        <CreditCard className="size-3 mr-1" />
                      ) : (
                        <Banknote className="size-3 mr-1" />
                      )}
                      {order.pay_method === 'cod'
                        ? t('auto.cod_843')
                        : t('auto.online_881')}
                      : {order.pay_status}
                    </Badge>
                  </div>

                  {order.delivery_address && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3 mt-0.5 shrink-0" />
                      <p className="line-clamp-2">
                        {order.delivery_address.line1},{' '}
                        {order.delivery_address.city}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-5 flex flex-col justify-center gap-2 bg-muted/5 min-w-[220px]">
                  <div className="flex gap-2 mb-1">
                    {order.buyer_phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-green-600 h-10"
                        onClick={() =>
                          window.open(
                            getWhatsAppLink(order.buyer_phone!, order),
                            '_blank',
                          )
                        }
                      >
                        <MessageCircle className="size-4 mr-2" />
                        {t('auto.whatsapp')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 border-border/50"
                      onClick={() =>
                        order.buyer_phone &&
                        window.open(`tel:${order.buyer_phone}`, '_self')
                      }
                    >
                      <Phone className="size-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        className="w-full h-10 font-bold"
                        onClick={() =>
                          handleStatusUpdate(order.id, 'preparing')
                        }
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="size-4 animate-spin mr-2" />
                        ) : null}
                        {t('auto.start_preparing')}
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-bold"
                        onClick={() =>
                          handleStatusUpdate(order.id, 'ready_for_dispatch')
                        }
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="size-4 animate-spin mr-2" />
                        ) : null}
                        {t('auto.mark_ready_for_dispatch')}
                      </Button>
                    )}
                    {(order.status === 'ready_for_dispatch' ||
                      order.status === 'confirmed' ||
                      order.status === 'accepted') && (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-purple-600 hover:bg-purple-700 h-10 font-bold"
                        onClick={() => setShippingOrderId(order.id)}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="size-4 animate-spin mr-2" />
                        ) : null}
                        <Truck className="size-4 mr-2" />
                        {t('auto.ship_order')}
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-bold"
                        onClick={() =>
                          handleStatusUpdate(order.id, 'out_for_delivery')
                        }
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="size-4 animate-spin mr-2" />
                        ) : null}
                        {t('auto.out_for_delivery')}
                      </Button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-green-600 hover:bg-green-700 h-10 font-bold"
                        onClick={() =>
                          handleStatusUpdate(order.id, 'delivered')
                        }
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="size-4 animate-spin mr-2" />
                        ) : null}
                        {t('auto.mark_delivered')}
                      </Button>
                    )}
                    {order.status === 'delivered' &&
                      order.pay_method === 'cod' &&
                      order.pay_status === 'pending' && (
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full bg-amber-600 hover:bg-amber-700 h-10 font-bold"
                          onClick={() =>
                            handleStatusUpdate(
                              order.id,
                              order.status,
                              undefined,
                              { pay_status: 'paid' },
                            )
                          }
                          disabled={updatingId === order.id}
                        >
                          {updatingId === order.id ? (
                            <Loader2 className="size-4 animate-spin mr-2" />
                          ) : (
                            <Banknote className="size-4 mr-2" />
                          )}
                          {t('auto.confirm_cash_payment')}
                        </Button>
                      )}
                    {order.pay_status === 'awaiting_verification' && (
                      <div className="space-y-2 mb-2">
                        {order.payment_proof_url && (
                          <a
                            href={order.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 py-1.5 rounded-md border border-blue-100"
                          >
                            <ExternalLink className="size-3" />
                            {t('auto.view_payment_proof')}
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-bold"
                          onClick={() =>
                            handleStatusUpdate(
                              order.id,
                              order.status,
                              undefined,
                              {
                                pay_status: 'paid',
                              },
                            )
                          }
                          disabled={updatingId === order.id}
                        >
                          {updatingId === order.id ? (
                            <Loader2 className="size-4 animate-spin mr-2" />
                          ) : (
                            <CreditCard className="size-4 mr-2" />
                          )}
                          {t('auto.confirm_payment')}
                        </Button>
                      </div>
                    )}
                    {(order.status === 'pending' ||
                      order.status === 'confirmed' ||
                      order.status === 'accepted') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 h-9"
                        onClick={() =>
                          handleStatusUpdate(order.id, 'cancelled')
                        }
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id && (
                          <Loader2 className="size-3 animate-spin mr-2" />
                        )}
                        {t('auto.cancel_order')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TrackingDialog
        isOpen={!!shippingOrderId}
        onClose={() => setShippingOrderId(null)}
        onSubmit={trackingInfo =>
          shippingOrderId &&
          handleStatusUpdate(shippingOrderId, 'shipped', trackingInfo)
        }
        isSubmitting={updatingId === shippingOrderId}
      />
    </div>
  );
}

function TrackingDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (info: TrackingInfo) => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();
  const [delType, setDelType] = useState<'courier' | 'self_delivery'>(
    'courier',
  );
  const [formData, setFormData] = useState({
    tracking_provider: '',
    tracking_number: '',
    delivery_person_name: '',
    delivery_person_phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      del_type: delType,
      ...formData,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('auto.shipping_information')}</DialogTitle>
          <DialogDescription>
            {t('auto.enter_tracking_details_to_noti')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <RadioGroup
              defaultValue={t('auto.courier')}
              onValueChange={v => setDelType(v as 'courier' | 'self_delivery')}
              className="grid grid-cols-2 gap-4 mb-2"
            >
              <div>
                <RadioGroupItem
                  value={t('auto.courier')}
                  id="courier"
                  className="peer sr-only"
                />

                <Label
                  htmlFor={t('auto.courier')}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Truck className="mb-2 h-6 w-6" />
                  {t('auto.courier_397')}
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value={t('auto.self_delivery')}
                  id="self_delivery"
                  className="peer sr-only"
                />

                <Label
                  htmlFor={t('auto.self_delivery')}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <User className="mb-2 h-6 w-6" />
                  {t('auto.self_delivery_907')}
                </Label>
              </div>
            </RadioGroup>

            {delType === 'courier' ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={t('auto.provider')}>
                    {t('auto.courier_provider')}
                  </Label>
                  <Input
                    id="provider"
                    placeholder={t('auto.fedex_delhivery_etc')}
                    required
                    value={formData.tracking_provider}
                    onChange={e =>
                      setFormData(f => ({
                        ...f,
                        tracking_provider: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={t('auto.number')}>
                    {t('auto.tracking_number')}
                  </Label>
                  <Input
                    id="number"
                    placeholder={t('auto.trk123456789')}
                    required
                    value={formData.tracking_number}
                    onChange={e =>
                      setFormData(f => ({
                        ...f,
                        tracking_number: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={t('auto.driver')}>
                    {t('auto.driver_name')}
                  </Label>
                  <Input
                    id="driver"
                    placeholder={t('auto.enter_driver_name')}
                    required
                    value={formData.delivery_person_name}
                    onChange={e =>
                      setFormData(f => ({
                        ...f,
                        delivery_person_name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={t('auto.dphone')}>
                    {t('auto.driver_phone')}
                  </Label>
                  <Input
                    id="dphone"
                    placeholder={t('auto.enter_driver_phone')}
                    required
                    value={formData.delivery_person_phone}
                    onChange={e =>
                      setFormData(f => ({
                        ...f,
                        delivery_person_phone: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {t('auto.confirm_ship')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrderDate({ date, label }: { date: string; label?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
      <Calendar className="size-3" />
      {label && <span className="font-medium">{label}:</span>}{' '}
      {format(new Date(date), 'MMM dd, yyyy • HH:mm')}
    </div>
  );
}
