import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { AuthProvider, useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => {
  const chain = () => {
    const c: Record<string, any> = {};
    c.select = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    c.single = vi.fn().mockResolvedValue({ data: null });
    c.maybeSingle = vi.fn().mockResolvedValue({ data: null });
    c.upsert = vi.fn(() => c);
    c.order = vi.fn(() => c);
    return c;
  };
  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'user-1',
                email: 'test@example.com',
                user_metadata: {},
              },
            },
          },
        }),
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ data: { session: {} }, error: null }),
        signUp: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
        signOut: vi.fn().mockResolvedValue({}),
      },
      from: vi.fn().mockReturnValue(chain()),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      }),
    },
  };
});

function Consumer() {
  const { user, loading, signUp, signIn, signOut } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
      <button
        onClick={() =>
          signUp('9999999999', 'Tester', 'test@example.com', 'secret123')
        }
      >
        sign up
      </button>
      <button onClick={() => signIn.password('test@example.com', 'secret123')}>
        sign in
      </button>
      <button onClick={() => signOut()}>sign out</button>
    </div>
  );
}

describe('useAuth', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads the current session and exposes auth actions', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    // Verify signUp works
    fireEvent.click(screen.getByRole('button', { name: 'sign up' }));
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalled();
    });

    // Verify sign out
    fireEvent.click(screen.getByRole('button', { name: 'sign out' }));
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('throws when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(
      'useAuth must be used within AuthProvider',
    );

    spy.mockRestore();
  });
});
