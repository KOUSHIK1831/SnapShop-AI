import React, { useReducer, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, Phone, MessageCircle, MapPin, ChevronRight, Loader2, X, CreditCard, Banknote } from 'lucide-react';

export interface DeliveryAddress {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

interface OrderConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  productPrice: number;
  discountPercent?: number;
  sellerName?: string;
  sellerContact?: string;
  onConfirm: (address: DeliveryAddress, payMethod: 'cod' | 'online') => Promise<void>;
}

type Step = 'address' | 'payment' | 'success';

interface State {
  step: Step;
  submitting: boolean;
  address: DeliveryAddress;
  payMethod: 'cod' | 'online';
  errors: Partial<DeliveryAddress>;
}

type Action =
  | { type: 'SET_FIELD'; field: keyof DeliveryAddress; value: string }
  | { type: 'SET_ERRORS'; errors: Partial<DeliveryAddress> }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_PAY_METHOD'; method: 'cod' | 'online' }
  | { type: 'SET_STEP'; step: Step };

const emptyAddress: DeliveryAddress = { name: '', phone: '', line1: '', city: '', state: '', pincode: '' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, address: { ...state.address, [action.field]: action.value }, errors: { ...state.errors, [action.field]: '' } };
    case 'SET_ERRORS': return { ...state, errors: action.errors };
    case 'SET_SUBMITTING': return { ...state, submitting: action.value };
    case 'SET_PAY_METHOD': return { ...state, payMethod: action.method };
    case 'SET_STEP': return { ...state, step: action.step };
    default: return state;
  }
}

function validate(address: DeliveryAddress): Partial<DeliveryAddress> {
  const errors: Partial<DeliveryAddress> = {};
  if (!address.name.trim()) errors.name = 'Full name is required';
  if (!/^\d{10}$/.test(address.phone.replace(/\s/g, ''))) errors.phone = 'Enter a valid 10-digit phone';
  if (!address.line1.trim()) errors.line1 = 'Address is required';
  if (!address.city.trim()) errors.city = 'City is required';
  if (!address.state.trim()) errors.state = 'State is required';
  if (!/^\d{6}$/.test(address.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';
  return errors;
}

export default function OrderConfirmation({
  isOpen, onClose, productTitle, productPrice, discountPercent = 0,
  sellerName, sellerContact, onConfirm,
}: OrderConfirmationProps) {
  const [state, dispatch] = useReducer(reducer, {
    step: 'address',
    submitting: false,
    address: emptyAddress,
    payMethod: 'cod',
    errors: {},
  });

  if (!isOpen) return null;

  const finalPrice = discountPercent > 0
    ? Math.round(productPrice * (1 - discountPercent / 100))
    : productPrice;

  const handleAddressSubmit = async () => {
    const errors = validate(state.address);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return;
    }
    dispatch({ type: 'SET_STEP', step: 'payment' });
  };

  const handleFinalConfirm = async () => {
    dispatch({ type: 'SET_SUBMITTING', value: true });
    await onConfirm(state.address, state.payMethod);
    dispatch({ type: 'SET_SUBMITTING', value: false });
    dispatch({ type: 'SET_STEP', step: 'success' });
  };

  const field = (key: keyof DeliveryAddress, label: string, placeholder: string, type = 'text') => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        value={state.address[key]}
        onChange={(e) => dispatch({ type: 'SET_FIELD', field: key, value: e.target.value })}
        className={state.errors[key] ? 'border-destructive' : ''}
      />
      {state.errors[key] && <p className="text-xs text-destructive mt-0.5">{state.errors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm border-none p-0 w-full h-full cursor-default" onClick={onClose} aria-label="Close" />

      <div className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 animate-slide-up overflow-hidden max-h-[92vh] flex flex-col" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">
              {state.step === 'address' ? 'Delivery Address' : state.step === 'payment' ? 'Payment Method' : 'Order Placed!'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {state.step === 'address' ? productTitle : state.step === 'payment' ? 'Choose how you want to pay' : 'Your order has been sent to the seller'}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Step 1 — Address */}
        {state.step === 'address' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {/* Order summary strip */}
              <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between text-sm border border-border/50">
                <span className="text-muted-foreground truncate mr-2">{productTitle}</span>
                <div className="shrink-0 text-right">
                  {discountPercent > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground line-through">₹{productPrice}</span>
                      <span className="font-bold text-primary">₹{finalPrice}</span>
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">{discountPercent}% off</span>
                    </div>
                  ) : (
                    <span className="font-bold text-primary">₹{productPrice}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <MapPin className="size-3.5 shrink-0 text-primary" />
                <span>Where should we deliver this?</span>
              </div>

              {field('name', 'Full Name', 'Enter your full name')}
              {field('phone', 'Phone Number', '10-digit mobile number', 'tel')}
              {field('line1', 'Address', 'House no., Street, Area, Landmark')}

              <div className="grid grid-cols-2 gap-3">
                {field('city', 'City', 'City')}
                {field('state', 'State', 'State')}
              </div>
              {field('pincode', 'Pincode', '6-digit pincode', 'tel')}
            </div>

            <div className="px-5 py-4 border-t border-border/50 shrink-0">
              <Button onClick={handleAddressSubmit} className="w-full bg-gradient-brand hover:opacity-90 transition-opacity h-11 font-bold text-base">
                Proceed to Payment
                <ChevronRight className="size-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* Step 2 — Payment */}
        {state.step === 'payment' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-6 space-y-6">
              <RadioGroup 
                value={state.payMethod} 
                onValueChange={(v) => dispatch({ type: 'SET_PAY_METHOD', method: v as 'cod' | 'online' })}
                className="grid grid-cols-1 gap-4"
              >
                <div className="relative">
                  <RadioGroupItem value="cod" id="pay-cod" className="peer sr-only" />
                  <Label
                    htmlFor="pay-cod"
                    className="flex items-center gap-4 rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all [&:has([data-state=checked])]:border-primary"
                  >
                    <div className="size-10 bg-muted rounded-full flex items-center justify-center shrink-0 peer-data-[state=checked]:bg-primary/10">
                      <Banknote className="size-5 text-muted-foreground peer-data-[state=checked]:text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                    </div>
                    <div className="size-5 rounded-full border-2 border-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary flex items-center justify-center">
                      <div className="size-2 rounded-full bg-white" />
                    </div>
                  </Label>
                </div>

                <div className="relative">
                  <RadioGroupItem value="online" id="pay-online" className="peer sr-only" />
                  <Label
                    htmlFor="pay-online"
                    className="flex items-center gap-4 rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all [&:has([data-state=checked])]:border-primary"
                  >
                    <div className="size-10 bg-muted rounded-full flex items-center justify-center shrink-0 peer-data-[state=checked]:bg-primary/10">
                      <CreditCard className="size-5 text-muted-foreground peer-data-[state=checked]:text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Online Payment</p>
                      <p className="text-xs text-muted-foreground">GPay, PhonePe, UPI or Cards</p>
                    </div>
                    <div className="size-5 rounded-full border-2 border-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary flex items-center justify-center">
                      <div className="size-2 rounded-full bg-white" />
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-700 dark:text-amber-400">
                {state.payMethod === 'cod' 
                  ? "Please keep cash ready for the exact amount. The delivery person will collect it upon arrival."
                  : "You will be redirected to a secure payment page. No card or bank details are required inside this app."}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/50 shrink-0 space-y-3">
              <Button onClick={handleFinalConfirm} disabled={state.submitting} className="w-full bg-gradient-brand hover:opacity-90 transition-opacity h-12 font-bold text-lg shadow-lg shadow-primary/20">
                {state.submitting
                  ? <Loader2 className="size-5 mr-2 animate-spin" />
                  : <CheckCircle2 className="size-5 mr-2" />}
                Confirm Order · ₹{finalPrice}
              </Button>
              <button onClick={() => dispatch({ type: 'SET_STEP', step: 'address' })} className="w-full text-xs text-muted-foreground hover:text-foreground font-medium py-1">
                Edit delivery address
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Success */}
        {state.step === 'success' && (
          <div className="px-5 py-8 text-center space-y-4">
            <div className="size-16 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Order Confirmed!</h3>
              <p className="text-sm text-muted-foreground mt-1">The seller will confirm your order shortly</p>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 text-left space-y-2 border border-border/50">
              <Row label="Product" value={productTitle} />
              <Row label="Amount" value={`₹${finalPrice}${discountPercent > 0 ? ` (${discountPercent}% off)` : ''}`} />
              {sellerName && <Row label="Seller" value={sellerName} />}
              <div className="border-t border-border/50 pt-2 mt-2">
                <p className="text-xs text-muted-foreground mb-1">Delivering to</p>
                <p className="text-sm font-medium text-foreground">{state.address.name}</p>
                <p className="text-xs text-muted-foreground">{state.address.line1}, {state.address.city}, {state.address.state} – {state.address.pincode}</p>
                <p className="text-xs text-muted-foreground">{state.address.phone}</p>
              </div>
            </div>

            {sellerContact && (
              <Button
                variant="outline"
                className="w-full bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-green-600 h-10"
                onClick={() => {
                  const clean = sellerContact.replace(/\D/g, '');
                  const msg = `Hi ${sellerName || 'Seller'}, I just placed an order for "${productTitle}" on ApnaBazar! Delivering to ${state.address.line1}, ${state.address.city} – ${state.address.pincode}`;
                  window.open(`https://wa.me/${clean}/?text=${encodeURIComponent(msg)}`, '_blank');
                }}
              >
                <MessageCircle className="size-4 mr-2" /> Chat on WhatsApp
              </Button>
            )}

            <Button onClick={onClose} className="w-full bg-gradient-brand hover:opacity-90 transition-opacity">
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
