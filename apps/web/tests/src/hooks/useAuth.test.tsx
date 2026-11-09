import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { apiClient, setAccessToken } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  setAccessToken: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public title: string,
      public detail?: string,
    ) {
      super(detail || title);
    }
  },
}));

vi.mock('@/lib/analytics', () => ({
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
}));

vi.mock('@/lib/sentry', () => ({
  setSentryUser: vi.fn(),
}));

function Consumer() {
  const {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    updateRole,
    signOut,
  } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <div data-testid="role">{user?.role ? user.role : 'null'}</div>
      <div data-testid="onboarded">
        {user ? String(user.onboarded) : 'null'}
      </div>

      <button
        onClick={() => signIn.password('test@example.com', 'password123')}
        data-testid="login-btn"
      >
        Login
      </button>

      <button
        onClick={() =>
          signUp('9999999999', 'Test User', 'new@example.com', 'password123')
        }
        data-testid="signup-btn"
      >
        Sign Up
      </button>

      <button
        onClick={() => signInWithGoogle('valid-google-jwt-credential')}
        data-testid="google-btn"
      >
        Google Login
      </button>

      <button onClick={() => updateRole('seller')} data-testid="role-btn">
        Set Seller
      </button>

      <button onClick={() => signOut()} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
}

describe('useAuth hook with REST API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes by checking session refresh', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      accessToken: 'access-token-123',
      user: {
        id: 'u1',
        email: 'user@example.com',
        role: 'seller',
        onboarded: true,
      },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('user@example.com');
    expect(screen.getByTestId('role').textContent).toBe('seller');
    expect(screen.getByTestId('onboarded').textContent).toBe('true');
    expect(setAccessToken).toHaveBeenCalledWith('access-token-123');
  });

  it('sets user to null if refresh fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(setAccessToken).toHaveBeenCalledWith(null);
  });

  it('logs in successfully with email and password', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('No session')); // initial check
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      accessToken: 'new-token',
      user: {
        id: 'u2',
        email: 'test@example.com',
        role: 'buyer',
        onboarded: true,
      },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false'),
    );

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      expect(screen.getByTestId('role').textContent).toBe('buyer');
    });
  });

  it('signs in with Google credential and enters onboarding if not onboarded', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('No session'));
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      accessToken: 'google-token',
      user: {
        id: 'u3',
        email: 'google@gmail.com',
        role: null,
        onboarded: false,
      },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false'),
    );

    await act(async () => {
      screen.getByTestId('google-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('google@gmail.com');
      expect(screen.getByTestId('onboarded').textContent).toBe('false');
      expect(screen.getByTestId('role').textContent).toBe('null');
    });
  });

  it('updates role during onboarding', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      accessToken: 'token-1',
      user: {
        id: 'u4',
        email: 'onboard@example.com',
        role: null,
        onboarded: false,
      },
    });
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      user: {
        id: 'u4',
        email: 'onboard@example.com',
        role: 'seller',
        onboarded: true,
      },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('onboarded').textContent).toBe('false'),
    );

    await act(async () => {
      screen.getByTestId('role-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('seller');
      expect(screen.getByTestId('onboarded').textContent).toBe('true');
    });
  });

  it('signs out and resets state', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      accessToken: 'token-2',
      user: {
        id: 'u5',
        email: 'user@snapshop.local',
        role: 'seller',
        onboarded: true,
      },
    });
    vi.mocked(apiClient.post).mockResolvedValueOnce({}); // for logout

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe(
        'user@snapshop.local',
      ),
    );

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(setAccessToken).toHaveBeenCalledWith(null);
    });
  });
});
