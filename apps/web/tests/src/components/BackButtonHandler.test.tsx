import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockAddListener, mockExitApp, mockNavigate, mockToast } = vi.hoisted(
  () => ({
    mockAddListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    mockExitApp: vi.fn(),
    mockNavigate: vi.fn(),
    mockToast: vi.fn(),
  }),
);

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: mockAddListener,
    exitApp: mockExitApp,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { MemoryRouter } from 'react-router-dom';
import { BackButtonHandler } from '@/components/BackButtonHandler';

describe('BackButtonHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <BackButtonHandler />
      </MemoryRouter>,
    );
    expect(container.textContent).toBe('');
  });

  it('calls navigate(-1) when on a non-home path', async () => {
    render(
      <MemoryRouter initialEntries={['/somewhere']}>
        <BackButtonHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalledWith(
        'backButton',
        expect.any(Function),
      );
    });

    const callback = mockAddListener.mock.calls[0][1];
    await callback();

    expect(mockNavigate).toHaveBeenCalledWith(-1);
    expect(mockExitApp).not.toHaveBeenCalled();
  });

  it('shows toast on first back press on home page', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BackButtonHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalledWith(
        'backButton',
        expect.any(Function),
      );
    });

    const callback = mockAddListener.mock.calls[0][1];
    await callback();

    expect(mockToast).toHaveBeenCalledWith({
      description: 'Press back again to exit',
      duration: 2000,
    });
    expect(mockExitApp).not.toHaveBeenCalled();
  });

  it('calls exitApp on second back press within 2 seconds', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BackButtonHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalledWith(
        'backButton',
        expect.any(Function),
      );
    });

    const callback = mockAddListener.mock.calls[0][1];
    await callback();
    await callback();

    expect(mockExitApp).toHaveBeenCalled();
  });

  it('shows toast on first back press on dashboard path', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BackButtonHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalledWith(
        'backButton',
        expect.any(Function),
      );
    });

    const callback = mockAddListener.mock.calls[0][1];
    await callback();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      description: 'Press back again to exit',
      duration: 2000,
    });
  });

  it('shows toast on first back press on buyer path', async () => {
    render(
      <MemoryRouter initialEntries={['/buyer']}>
        <BackButtonHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalledWith(
        'backButton',
        expect.any(Function),
      );
    });

    const callback = mockAddListener.mock.calls[0][1];
    await callback();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalled();
  });
});
