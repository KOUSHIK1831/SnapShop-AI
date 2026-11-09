import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useSeller } from '@/hooks/useSeller';

const { authState, fromMock } = vi.hoisted(() => ({
  authState: { user: null as any },
  fromMock: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

function createQuery(result: any) {
  const obj = {
    select: vi.fn(() => obj),
    eq: vi.fn(() => obj),
    neq: vi.fn(() => obj),
    order: vi.fn(() => obj),
    single: vi.fn(() => obj),
    upsert: vi.fn(() => obj),
    update: vi.fn(() => obj),
    delete: vi.fn(() => obj),
    insert: vi.fn(() => obj),
    maybeSingle: vi.fn(() => obj),
    then: (onFullfilled: any) => Promise.resolve(result).then(onFullfilled),
    catch: (onRejected: any) => Promise.resolve(result).catch(onRejected),
  };
  return obj;
}

describe('useSeller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
  });

  it('loads seller, products, and files', async () => {
    authState.user = { id: 'user-1' };
    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return createQuery({ data: { id: 's1' }, error: null });
      }
      return createQuery({ data: [], error: null });
    });

    const { result } = renderHook(() => useSeller());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fromMock).toHaveBeenCalledWith('sellers');
  });

  it('updates order status with timestamps', async () => {
    authState.user = { id: 'user-1' };
    const updateMock = vi.fn().mockReturnValue(createQuery({ error: null }));
    fromMock.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          ...createQuery({ data: [], error: null }),
          update: updateMock,
        };
      }
      if (table === 'sellers') {
        return createQuery({ data: { id: 's1' }, error: null });
      }
      return createQuery({ data: [], error: null });
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
  });

  it('blocks seller creation without an authenticated user', async () => {
    const { result } = renderHook(() => useSeller());
    const response = await result.current.createSeller({
      store_name: 'Test Store',
    });

    expect(response?.error).toEqual(new Error('Not authenticated'));
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('handles createSeller update and insert paths', async () => {
    authState.user = { id: 'user-1' };
    const updateMock = vi
      .fn()
      .mockReturnValue(createQuery({ data: [{ id: 's1' }], error: null }));
    const insertMock = vi.fn().mockReturnValue(createQuery({ error: null }));

    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return {
          ...createQuery({ data: { id: 's1' } }),
          update: updateMock,
          insert: insertMock,
          select: vi.fn().mockReturnThis(),
        };
      }
      return createQuery({ data: [] });
    });

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Test update path
    await result.current.createSeller({ store_name: 'New Name' });
    expect(updateMock).toHaveBeenCalled();

    // Test insert path (update returns empty)
    updateMock.mockReturnValueOnce(createQuery({ data: [], error: null }));
    await result.current.createSeller({ store_name: 'Brand New' });
    expect(insertMock).toHaveBeenCalled();
  });

  it('handles verification rate limit', async () => {
    authState.user = { id: 'user-1' };
    const recentDate = new Date();
    recentDate.setHours(recentDate.getHours() - 2);

    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return createQuery({
          data: { id: 's1', last_submitted_at: recentDate.toISOString() },
        });
      }
      return createQuery({ data: [] });
    });

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const response = await result.current.submitForVerification({
      gstin: 'GST123',
      registered_business_name: 'Test Business',
      documents: [],
    });

    expect(response.error?.message).toContain('Rate limit');
  });

  it('updates seller profile, products and deletes products', async () => {
    authState.user = { id: 'user-1' };
    const updateMock = vi.fn().mockReturnValue(createQuery({ error: null }));
    const deleteMock = vi.fn().mockReturnValue(createQuery({ error: null }));

    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return {
          ...createQuery({ data: { id: 's1' } }),
          update: updateMock,
        };
      }
      return {
        ...createQuery({ data: [] }),
        update: updateMock,
        delete: deleteMock,
      };
    });

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.updateSellerProfile({ theme_color: '#000' });
    expect(updateMock).toHaveBeenCalled();

    await result.current.updateProduct('p1', { title: 'New Title' });
    expect(updateMock).toHaveBeenCalledTimes(2);

    await result.current.deleteProduct('p1');
    expect(deleteMock).toHaveBeenCalled();
  });

  it('successfully fetches seller and updates profile', async () => {
    authState.user = { id: 'user-1' };
    const updateMock = vi.fn().mockReturnValue(createQuery({ error: null }));

    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return {
          ...createQuery({ data: { id: 's1' } }),
          update: updateMock,
        };
      }
      return createQuery({ data: [] });
    });

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const seller = await result.current.fetchSeller();
    expect(seller?.id).toBe('s1');

    await result.current.updateSellerProfile({ store_name: 'Updated' });
    expect(updateMock).toHaveBeenCalled();
  });

  it('handles createSeller update error', async () => {
    authState.user = { id: 'user-1' };
    const updateError = new Error('Update failed');
    fromMock.mockImplementation((table: string) => {
      if (table === 'sellers') {
        return {
          ...createQuery({ error: updateError }),
          update: vi.fn().mockReturnValue(createQuery({ error: updateError })),
        };
      }
      return createQuery({ data: [] });
    });

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const response = await result.current.createSeller({ store_name: 'Fail' });
    expect(response.error).toEqual(updateError);
  });

  it('handles errors in updateOrderStatus and createSeller', async () => {
    authState.user = { id: 'user-1' };
    const error = { message: 'DB Error' };
    fromMock.mockImplementation((table: string) => {
      return createQuery({ error });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.updateOrderStatus('o1', 'confirmed');
    expect(consoleSpy).toHaveBeenCalled();

    const response = await result.current.createSeller({});
    expect(response.error).toBeDefined();

    consoleSpy.mockRestore();
  });
});
