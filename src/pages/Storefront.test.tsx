import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Storefront from './Storefront';

const {
  authState,
  toastMock,
  fromMock,
  useParamsMock,
  navigateMock,
  windowOpenMock,
} = vi.hoisted(() => ({
  authState: { user: null as null | { id: string; email: string } },
  toastMock: vi.fn(),
  fromMock: vi.fn(),
  useParamsMock: vi.fn(() => ({ slug: 'ravi-boutique' })),
  navigateMock: vi.fn(),
  windowOpenMock: vi.fn(),
}));

vi.stubGlobal('open', windowOpenMock);

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

vi.mock('@/components/BuyerAuthModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>BuyerAuthModal</div> : null,
}));

vi.mock('@/components/OrderConfirmation', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>OrderConfirmation</div> : null,
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useParams: () => useParamsMock(),
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('Storefront page', () => {
  it('shows a not-found state when the seller slug does not exist', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null }),
        }),
      }),
    }));

    render(<Storefront />);

    expect(await screen.findByText(/store not found/i)).toBeInTheDocument();
  });

  it('opens buyer auth when an unauthenticated user tries to order', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'seller-1',
                  store_name: 'Ravi Boutique',
                  store_slug: 'ravi-boutique',
                },
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                {
                  id: 'product-1',
                  seller_id: 'seller-1',
                  title: 'Kurta',
                  price: 999,
                  category: 'Kurtas',
                },
              ],
            }),
          }),
        }),
      };
    });

    render(<Storefront />);

    fireEvent.click(await screen.findByRole('button', { name: /order now/i }));

    expect(await screen.findByText('BuyerAuthModal')).toBeInTheDocument();
  });

  it('places an order for authenticated users', async () => {
    authState.user = { id: 'buyer-1', email: 'buyer@example.com' };

    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'seller-1',
                  store_name: 'Ravi Boutique',
                  store_slug: 'ravi-boutique',
                  contact_number: '+91 9999999999',
                },
              }),
            }),
          }),
        };
      }

      if (table === 'products') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  {
                    id: 'product-1',
                    seller_id: 'seller-1',
                    title: 'Kurta',
                    price: 999,
                    category: 'Kurtas',
                  },
                ],
              }),
            }),
          }),
        };
      }

      return {
        insert: async () => ({ error: null }),
      };
    });

    render(<Storefront />);

    fireEvent.click(await screen.findByRole('button', { name: /order now/i }));

    await waitFor(() => {
      expect(screen.getByText('OrderConfirmation')).toBeInTheDocument();
    });
  });
});
