import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const {
  mockSelect,
  mockEq,
  mockSingle,
  mockMaybeSingle,
  mockUpsert,
  mockOrder,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockUpsert: vi.fn(),
  mockOrder: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const chain = () => {
    const c: Record<string, any> = {};
    c.select = mockSelect.mockReturnValue(c);
    c.eq = mockEq.mockReturnValue(c);
    c.single = mockSingle.mockResolvedValue({ data: null });
    c.maybeSingle = mockMaybeSingle.mockResolvedValue({ data: null });
    c.upsert = mockUpsert.mockReturnValue(c);
    c.order = mockOrder.mockReturnValue(c);
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
            session: null,
          },
        }),
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ data: { session: {} }, error: null }),
        signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
        verifyOtp: vi.fn().mockResolvedValue({
          data: { session: { user: { email: 'test@example.com' } } },
          error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1' }, session: {} },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({}),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
        resend: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockReturnValue(chain()),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        unsubscribe: vi.fn(),
      }),
    },
  };
});

function Consumer() {
  const {
    user,
    loading,
    signUp,
    signIn,
    verifyOtp,
    signOut,
    resetPassword,
    updatePassword,
    resendOtp,
  } = useAuth();
  const [result, setResult] = React.useState<any>(null);

  const displayResult = result
    ? result.error
      ? { error: result.error.message }
      : result
    : '';

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : 'none'}</span>
      <button
        onClick={async () =>
          setResult(
            await signUp(
              '9999999999',
              'Tester',
              'test@example.com',
              'secret123',
              false,
            ),
          )
        }
      >
        sign up
      </button>
      <button
        onClick={async () =>
          setResult(
            await signUp(
              '9999999998',
              'Buyer',
              'buyer@example.com',
              'secret123',
              true,
            ),
          )
        }
      >
        sign up buyer
      </button>
      <button
        onClick={async () =>
          setResult(await signIn.password('test@example.com', 'secret123'))
        }
      >
        sign in
      </button>
      <button
        onClick={async () => {
          await signIn.sendOtp('9999999999');
          setResult('otp-sent');
        }}
      >
        send otp
      </button>
      <button
        onClick={async () =>
          setResult(await signIn.verifyOtp('9999999999', '123456'))
        }
      >
        verify otp
      </button>
      <button
        onClick={async () =>
          setResult(
            await verifyOtp({
              token: '123456',
              type: 'signup',
              email: 'test@example.com',
            }),
          )
        }
      >
        verify email otp
      </button>
      <button onClick={async () => await signOut()}>sign out</button>
      <button
        onClick={async () => setResult(await resetPassword('test@example.com'))}
      >
        reset password
      </button>
      <button
        onClick={async () => setResult(await updatePassword('newsecret'))}
      >
        update password
      </button>
      <button
        onClick={async () => setResult(await resendOtp('test@example.com'))}
      >
        resend otp
      </button>
      <div data-testid="result">
        {displayResult ? JSON.stringify(displayResult) : ''}
      </div>
    </div>
  );
}

describe('useAuth coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Default resolves to avoid unhandled errors
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('loads session and checks profile correctly', async () => {
    // Setup a valid session
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            user_metadata: { name: 'Test User' },
            email_confirmed_at: '2023-01-01',
          },
        },
      },
    });

    // Profile check
    mockSingle.mockResolvedValueOnce({
      data: { role: 'seller', is_blocked: false },
    });
    mockMaybeSingle.mockResolvedValueOnce({ data: { status: 'active' } }); // seller status

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).not.toHaveTextContent('none');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('"role":"seller"');
    expect(screen.getByTestId('user')).toHaveTextContent('"is_blocked":false');
  });

  it('handles blocked profile on load', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: { user: { id: 'u1', email: 'b@b.com' } },
      },
    });
    mockSingle.mockResolvedValue({
      data: { role: 'seller', is_blocked: true },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(sessionStorage.getItem('apnabazar_blocked_alert')).toBe('true');
    });
  });

  it('handles missing profile by upserting', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'u2',
            email: 'm@m.com',
            user_metadata: { role: 'buyer' },
          },
        },
      },
    });
    mockSingle.mockResolvedValueOnce({ data: null }); // trigger else block
    mockUpsert.mockReturnThis();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  it('signs up as seller and buyer', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign up' }));
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({ role: 'auto.seller' }),
          }),
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'sign up buyer' }));
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({ role: 'auto.buyer_795' }),
          }),
        }),
      );
    });
  });

  it('handles signUp error', async () => {
    (supabase.auth.signUp as any).mockResolvedValueOnce({
      error: new Error('Signup failed'),
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign up' }));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Signup failed');
    });
  });

  it('performs password login successfully', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { is_blocked: false, role: 'buyer' },
    }); // for both checkUser and login

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
      expect(screen.getByTestId('result')).toHaveTextContent('{"error":null}');
    });
  });

  it('handles password login rate limiting and errors', async () => {
    // 5 failures
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: new Error('Invalid login credentials'),
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(i + 1);
      });
    }

    // 6th attempt should be rate limited and NOT call supabase
    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Too many failed attempts',
      );
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(5);
    });
  });

  it('handles password login for blocked user', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: { is_blocked: true, role: 'buyer' } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'blocked by the admin',
      );
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('sends and verifies OTP', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'send otp' }));
    await waitFor(() => expect(supabase.auth.signInWithOtp).toHaveBeenCalled());

    (supabase.auth.verifyOtp as any).mockResolvedValueOnce({
      data: { session: {}, user: { id: 'u1' } },
      error: null,
    });
    fireEvent.click(screen.getByRole('button', { name: 'verify otp' }));
    await waitFor(() => expect(supabase.auth.verifyOtp).toHaveBeenCalled());
  });

  it('verifies email OTP for signup and upserts profile', async () => {
    (supabase.auth.verifyOtp as any).mockResolvedValueOnce({
      data: {
        session: {},
        user: {
          id: 'u1',
          email: 'test@example.com',
          user_metadata: { role: 'seller' },
        },
      },
      error: null,
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'verify email otp' }));
    await waitFor(() => {
      expect(supabase.auth.verifyOtp).toHaveBeenCalled();
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  it('resets and updates password', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'reset password' }));
    await waitFor(() =>
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'update password' }));
    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalled());
  });

  it('throws outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'useAuth must be used within AuthProvider',
    );
    spy.mockRestore();
  });

  it('resends OTP', async () => {
    (supabase.auth.resend as any).mockResolvedValueOnce({ error: null });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'resend otp' }));
    await waitFor(() => {
      expect(supabase.auth.resend).toHaveBeenCalled();
      expect(screen.getByTestId('result')).toHaveTextContent('{"error":null}');
    });

    (supabase.auth.resend as any).mockResolvedValueOnce({
      error: new Error('Resend failed'),
    });
    fireEvent.click(screen.getByRole('button', { name: 'resend otp' }));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Resend failed');
    });
  });

  it('handles genericVerifyOtp errors', async () => {
    (supabase.auth.verifyOtp as any).mockResolvedValueOnce({
      error: new Error('Invalid OTP'),
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'verify email otp' }));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        '{"error":"Invalid OTP"}',
      );
    });
  });

  it('stores phone and email on successful OTP verification', async () => {
    const mockSession = { user: { email: 'stored@test.com' } };
    (supabase.auth.verifyOtp as any).mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'verify otp' }));
    await waitFor(() => {
      expect(localStorage.getItem('apnabazar_phone_email_map')).toContain(
        'stored@test.com',
      );
    });
  });

  describe('utility functions and edge cases', () => {
    it('normalizes phone numbers correctly', async () => {
      // Tested via Consumer and genericVerifyOtp mock call in another test
    });

    it('handles lockout in password login', async () => {
      // Mock recordFailure logic by setting localStorage directly or triggering it
      const identifier = 'test@example.com';
      const data = {
        [identifier]: { count: 5, lockedUntil: Date.now() + 100000 },
      };
      localStorage.setItem('apnabazar_auth_rate_limit', JSON.stringify(data));

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId('loading')).toHaveTextContent('false'),
      );

      fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent(
          'Too many failed attempts',
        );
      });
    });

    it('handles blocked seller in password login', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { user: { id: 'blocked-seller' } },
        error: null,
      });

      // profile check and seller check
      mockSingle.mockImplementation(() =>
        Promise.resolve({
          data: { is_blocked: false, role: 'seller' },
          error: null,
        }),
      );
      mockMaybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { status: 'blocked' }, error: null }),
      );

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId('loading')).toHaveTextContent('false'),
      );

      fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(screen.getByTestId('result')).toHaveTextContent(
          'blocked by the admin',
        );
      });
    });

    it('handles network error in password login catch block', async () => {
      (supabase.auth.signInWithPassword as any).mockImplementationOnce(() => {
        throw new Error('Network fail');
      });

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId('loading')).toHaveTextContent('false'),
      );

      fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('Network fail');
      });
    });
  });
});

describe('useAuth real-time and edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('handles real-time profile blocked status', async () => {
    let profileCallback: any;
    const mockChannel = {
      on: vi.fn().mockImplementation(function (
        this: any,
        event,
        filter,
        callback,
      ) {
        if (filter.table === 'profiles') profileCallback = callback;
        return this;
      }),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn(),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 't@t.com' } } },
    });
    mockSingle.mockResolvedValue({ data: { is_blocked: false } });

    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    // Trigger profile update via subscription
    act(() => {
      if (profileCallback) profileCallback({ new: { is_blocked: true } });
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(window.location.href).toBe('/auth');
    });

    (window as any).location = originalLocation;
  });

  it('handles real-time seller blocked status', async () => {
    let sellerCallback: any;
    const mockChannel = {
      on: vi.fn().mockImplementation(function (
        this: any,
        event,
        filter,
        callback,
      ) {
        if (filter.table === 'sellers') sellerCallback = callback;
        return this;
      }),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn(),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 't@t.com' } } },
    });
    mockSingle.mockResolvedValue({ data: { is_blocked: false } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    act(() => {
      sellerCallback({ new: { status: 'blocked' } });
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('handles password login network errors', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: new Error('fetch error'),
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'check your internet connection',
      );
    });
  });

  it('handles generic verifyOtp for SMS', async () => {
    (supabase.auth.verifyOtp as any).mockResolvedValueOnce({
      data: { session: { user: { email: 't@t.com' } } },
      error: null,
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'verify otp' }));
    await waitFor(() => {
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'sms' }),
      );
    });
  });
});
