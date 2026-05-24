import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Dashboard from './Dashboard';

const {
  authState,
  sellerState,
  toastMock,
  navigateMock,
  clipboardWriteTextMock,
} = vi.hoisted(() => ({
  authState: {
    user: { id: 'user-1' },
    signOut: vi.fn(),
  },
  sellerState: {
    seller: null as null | {
      id: string;
      store_name?: string;
      store_slug?: string;
    },
    products: [] as Array<{
      id: string;
      title: string;
      price: number;
      seller_id: string;
    }>,
    files: [] as Array<{ id: string; file_url: string; status: string }>,
    orders: [] as Array<{ id: string; status: string; quantity: number }>,
    loading: false,
    fetchSeller: vi.fn(),
    fetchProducts: vi.fn(),
    fetchFiles: vi.fn(),
    fetchOrders: vi.fn(),
    createSeller: vi.fn(),
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

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

vi.mock('@/components/UploadZone', () => ({
  default: ({ sellerId }: { sellerId: string }) => (
    <div>UploadZone {sellerId}</div>
  ),
}));

vi.mock('@/components/StoreSetup', () => ({
  default: ({
    onComplete,
  }: {
    onComplete: (data: { store_name: string }) => void;
  }) => (
    <button onClick={() => onComplete({ store_name: 'New Store' })}>
      Complete setup
    </button>
  ),
}));

vi.mock('@/components/StoreSettings', () => ({
  default: () => <div>StoreSettings</div>,
}));

vi.mock('@/components/ProductCard', () => ({
  default: ({ product }: { product: { title: string } }) => (
    <div>{product.title}</div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
    MemoryRouter: actual.MemoryRouter,
  };
});

describe('Dashboard page', () => {
  it('shows the store setup flow when no seller exists', async () => {
    sellerState.seller = null;
    sellerState.products = [];
    sellerState.createSeller.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete setup' }));

    await waitFor(() => {
      expect(sellerState.createSeller).toHaveBeenCalledWith({
        store_name: 'New Store',
      });
    });
  });

  it('copies the storefront link and opens the upload view', async () => {
    sellerState.seller = {
      id: 'seller-1',
      store_name: 'Ravi Boutique',
      store_slug: 'ravi-boutique',
      verification_status: 'approved',
    };
    sellerState.products = [
      { id: 'product-1', title: 'Kurta', price: 999, seller_id: 'seller-1' },
    ];

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /copy store link/i }));
    expect(clipboardWriteTextMock).toHaveBeenCalledWith(
      `${window.location.origin}/store/ravi-boutique`,
    );

    fireEvent.click(screen.getByRole('button', { name: /add products/i }));
    await waitFor(() => {
      expect(screen.getByText('UploadZone seller-1')).toBeInTheDocument();
    });
  });

  it('renders store settings when profile tab is active', () => {
    sellerState.seller = {
      id: 'seller-1',
      store_name: 'Ravi Boutique',
      store_slug: 'ravi-boutique',
      verification_status: 'approved',
    };
    sellerState.products = [
      { id: 'product-1', title: 'Kurta', price: 999, seller_id: 'seller-1' },
    ];

    render(
      <MemoryRouter initialEntries={['/dashboard?tab=profile&sub=settings']}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText('StoreSettings')).toBeInTheDocument();
  });
});
