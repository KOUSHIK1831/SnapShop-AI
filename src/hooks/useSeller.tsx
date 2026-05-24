import { useState, useEffect, useCallback, useReducer } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PostgrestError } from '@supabase/supabase-js';

interface Seller {
  id: string;
  user_id: string;
  full_name: string | null;
  store_name: string | null;
  store_slug: string | null;
  store_description: string | null;
  location: string | null;
  phone: string | null;
  contact_number: string | null;
  store_number: string | null;
  maps_url: string | null;
  banner_url: string | null;
  theme_color: string | null;
  status: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verification_documents: string[] | null;
  admin_feedback: string | null;
  last_submitted_at: string | null;
  gstin: string | null;
  registered_business_name: string | null;
  ai_daily_limit: number;
  created_at: string;
}

export interface SizeVariant {
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  tags: string[] | null;
  image_url: string | null;
  stock?: number;
  low_stock_threshold?: number;
  size?: string | null;
  size_variants?: SizeVariant[] | null;
  discount_percent?: number | null;
  created_at: string;
}

interface FileRecord {
  id: string;
  seller_id: string;
  file_url: string;
  file_type: string | null;
  status: string;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'accepted' | 'confirmed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
  pay_method: 'cod' | 'online';
  pay_status: 'pending' | 'paid' | 'failed' | 'refunded';
  gateway_payment_id?: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  unit_price: number;
  selected_size?: string | null;
  created_at: string;
  confirmed_at?: string;
  completed_at?: string;
  del_type?: 'courier' | 'self_delivery';
  tracking_provider?: string;
  tracking_number?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
  delivery_address?: { name: string; phone: string; line1: string; city: string; state: string; pincode: string } | null;
  product?: Product;
}

type SellerState = {
  seller: Seller | null;
  products: Product[];
  files: FileRecord[];
  orders: Order[];
  ai_usage_today: number;
  loading: boolean;
};

type SellerAction = 
  | { type: 'SET_DATA', payload: Partial<SellerState> }
  | { type: 'SET_LOADING', payload: boolean };

function sellerReducer(state: SellerState, action: SellerAction): SellerState {
  switch (action.type) {
    case 'SET_DATA': return { ...state, ...action.payload };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    default: return state;
  }
}

export function useSeller() {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(sellerReducer, {
    seller: null,
    products: [],
    files: [],
    orders: [],
    ai_usage_today: 0,
    loading: true,
  });

  const fetchSeller = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) dispatch({ type: 'SET_DATA', payload: { seller: data } });
    return data;
  }, [user]);

  const fetchProducts = useCallback(async (currentSeller?: Seller) => {
    const s = currentSeller || state.seller;
    if (!s) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', s.id)
      .order('created_at', { ascending: false });
    dispatch({ type: 'SET_DATA', payload: { products: data || [] } });
  }, [state.seller]);

  const fetchFiles = useCallback(async (currentSeller?: Seller) => {
    const s = currentSeller || state.seller;
    if (!s) return;
    const { data } = await supabase
      .from('files')
      .select('*')
      .eq('seller_id', s.id)
      .order('created_at', { ascending: false });
    
    // Calculate usage today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const usageToday = (data || []).filter(f => new Date(f.created_at) >= startOfDay).length;

    dispatch({ type: 'SET_DATA', payload: { files: data || [], ai_usage_today: usageToday } });
  }, [state.seller]);

  const fetchOrders = useCallback(async (currentSeller?: Seller) => {
    const s = currentSeller || state.seller;
    if (!s) return;
    const { data } = await supabase
      .from('orders')
      .select('*, product:products(*)')
      .eq('seller_id', s.id)
      .order('created_at', { ascending: false });
    dispatch({ type: 'SET_DATA', payload: { orders: data || [] } });
  }, [state.seller]);

  const updateOrderStatus = async (
    orderId: string, 
    status: Order['status'], 
    trackingInfo?: Partial<Pick<Order, 'del_type' | 'tracking_provider' | 'tracking_number' | 'delivery_person_name' | 'delivery_person_phone'>>,
    paymentInfo?: Partial<Pick<Order, 'pay_status' | 'gateway_payment_id'>>
  ): Promise<{ error: PostgrestError | Error | null }> => {
    const updates: Partial<Order> = { status };
    if (status === 'confirmed' || status === 'accepted') updates.confirmed_at = new Date().toISOString();
    if (status === 'completed' || status === 'delivered') updates.completed_at = new Date().toISOString();

    if (trackingInfo) {
      Object.assign(updates, trackingInfo);
    }

    if (paymentInfo) {
      Object.assign(updates, paymentInfo);
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);
    if (error) {
      console.error('updateOrderStatus error:', error);
    } else {
      await fetchOrders();
    }
    return { error };
  };

  const createSeller = async (data: Partial<Seller>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const payload = {
      user_id: user.id,
      full_name: data.full_name,
      store_name: data.store_name,
      store_slug: data.store_slug,
      store_description: data.store_description,
      location: data.location,
      phone: data.phone || data.contact_number,
      contact_number: data.contact_number || data.phone,
      store_number: data.store_number,
      maps_url: data.maps_url,
      banner_url: data.banner_url,
      theme_color: data.theme_color,
      gstin: data.gstin,
      registered_business_name: data.registered_business_name,
      verification_documents: data.verification_documents,
      last_submitted_at: data.last_submitted_at,
      verification_status: data.verification_status || 'pending',
    };

    try {
      const { data: updated, error: updateError } = await supabase
        .from('sellers')
        .update(payload)
        .eq('user_id', user.id)
        .select();

      if (updateError) return { error: updateError };

      if (updated && updated.length > 0) {
        const s = await fetchSeller();
        if (s) {
          await Promise.all([fetchProducts(s), fetchFiles(s), fetchOrders(s)]);
        }
        return { error: null };
      }

      const { error: insertError } = await supabase
        .from('sellers')
        .insert(payload);

      if (insertError) return { error: insertError };

      const s = await fetchSeller();
      if (s) {
        await Promise.all([fetchProducts(s), fetchFiles(s), fetchOrders(s)]);
      }
      return { error: null };
    } catch (err) {
      console.error('createSeller unexpected error', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const submitForVerification = async (data: {
    gstin: string;
    registered_business_name: string;
    documents: string[];
  }) => {
    if (!state.seller) return { error: new Error('No seller profile found') };

    // Check rate limit (24 hours)
    if (state.seller.last_submitted_at) {
      const lastSubmitted = new Date(state.seller.last_submitted_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastSubmitted.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        const timeLeft = Math.ceil(24 - hoursDiff);
        return { error: new Error(`Rate limit: Please wait ${timeLeft} hours before resubmitting.`) };
      }
    }

    const { error } = await supabase
      .from('sellers')
      .update({
        gstin: data.gstin,
        registered_business_name: data.registered_business_name,
        verification_documents: data.documents,
        verification_status: 'pending',
        last_submitted_at: new Date().toISOString(),
      })
      .eq('id', state.seller.id);

    if (!error) await fetchSeller();
    return { error };
  };

  const updateSellerProfile = async (updates: Partial<Seller>) => {
    if (!state.seller) return { error: new Error('No seller profile found') };

    const { error } = await supabase
      .from('sellers')
      .update(updates)
      .eq('id', state.seller.id);

    if (!error) await fetchSeller();
    return { error };
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);
    if (!error) await fetchProducts();
    return { error };
  };

  const deleteProduct = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    if (!error) await fetchProducts();
    return { error };
  };

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_LOADING', payload: true });
      fetchSeller().then(async (s) => {
        if (s) {
          // Fetch everything else concurrently
          const [productsData, filesData, ordersData] = await Promise.all([
            supabase.from('products').select('*').eq('seller_id', s.id).order('created_at', { ascending: false }),
            supabase.from('files').select('*').eq('seller_id', s.id).order('created_at', { ascending: false }),
            supabase.from('orders').select('*, product:products(*)').eq('seller_id', s.id).order('created_at', { ascending: false })
          ]);
          // Calculate usage today
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const usageToday = (filesData.data || []).filter(f => new Date(f.created_at) >= startOfDay).length;

          dispatch({ 
            type: 'SET_DATA', 
            payload: { 
              products: productsData.data || [], 
              files: filesData.data || [], 
              orders: ordersData.data || [],
              ai_usage_today: usageToday
            } 
          });
        }
      }).finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, fetchSeller]);

  return {
    ...state,
    fetchSeller,
    fetchProducts,
    fetchFiles,
    fetchOrders,
    createSeller,
    submitForVerification,
    updateSellerProfile,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
  };
}
