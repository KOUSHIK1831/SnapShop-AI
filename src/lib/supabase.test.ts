import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('supabase client', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
  });

  it('creates the client when env vars are present', async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'public-key',
    });
    createClientMock.mockReturnValue({ mocked: true });

    const module = await import('./supabase');

    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'public-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        }),
      }),
    );
    expect(module.supabase).toEqual({ mocked: true });
  });

  it('throws when env vars are missing', async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    });

    await expect(import('./supabase')).rejects.toThrow(
      'Missing Supabase environment variables.',
    );
  });
});
