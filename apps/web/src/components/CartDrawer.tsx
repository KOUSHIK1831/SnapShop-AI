import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CartDrawer() {
  const { t } = useTranslation();
  const { cart, isOpen, closeCart, updateQuantity, removeItem, clearCart } =
    useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [checkoutStep, setCheckoutStep] = useState<
    'cart' | 'address' | 'success'
  >('cart');
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  });

  const items = cart?.items || [];
  const total = items.reduce((sum, item) => {
    const price = item.variant?.priceOverride ?? item.product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    if (!address.name || !address.phone || !address.line1 || !address.city) {
      toast({
        title: 'Missing Address',
        description: 'Please fill in all delivery address details.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/orders', {
        fromCart: true,
        buyerName: address.name,
        buyerPhone: address.phone,
        deliveryAddress: address,
        deliveryType: 'courier',
        payMethod: 'cod',
      });

      await clearCart();
      setCheckoutStep('success');
      toast({
        title: 'Order Placed!',
        description: 'Your order has been placed successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Checkout Failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    closeCart();
    setTimeout(() => setCheckoutStep('cart'), 300);
  };

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && handleClose()}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            {checkoutStep === 'cart'
              ? 'Your Cart'
              : checkoutStep === 'address'
                ? 'Delivery Address'
                : 'Order Confirmed'}
          </SheetTitle>
        </SheetHeader>

        {checkoutStep === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <CheckCircle2 className="size-10" />
            </div>
            <h3 className="text-xl font-bold">Thank you for your order!</h3>
            <p className="text-sm text-muted-foreground">
              The seller has received your order and will begin preparing it
              shortly.
            </p>
            <Button onClick={handleClose} className="w-full mt-4">
              Continue Shopping
            </Button>
          </div>
        ) : checkoutStep === 'address' ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Contact & Address
              </label>
              <Input
                placeholder="Full Name"
                value={address.name}
                onChange={e => setAddress({ ...address, name: e.target.value })}
              />
              <Input
                placeholder="Phone Number (10-digit)"
                value={address.phone}
                onChange={e =>
                  setAddress({ ...address, phone: e.target.value })
                }
              />
              <Input
                placeholder="Address Line 1"
                value={address.line1}
                onChange={e =>
                  setAddress({ ...address, line1: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="City"
                  value={address.city}
                  onChange={e =>
                    setAddress({ ...address, city: e.target.value })
                  }
                />
                <Input
                  placeholder="State"
                  value={address.state}
                  onChange={e =>
                    setAddress({ ...address, state: e.target.value })
                  }
                />
              </div>
              <Input
                placeholder="Pincode"
                value={address.pincode}
                onChange={e =>
                  setAddress({ ...address, pincode: e.target.value })
                }
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-xl space-y-2 mt-6">
              <div className="flex justify-between text-sm">
                <span>Items Subtotal:</span>
                <span className="font-semibold">₹{total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Method:</span>
                <span className="font-semibold">Cash on Delivery (COD)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <ShoppingBag className="size-12 mb-3 stroke-1" />
                <p className="font-medium">Your cart is empty</p>
                <p className="text-xs mt-1">
                  Add items from any store to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(item => {
                  const price =
                    item.variant?.priceOverride ?? item.product?.price ?? 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                    >
                      {item.product?.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.title}
                          className="size-14 rounded-lg object-cover bg-muted"
                        />
                      ) : (
                        <div className="size-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="size-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {item.product?.title || 'Product'}
                        </p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground">
                            Size: {item.variant.size}
                          </p>
                        )}
                        <p className="text-sm font-bold text-primary mt-1">
                          ₹{price * item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              Math.max(1, item.quantity - 1),
                            )
                          }
                          className="size-7 rounded-md bg-muted flex items-center justify-center hover:bg-accent"
                          title="Decrease"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="size-7 rounded-md bg-muted flex items-center justify-center hover:bg-accent"
                          title="Increase"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        title="Remove"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {checkoutStep !== 'success' && items.length > 0 && (
          <SheetFooter className="border-t pt-4 flex-col sm:flex-col gap-3">
            <div className="flex justify-between items-center w-full text-base font-bold">
              <span>Total:</span>
              <span className="text-primary">₹{total}</span>
            </div>

            {checkoutStep === 'cart' ? (
              <Button
                onClick={() => setCheckoutStep('address')}
                className="w-full"
              >
                Proceed to Checkout
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => setCheckoutStep('cart')}
                  className="flex-1"
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting && (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  )}
                  Place Order
                </Button>
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
