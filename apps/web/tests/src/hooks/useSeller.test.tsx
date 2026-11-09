import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useSeller } from '@/hooks/useSeller';

const { authState, mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(
  () => ({
    authState: { user: null as any },
    mockGet: vi.fn(),
    mockPost: vi.fn(),
    mockPatch: vi.fn(),
    mockDelete: vi.fn(),
  }),
);

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
  },
}));

describe('useSeller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    mockGet.mockImplementation(async (path: string) => {
      if (path === '/sellers/me')
        return { seller: { id: 's1', verification_status: 'approved' } };
      if (path.startsWith('/products')) return { items: [] };
      if (path.startsWith('/files')) return { files: [] };
      if (path.startsWith('/orders')) return { items: [] };
      return {};
    });
    mockPost.mockResolvedValue({});
    mockPatch.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
  });

  it('loads seller, products, and files', async () => {
    authState.user = { id: 'user-1' };

    const { result } = renderHook(() => useSeller());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/sellers/me');
    expect(result.current.seller?.id).toBe('s1');
  });

  it('updates order status with timestamps', async () => {
    authState.user = { id: 'user-1' };

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.updateOrderStatus('order-1', 'confirmed');

    expect(mockPatch).toHaveBeenCalledWith(
      '/orders/order-1/status',
      expect.objectContaining({
        status: 'confirmed',
      }),
    );
  });

  it('blocks seller creation without an authenticated user', async () => {
    const { result } = renderHook(() => useSeller());
    const response = await result.current.createSeller({
      store_name: 'Test Store',
    });

    expect(response?.error).toEqual(new Error('Not authenticated'));
    expect(mockPatch).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('handles createSeller update and insert paths', async () => {
    authState.user = { id: 'user-1' };

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Test patch path
    await result.current.createSeller({ store_name: 'New Name' });
    expect(mockPatch).toHaveBeenCalledWith('/sellers/me', expect.anything());

    // Test post fallback path when patch fails
    mockPatch.mockRejectedValueOnce(new Error('Patch failed'));
    mockPost.mockResolvedValueOnce({
      seller: { id: 's1', store_name: 'Brand New' },
    });
    await result.current.createSeller({ store_name: 'Brand New' });
    expect(mockPost).toHaveBeenCalledWith('/sellers/me', expect.anything());
  });

  it('handles verification error when no seller profile exists', async () => {
    authState.user = { id: 'user-1' };
    mockGet.mockResolvedValueOnce({ seller: null });

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const response = await result.current.submitForVerification({
      gstin: 'GST123',
      registered_business_name: 'Test Business',
      documents: [],
    });

    expect(response.error?.message).toContain('No seller profile found');
  });

  it('updates seller profile, products and deletes products', async () => {
    authState.user = { id: 'user-1' };

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.updateSellerProfile({ theme_color: '#000' });
    expect(mockPatch).toHaveBeenCalledWith(
      '/sellers/me',
      expect.objectContaining({ themeColor: '#000' }),
    );

    await result.current.updateProduct('p1', { title: 'New Title' });
    expect(mockPatch).toHaveBeenCalledWith(
      '/products/p1',
      expect.objectContaining({ title: 'New Title' }),
    );

    await result.current.deleteProduct('p1');
    expect(mockDelete).toHaveBeenCalledWith('/products/p1');
  });

  it('successfully fetches seller and updates profile', async () => {
    authState.user = { id: 'user-1' };

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const seller = await result.current.fetchSeller();
    expect(seller?.id).toBe('s1');

    await result.current.updateSellerProfile({ store_name: 'Updated' });
    expect(mockPatch).toHaveBeenCalledWith(
      '/sellers/me',
      expect.objectContaining({ storeName: 'Updated' }),
    );
  });

  it('handles createSeller update error', async () => {
    authState.user = { id: 'user-1' };
    const updateError = new Error('Update failed');
    mockPatch.mockRejectedValueOnce(updateError);
    mockPost.mockRejectedValueOnce(updateError);

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const response = await result.current.createSeller({ store_name: 'Fail' });
    expect(response.error).toEqual(updateError);
  });

  it('handles errors in updateOrderStatus and createSeller', async () => {
    authState.user = { id: 'user-1' };
    mockPatch.mockRejectedValueOnce(new Error('Status error'));
    mockPatch.mockRejectedValueOnce(new Error('Create error 1'));
    mockPost.mockRejectedValueOnce(new Error('Create error 2'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useSeller());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const statusRes = await result.current.updateOrderStatus('o1', 'confirmed');
    expect(statusRes.error).toBeDefined();

    const createRes = await result.current.createSeller({});
    expect(createRes.error).toBeDefined();

    consoleSpy.mockRestore();
  });
});
