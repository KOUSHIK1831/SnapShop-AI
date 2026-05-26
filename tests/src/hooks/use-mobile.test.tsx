import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useIsMobile } from '@/hooks/use-mobile';

type MatchMediaListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(width: number) {
  const listeners = new Set<MatchMediaListener>();

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({
      matches: width < 768,
      media: '(max-width: 767px)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, listener: MatchMediaListener) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: MatchMediaListener) =>
        listeners.delete(listener),
      dispatchEvent: () => true,
    }),
  });

  return {
    setWidth(nextWidth: number) {
      window.innerWidth = nextWidth;
      listeners.forEach(listener =>
        listener({ matches: nextWidth < 768 } as MediaQueryListEvent),
      );
    },
  };
}

describe('useIsMobile', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1024,
    });
  });

  it('returns true for mobile widths', () => {
    installMatchMedia(480);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('reacts to media query changes', () => {
    const media = installMatchMedia(1024);
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => {
      media.setWidth(640);
    });

    expect(result.current).toBe(true);
  });
});
