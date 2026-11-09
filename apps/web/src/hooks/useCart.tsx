import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  product?: {
    id: string;
    title: string;
    price: number;
    imageUrl?: string | null;
    sellerId: string;
  };
  variant?: {
    id: string;
    size: string;
    stock: number;
    priceOverride?: number | null;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
  count: number;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (
    productId: string,
    variantId?: string | null,
    quantity?: number,
  ) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user || user.role !== 'buyer') {
      setCart(null);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.get<{ cart: Cart }>('/cart');
      setCart(res?.cart || null);
    } catch {
      // Ignored if not authorized or empty
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const addItem = async (
    productId: string,
    variantId?: string | null,
    quantity = 1,
  ) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in as a buyer to add items to your cart.',
      });
      return;
    }
    try {
      const res = await apiClient.post<{ cart: Cart }>('/cart/items', {
        productId,
        variantId: variantId || undefined,
        quantity,
      });
      if (res?.cart) {
        setCart(res.cart);
        toast({ title: 'Item added to cart!' });
        setIsOpen(true);
      }
    } catch (err: any) {
      toast({
        title: 'Could not add item',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await apiClient.patch<{ cart: Cart }>(
        `/cart/items/${itemId}`,
        {
          quantity,
        },
      );
      if (res?.cart) setCart(res.cart);
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await apiClient.delete<{ cart: Cart }>(
        `/cart/items/${itemId}`,
      );
      if (res?.cart) setCart(res.cart);
    } catch (err: any) {
      toast({
        title: 'Remove failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  const clearCart = async () => {
    try {
      const res = await apiClient.delete<{ cart: Cart }>('/cart');
      if (res?.cart) setCart(res.cart);
    } catch (err: any) {
      toast({
        title: 'Clear cart failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        isOpen,
        openCart,
        closeCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
