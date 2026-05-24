import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSeller } from './useSeller';

const { authState, fromMock } = vi.hoisted(() => ({
  authState: { user: { id: 'user-1' } as null | { id: string } },
  fromMock: vi.fn(),
}));

vi.mock('./useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

function createQuery(result: unknown) {
  return {
    select: vi.fn(() => createQuery(result)),
    eq: vi.fn(() => createQuery(result)),
    neq: vi.fn(() => createQuery(result)),
    order: vi.fn(async () => result),
    single: vi.fn(async () => result),
    upsert: vi.fn(async () => result),
    update: vi.fn(() => createQuery(result)),
    delete: vi.fn(() => createQuery(result)),
  };
}

describe('useSeller', () => {
  it('loads seller, products, and files', async () => {
    authState.user = { id: 'user-1' };
    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return createQuery({
          data: {
            id: 'seller-1',
            user_id: 'user-1',
            store_name: 'Ravi Boutique',
            store_slug: 'ravi-boutique',
          },
        });
      }

      if (table === 'products') {
        return createQuery({
          data: [
            {
              id: 'product-1',
              seller_id: 'seller-1',
              title: 'Kurta',
              price: 999,
            },
          ],
        });
      }

      return createQuery({
        data: [{ id: 'file-1', seller_id: 'seller-1', status: 'completed' }],
      });
    });

    const { result } = renderHook(() => useSeller());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.seller?.store_name).toBe('Ravi Boutique');
      expect(result.current.products).toHaveLength(1);
      expect(result.current.files).toHaveLength(1);
    });
  });

  it('updates order status with timestamps', async () => {
    authState.user = { id: 'user-1' };
    const updateMock = vi.fn().mockReturnValue(createQuery({ error: null }));
    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return createQuery({
          data: { id: 'seller-1', user_id: 'user-1' },
        });
      }
      if (table === 'orders') {
        return {
          select: vi.fn(() => createQuery({ data: [] })),
          update: updateMock,
          eq: vi.fn(() => createQuery({ error: null })),
        };
      }
      return createQuery({ data: [] });
    });

    const { result } = renderHook(() => useSeller());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.updateOrderStatus('order-1', 'confirmed');

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'confirmed',
        confirmed_at: expect.any(String),
      }),
    );

    await result.current.updateOrderStatus('order-1', 'completed');

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        completed_at: expect.any(String),
      }),
    );
  });

  it('blocks seller creation without an authenticated user', async () => {
    authState.user = null;
    fromMock.mockReset();

    const { result } = renderHook(() => useSeller());
    const response = await result.current.createSeller({
      store_name: 'Test Store',
    });

    expect(response?.error).toEqual(new Error('Not authenticated'));
    expect(fromMock).not.toHaveBeenCalled();
  });
});
