import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NetworkStrengthIndicator } from '@/components/NetworkStrengthIndicator';
import { useNetworkStrength } from '@/hooks/useNetworkStrength';

vi.mock('@/hooks/useNetworkStrength', () => ({
  useNetworkStrength: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Tooltip components since they might depend on Radix which needs layout
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children, open }: any) => (
    <div data-testid="tooltip" data-open={open}>
      {children}
    </div>
  ),
  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe('NetworkStrengthIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when online and fast', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      status: 'fast',
      downloadMbps: 50,
      isOnline: true,
    } as any);

    render(<NetworkStrengthIndicator />);
    expect(screen.getByLabelText('Network: Fast')).toBeInTheDocument();
  });

  it('renders correctly when offline', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      status: 'offline',
      downloadMbps: null,
      isOnline: false,
    } as any);

    render(<NetworkStrengthIndicator />);
    expect(screen.getByLabelText('Network: Offline')).toBeInTheDocument();
  });

  it('renders correctly when checking (unknown)', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      status: 'unknown',
      downloadMbps: null,
      isOnline: true,
    } as any);

    render(<NetworkStrengthIndicator />);
    expect(screen.getByLabelText('Network: Checking')).toBeInTheDocument();
  });

  it('toggles tooltip on click', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      status: 'medium',
      downloadMbps: 5,
      isOnline: true,
    } as any);

    render(<NetworkStrengthIndicator />);
    const button = screen.getByLabelText('Network: Medium');

    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-open', 'false');
    fireEvent.click(button);
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-open', 'true');
  });

  it('displays speed information in tooltip', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      status: 'slow',
      downloadMbps: 0.5,
      isOnline: true,
    } as any);

    render(<NetworkStrengthIndicator />);
    expect(screen.getByText('Slow')).toBeInTheDocument();
    expect(screen.getByText(/0.50 Mbps/)).toBeInTheDocument();
  });

  it('displays measuring message when status is unknown and online', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      status: 'unknown',
      downloadMbps: null,
      isOnline: true,
    } as any);

    render(<NetworkStrengthIndicator />);
    expect(screen.getByText('auto.measuring_speed')).toBeInTheDocument();
  });

  it('displays no connection message when offline', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      status: 'offline',
      downloadMbps: null,
      isOnline: false,
    } as any);

    render(<NetworkStrengthIndicator />);
    expect(screen.getByText('auto.no_internet_connection')).toBeInTheDocument();
  });
});
