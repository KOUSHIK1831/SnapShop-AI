import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useNetworkStrength', () => ({
  useNetworkStrength: vi.fn(),
}));

import { useNetworkStrength } from '@/hooks/useNetworkStrength';
import OfflineBanner from '@/components/OfflineBanner';

describe('OfflineBanner', () => {
  it('shows banner when offline', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      isOnline: false,
      connectionType: null,
    } as any);

    render(<OfflineBanner />);
    expect(
      screen.getByText('auto.you_are_offline_some_features'),
    ).toBeInTheDocument();
  });

  it('does not show banner when online', () => {
    vi.mocked(useNetworkStrength).mockReturnValue({
      isOnline: true,
      connectionType: 'wifi',
    } as any);

    const { container } = render(<OfflineBanner />);
    expect(container.textContent).toBe('');
  });
});
