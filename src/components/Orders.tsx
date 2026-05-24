import React, { useState } from 'react';
import { Order } from '@/hooks/useSeller';
import { useLanguage } from '@/i18n/LanguageContext';
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
} from "@/components/ui/dialog";
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
  CreditCard
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
  onUpdateStatus: (orderId: string, status: Order['status'], trackingInfo?: TrackingInfo, paymentInfo?: PaymentInfo) => Promise<{ error: PostgrestError | Error | null }>;
}

export default function Orders({ orders, onUpdateStatus }: OrdersProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);

  const handleStatusUpdate = async (orderId: string, status: Order['status'], trackingInfo?: TrackingInfo, paymentInfo?: PaymentInfo) => {
    setUpdatingId(orderId);
    try {
      const { error } = await onUpdateStatus(orderId, status, trackingInfo, paymentInfo);
      if (error) {
        toast({ title: 'Update failed', description: error.message || 'Could not update order status.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: paymentInfo ? 'Payment status updated.' : `Order marked as ${status}.` });
        setShippingOrderId(null);
      }
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Something went wrong.', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'confirmed': 
      case 'accepted': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'shipped': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'out_for_delivery': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'delivered':
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  const getPaymentStatusColor = (status: Order['pay_status']) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'refunded': return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
      default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Clock className="size-3.5 mr-1" />;
      case 'confirmed':
      case 'accepted': return <CheckCircle2 className="size-3.5 mr-1" />;
      case 'shipped': return <Truck className="size-3.5 mr-1" />;
      case 'out_for_delivery': return <Package className="size-3.5 mr-1" />;
      case 'delivered':
      case 'completed': return <CheckCircle2 className="size-3.5 mr-1" />;
      case 'cancelled': return <XCircle className="size-3.5 mr-1" />;
    }
  };

  const getWhatsAppLink = (phone: string, order: Order) => {
    const cleanPhone = phone.replace(/\D/g, '');
    let message = `Hi, I am the seller from ApnaBazar. I received your order for "${order.product?.title}". Status: ${order.status.toUpperCase()}.`;
    
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
        <h3 className="text-xl font-semibold text-foreground mb-2">{t('orders.noOrders')}</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Share your store link with customers to start receiving orders!
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
          <Badge variant="secondary" className="ml-2 font-mono">{orders.length}</Badge>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.map((order) => (
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
                    <OrderDate date={order.created_at} label={t('orders.placedOn')} />
                    {order.confirmed_at && <OrderDate date={order.confirmed_at} label={t('orders.confirmedOn')} />}
                    {order.completed_at && <OrderDate date={order.completed_at} label={t('orders.completedOn')} />}
                    <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                      {order.product?.title || t('orders.product')}
                    </h3>
                    <p className="text-primary font-mono font-bold">₹{order.product?.price || 0}</p>
                    
                    {order.status === 'shipped' && order.tracking_number && (
                      <div className="mt-2 text-xs flex items-center gap-1 text-purple-600 font-medium">
                        <Truck className="size-3" />
                        {order.tracking_provider}: {order.tracking_number}
                      </div>
                    )}
                    {order.status === 'shipped' && order.del_type === 'self_delivery' && (
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
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('orders.customer')}</p>
                      <p className="font-medium text-foreground truncate max-w-[180px]">{order.buyer_name || 'Buyer'}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={`font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status === 'confirmed' ? 'Confirmed' : t(`orders.status.${order.status}`)}
                    </Badge>
                    <Badge variant="outline" className={`font-bold capitalize ${getPaymentStatusColor(order.pay_status)}`}>
                      {order.pay_method === 'online' ? <CreditCard className="size-3 mr-1" /> : <Banknote className="size-3 mr-1" />}
                      {order.pay_method === 'cod' ? 'COD' : 'Online'}: {order.pay_status}
                    </Badge>
                  </div>

                  {order.delivery_address && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3 mt-0.5 shrink-0" />
                      <p className="line-clamp-2">
                        {order.delivery_address.line1}, {order.delivery_address.city}
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
                        onClick={() => window.open(getWhatsAppLink(order.buyer_phone!, order), '_blank')}
                      >
                        <MessageCircle className="size-4 mr-2" />
                        WhatsApp
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-10 border-border/50"
                      onClick={() => order.buyer_phone && window.open(`tel:${order.buyer_phone}`, '_self')}
                    >
                      <Phone className="size-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-brand hover:opacity-90 transition-opacity h-10 font-bold"
                        onClick={() => handleStatusUpdate(order.id, 'accepted')}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Accept Order
                      </Button>
                    )}
                    {(order.status === 'confirmed' || order.status === 'accepted') && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="w-full bg-purple-600 hover:bg-purple-700 h-10 font-bold"
                        onClick={() => setShippingOrderId(order.id)}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        <Truck className="size-4 mr-2" />
                        Ship Order
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-bold"
                        onClick={() => handleStatusUpdate(order.id, 'out_for_delivery')}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Out for Delivery
                      </Button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="w-full bg-green-600 hover:bg-green-700 h-10 font-bold"
                        onClick={() => handleStatusUpdate(order.id, 'delivered')}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Mark Delivered
                      </Button>
                    )}
                    {order.status === 'delivered' && order.pay_method === 'cod' && order.pay_status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="w-full bg-amber-600 hover:bg-amber-700 h-10 font-bold"
                        onClick={() => handleStatusUpdate(order.id, order.status, undefined, { pay_status: 'paid' })}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? <Loader2 className="size-4 animate-spin mr-2" /> : <Banknote className="size-4 mr-2" />}
                        Confirm Cash Payment
                      </Button>
                    )}
                    {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'accepted') && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 h-9"
                        onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id && <Loader2 className="size-3 animate-spin mr-2" />}
                        Cancel Order
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
        onSubmit={(trackingInfo) => shippingOrderId && handleStatusUpdate(shippingOrderId, 'shipped', trackingInfo)}
        isSubmitting={updatingId === shippingOrderId}
      />
    </div>
  );
}

function TrackingDialog({ isOpen, onClose, onSubmit, isSubmitting }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (info: TrackingInfo) => void;
  isSubmitting: boolean;
}) {
  const [delType, setDelType] = useState<'courier' | 'self_delivery'>('courier');
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
      ...formData
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Shipping Information</DialogTitle>
          <DialogDescription>
            Enter tracking details to notify the customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <RadioGroup 
              defaultValue="courier" 
              onValueChange={(v) => setDelType(v as 'courier' | 'self_delivery')}
              className="grid grid-cols-2 gap-4 mb-2"
            >
              <div>
                <RadioGroupItem value="courier" id="courier" className="peer sr-only" />
                <Label
                  htmlFor="courier"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Truck className="mb-2 h-6 w-6" />
                  Courier
                </Label>
              </div>
              <div>
                <RadioGroupItem value="self_delivery" id="self_delivery" className="peer sr-only" />
                <Label
                  htmlFor="self_delivery"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <User className="mb-2 h-6 w-6" />
                  Self Delivery
                </Label>
              </div>
            </RadioGroup>

            {delType === 'courier' ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="provider">Courier Provider</Label>
                  <Input 
                    id="provider" 
                    placeholder="FedEx, Delhivery, etc." 
                    required 
                    value={formData.tracking_provider}
                    onChange={e => setFormData(f => ({ ...f, tracking_provider: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="number">Tracking Number</Label>
                  <Input 
                    id="number" 
                    placeholder="TRK123456789" 
                    required 
                    value={formData.tracking_number}
                    onChange={e => setFormData(f => ({ ...f, tracking_number: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="driver">Driver Name</Label>
                  <Input 
                    id="driver" 
                    placeholder="Enter driver name" 
                    required 
                    value={formData.delivery_person_name}
                    onChange={e => setFormData(f => ({ ...f, delivery_person_name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dphone">Driver Phone</Label>
                  <Input 
                    id="dphone" 
                    placeholder="Enter driver phone" 
                    required 
                    value={formData.delivery_person_phone}
                    onChange={e => setFormData(f => ({ ...f, delivery_person_phone: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              Confirm & Ship
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
      {label && <span className="font-medium">{label}:</span>} {format(new Date(date), 'MMM dd, yyyy • HH:mm')}
    </div>
  );
}
