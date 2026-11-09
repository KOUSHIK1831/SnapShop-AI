import { useEffect, useCallback, useReducer } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from './useAuth';

export interface Seller {
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
  price_override?: number | null;
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

export interface FileRecord {
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
  product_id?: string;
  quantity?: number;
  status:
    | 'pending'
    | 'accepted'
    | 'confirmed'
    | 'preparing'
    | 'ready_for_dispatch'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  pay_method: 'cod' | 'online' | 'upi';
  pay_status:
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded'
    | 'awaiting_verification'
    | 'proof_submitted'
    | 'verified'
    | 'rejected';
  gateway_payment_id?: string | null;
  payment_proof_url?: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  unit_price?: number;
  selected_size?: string | null;
  created_at: string;
  confirmed_at?: string;
  completed_at?: string;
  del_type?: 'courier' | 'self_delivery' | 'self_pickup';
  tracking_provider?: string;
  tracking_number?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
  delivery_address?: {
    name: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  product?: Product;
  items?: Array<{
    id: string;
    product_id: string;
    variant_id?: string | null;
    title: string;
    price: number;
    size?: string | null;
    quantity: number;
    line_total: number;
    image_url?: string | null;
    product?: {
      id: string;
      title: string;
      image_url?: string | null;
    };
  }>;
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
  | { type: 'SET_DATA'; payload: Partial<SellerState> }
  | { type: 'SET_LOADING'; payload: boolean };

function sellerReducer(state: SellerState, action: SellerAction): SellerState {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, ...action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
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
    try {
      const res = await apiClient.get<{ seller: Seller | null }>('/sellers/me');
      const seller = res?.seller ?? null;
      if (seller) {
        dispatch({ type: 'SET_DATA', payload: { seller } });
      }
      return seller;
    } catch {
      return null;
    }
  }, [user]);

  const fetchProducts = useCallback(
    async (currentSeller?: Seller) => {
      const s = currentSeller || state.seller;
      if (!s) return;
      try {
        const res = await apiClient.get<{
          items?: Product[];
          products?: Product[];
        }>('/products?pageSize=100');
        const productsList = res?.items || res?.products || [];
        dispatch({ type: 'SET_DATA', payload: { products: productsList } });
      } catch (err) {
        console.error('fetchProducts error:', err);
      }
    },
    [state.seller],
  );

  const fetchFiles = useCallback(
    async (currentSeller?: Seller) => {
      const s = currentSeller || state.seller;
      if (!s) return;
      try {
        const res = await apiClient.get<{
          files?: FileRecord[];
          items?: FileRecord[];
        }>('/files');
        const filesList = res?.files || res?.items || [];
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const usageToday = filesList.filter(
          f => new Date(f.created_at) >= startOfDay,
        ).length;

        dispatch({
          type: 'SET_DATA',
          payload: { files: filesList, ai_usage_today: usageToday },
        });
      } catch (err) {
        console.error('fetchFiles error:', err);
      }
    },
    [state.seller],
  );

  const fetchOrders = useCallback(
    async (currentSeller?: Seller) => {
      const s = currentSeller || state.seller;
      if (!s) return;
      try {
        const res = await apiClient.get<{ items?: Order[]; orders?: Order[] }>(
          '/orders?pageSize=100',
        );
        const ordersList = res?.items || res?.orders || [];
        dispatch({ type: 'SET_DATA', payload: { orders: ordersList } });
      } catch (err) {
        console.error('fetchOrders error:', err);
      }
    },
    [state.seller],
  );

  const updateOrderStatus = async (
    orderId: string,
    status: Order['status'],
    trackingInfo?: Partial<
      Pick<
        Order,
        | 'del_type'
        | 'tracking_provider'
        | 'tracking_number'
        | 'delivery_person_name'
        | 'delivery_person_phone'
      >
    >,
    paymentInfo?: Partial<Pick<Order, 'pay_status' | 'gateway_payment_id'>>,
  ): Promise<{ error: Error | null }> => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, {
        status,
        trackingInfo,
        paymentInfo,
      });
      await fetchOrders();
      return { error: null };
    } catch (err: any) {
      console.error('updateOrderStatus error:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const createSeller = async (data: Partial<Seller>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const payload = {
      fullName: data.full_name,
      storeName: data.store_name,
      storeSlug: data.store_slug,
      storeDescription: data.store_description,
      location: data.location,
      phone: data.phone || data.contact_number,
      contactNumber: data.contact_number || data.phone,
      storeNumber: data.store_number,
      mapsUrl: data.maps_url,
      bannerUrl: data.banner_url,
      themeColor: data.theme_color,
      gstin: data.gstin,
      registeredBusinessName: data.registered_business_name,
      sellerUpiId: (data as any).seller_upi_id,
      verificationDocuments: data.verification_documents || undefined,
    };

    try {
      let res: { seller?: Seller };
      try {
        res = await apiClient.patch<{ seller: Seller }>('/sellers/me', payload);
      } catch {
        res = await apiClient.post<{ seller: Seller }>('/sellers/me', payload);
      }

      const s = res?.seller || (await fetchSeller());
      if (s) {
        await Promise.all([fetchProducts(s), fetchFiles(s), fetchOrders(s)]);
      }
      return { error: null };
    } catch (err) {
      console.error('createSeller error:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const submitForVerification = async (data: {
    gstin: string;
    registered_business_name: string;
    documents: string[];
  }) => {
    if (!state.seller) return { error: new Error('No seller profile found') };

    try {
      await apiClient.patch('/sellers/me', {
        gstin: data.gstin,
        registeredBusinessName: data.registered_business_name,
        verificationDocuments: data.documents,
      });
      await apiClient.post('/sellers/me/submit', {});
      await fetchSeller();
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updateSellerProfile = async (updates: Partial<Seller>) => {
    if (!state.seller) return { error: new Error('No seller profile found') };

    try {
      await apiClient.patch('/sellers/me', {
        fullName: updates.full_name,
        storeName: updates.store_name,
        storeSlug: updates.store_slug,
        storeDescription: updates.store_description,
        location: updates.location,
        phone: updates.phone,
        contactNumber: updates.contact_number,
        storeNumber: updates.store_number,
        mapsUrl: updates.maps_url,
        bannerUrl: updates.banner_url,
        themeColor: updates.theme_color,
        sellerUpiId: (updates as any).seller_upi_id,
        gstin: updates.gstin,
        registeredBusinessName: updates.registered_business_name,
      });
      await fetchSeller();
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updateProduct = async (
    productId: string,
    updates: Partial<Product>,
  ) => {
    try {
      await apiClient.patch(`/products/${productId}`, {
        title: updates.title,
        description: updates.description,
        price: updates.price,
        category: updates.category,
        tags: updates.tags,
        imageUrl: updates.image_url,
        stock: updates.stock,
        lowStockThreshold: updates.low_stock_threshold,
      });
      await fetchProducts();
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await apiClient.delete(`/products/${productId}`);
      await fetchProducts();
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_LOADING', payload: true });
      fetchSeller()
        .then(async s => {
          if (s) {
            await Promise.all([
              fetchProducts(s),
              fetchFiles(s),
              fetchOrders(s),
            ]);
          }
        })
        .finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
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
