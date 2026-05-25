import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import en from '../locales/en/translation.json';
import { supabase } from '@/integrations/supabase/client';

const {
  authState,
  sellerState,
  toastMock,
  navigateMock,
  clipboardWriteTextMock,
} = vi.hoisted(() => ({
  authState: {
    user: { id: 'user-1', role: 'seller' },
    signOut: vi.fn(),
  },
  sellerState: {
    seller: {
      id: 'seller-1',
      store_name: 'Test Store',
      store_slug: 'test-store',
      verification_status: 'approved',
      ai_daily_limit: 10,
    } as any,
    products: [] as any[],
    orders: [] as any[],
    ai_usage_today: 0,
    loading: false,
    createSeller: vi.fn(),
    submitForVerification: vi.fn().mockResolvedValue({ error: null }),
    fetchProducts: vi.fn(),
    fetchOrders: vi.fn(),
    updateSellerProfile: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  clipboardWriteTextMock: vi.fn(),
}));

Object.assign(navigator, {
  clipboard: {
    writeText: clipboardWriteTextMock,
  },
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/hooks/useSeller', () => ({
  useSeller: () => sellerState,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/useWelcomeTour', () => ({
  useWelcomeTour: (setActiveTab: any) => ({ 
    startTour: () => setActiveTab('tools') 
  }),
}));

let realtimeCallback: any;
let mockChannel: any;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => {
      mockChannel = {
        on: vi.fn((event, filter, cb) => {
          realtimeCallback = cb;
          return mockChannel;
        }),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      };
      return mockChannel;
    }),
  },
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

vi.mock('@/components/UploadZone', () => ({
  default: () => <div>UploadZone</div>,
}));

vi.mock('@/components/StoreSetup', () => ({
  default: ({ onComplete }: any) => (
    <button onClick={() => onComplete({ 
      store_name: 'New', 
      gstin: '123', 
      registered_business_name: 'Biz',
      verification_documents: []
    })}>Complete Setup</button>
  ),
}));

vi.mock('@/components/StoreSettings', () => ({
  default: () => <div>StoreSettings</div>,
}));

vi.mock('@/components/Orders', () => ({
  default: () => <div>OrdersComponent</div>,
}));

vi.mock('@/components/InventoryEditor', () => ({
  default: () => <div>InventoryEditorComponent</div>,
}));

vi.mock('@/components/Analytics', () => ({
  default: () => <div>AnalyticsComponent</div>,
}));

vi.mock('@/components/FeedbackModal', () => ({
  default: () => <div>FeedbackModal</div>,
}));

vi.mock('@/components/AppTour', () => ({
  default: () => <div>AppTour</div>,
}));

vi.mock('@/components/NetworkStrengthIndicator', () => ({
  NetworkStrengthIndicator: () => <div>NetworkStrength</div>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerState.loading = false;
    sellerState.seller = {
      id: 'seller-1',
      store_name: 'Test Store',
      store_slug: 'test-store',
      verification_status: 'approved',
      ai_daily_limit: 10,
    };
    sellerState.products = [];
    authState.user = { id: 'user-1', role: 'seller' };
    sellerState.submitForVerification.mockResolvedValue({ error: null });
    realtimeCallback = null;
    mockChannel = null;
  });

  const renderDashboard = (path = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading skeleton when loading', () => {
    sellerState.loading = true;
    renderDashboard();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders StoreSetup if seller has no store_name', () => {
    sellerState.seller = { id: 's1', verification_status: 'approved' } as any;
    renderDashboard();
    expect(screen.getByText('Complete Setup')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Complete Setup'));
    expect(sellerState.createSeller).toHaveBeenCalled();
  });

  it('redirects admin to /admin', () => {
    authState.user = { id: 'admin', role: 'admin' };
    renderDashboard();
    expect(navigateMock).toHaveBeenCalledWith('/admin');
  });

  it('restricts access if not approved', () => {
    sellerState.seller.verification_status = 'pending';
    renderDashboard();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Access Restricted' }));
  });

  it('copies store link to clipboard', () => {
    renderDashboard();
    fireEvent.click(screen.getByText(en['dashboard.copyLink']));
    expect(clipboardWriteTextMock).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: en['dashboard.copied'] }));
  });

  it('navigates to store view', () => {
    renderDashboard();
    fireEvent.click(screen.getByText(en['dashboard.viewStore']));
    expect(navigateMock).toHaveBeenCalledWith('/store/test-store');
  });

  it('renders stats and empty product list', () => {
    renderDashboard();
    expect(screen.getByText(en['dashboard.noProducts'])).toBeInTheDocument();
    fireEvent.click(screen.getByText(en['dashboard.uploadProducts']));
  });

  it('renders products list when available', () => {
    sellerState.products = [{ id: 'p1', title: 'Product 1', price: 10 }];
    renderDashboard();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
  });

  it('shows low stock alert', async () => {
    sellerState.products = [{ id: 'p1', title: 'Low', price: 10, stock: 2, low_stock_threshold: 5 }];
    renderDashboard();
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Low Stock Alert' }));
    });
  });

  it('switches to tools tab and shows cards', () => {
    renderDashboard('/dashboard?tab=tools');
    expect(screen.getByText('Store Management')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText(en['dashboard.tabs.orders']));
  });

  it('renders orders subtab', () => {
    renderDashboard('/dashboard?tab=tools&sub=orders');
    expect(screen.getByText('OrdersComponent')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Back to Manage/i));
  });

  it('renders upload subtab', () => {
    renderDashboard('/dashboard?tab=tools&sub=upload');
    expect(screen.getByText('UploadZone')).toBeInTheDocument();
  });

  it('renders inventory subtab', () => {
    renderDashboard('/dashboard?tab=tools&sub=inventory');
    expect(screen.getByText('InventoryEditorComponent')).toBeInTheDocument();
  });

  it('renders profile tab with analytics by default', () => {
    renderDashboard('/dashboard?tab=profile');
    expect(screen.getByText('AnalyticsComponent')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Settings'));
  });

  it('renders profile tab with settings subtab', () => {
    renderDashboard('/dashboard?tab=profile&sub=settings');
    expect(screen.getByText('StoreSettings')).toBeInTheDocument();
  });

  it('handles verification banner interaction (rejected)', async () => {
    sellerState.seller.verification_status = 'rejected';
    sellerState.seller.last_submitted_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    renderDashboard();
    
    expect(screen.getByText(en['auto.verification_rejected'])).toBeInTheDocument();
    fireEvent.click(screen.getByText(en['auto.update_resubmit']));
    
    fireEvent.click(screen.getByText('Complete Setup'));
    await waitFor(() => expect(sellerState.submitForVerification).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Resubmitted!' }));
  });

  it('handles verification banner error', async () => {
    sellerState.seller.verification_status = 'rejected';
    sellerState.seller.last_submitted_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    sellerState.submitForVerification.mockResolvedValue({ error: { message: 'Verify error' } });
    renderDashboard();
    
    fireEvent.click(screen.getByText(en['auto.update_resubmit']));
    fireEvent.click(screen.getByText('Complete Setup'));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error', description: 'Verify error' })));
  });

  it('handles verification banner cancellation', () => {
    sellerState.seller.verification_status = 'rejected';
    sellerState.seller.last_submitted_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    renderDashboard();
    
    fireEvent.click(screen.getByText(en['auto.update_resubmit']));
    fireEvent.click(screen.getByText(en['auto.cancel']));
    expect(screen.queryByText('Complete Setup')).not.toBeInTheDocument();
  });

  it('shows hours left in banner if less than 24h since rejection', () => {
    sellerState.seller.verification_status = 'rejected';
    sellerState.seller.last_submitted_at = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(); // 10h ago
    renderDashboard();
    expect(screen.getByText((content) => content.includes('14'))).toBeInTheDocument();
  });

  it('returns null for unknown verification status', () => {
    sellerState.seller.verification_status = 'unknown';
    const { container } = renderDashboard();
    expect(container.querySelector('.bg-red-50')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-amber-50')).not.toBeInTheDocument();
  });

  it('subscribes to realtime orders and handles new order', () => {
    renderDashboard();
    expect(supabase.channel).toHaveBeenCalledWith('orders-realtime');
    
    if (realtimeCallback) {
      act(() => {
        realtimeCallback();
      });
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: en['orders.newOrder'] }));
      expect(sellerState.fetchOrders).toHaveBeenCalled();
    }
  });

  it('starts tour', () => {
    renderDashboard();
    const tourBtn = screen.getAllByRole('button').find(b => b.querySelector('.lucide-circle-help'));
    fireEvent.click(tourBtn!);
  });

  it('signs out', () => {
    renderDashboard();
    const signOutBtns = screen.getAllByRole('button', { name: en['common.signOut'] });
    fireEvent.click(signOutBtns[0]);
    expect(authState.signOut).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderDashboard();
    expect(mockChannel).toBeDefined();
    unmount();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('renders ready state when approved but no products', () => {
    sellerState.products = [];
    renderDashboard();
    expect(screen.getByText(en['dashboard.ready'])).toBeInTheDocument();
  });

  it('renders active state when approved and has products', () => {
    sellerState.products = [{ id: 'p1', title: 'P1' }];
    renderDashboard();
    expect(screen.getByText(en['dashboard.active'])).toBeInTheDocument();
  });
});
