import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('supabase client', () => {
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    consoleErrorSpy.mockClear();
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: undefined,
      VITE_SUPABASE_PUBLISHABLE_KEY: undefined,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('creates the client when env vars are present', async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'public-key',
    });
    createClientMock.mockReturnValue({ mocked: true });

    const module = await import('@/integrations/supabase/client');

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

  it('warns and falls back when env vars are missing', async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    });

    await import('@/integrations/supabase/client');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Missing Supabase environment variables. Please check your .env.example file for the required keys.',
    );
    expect(createClientMock).toHaveBeenCalledWith(
      'https://placeholder.supabase.co',
      'placeholder',
      expect.objectContaining({
        auth: expect.objectContaining({
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        }),
      }),
    );
  });
});
