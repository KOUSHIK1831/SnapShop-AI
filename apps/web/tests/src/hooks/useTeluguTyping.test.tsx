import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTeluguTyping } from '@/hooks/useTeluguTyping';

describe('useTeluguTyping', () => {
  it('does nothing when inactive', () => {
    const { result } = renderHook(() => useTeluguTyping(false));
    const mockEvent = {
      key: ' ',
      target: { value: 'ka' },
      preventDefault: vi.fn(),
    } as any;

    result.current.handleKeyDown(mockEvent);
    expect(mockEvent.target.value).toBe('ka');
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('transliterates last word on space', () => {
    const { result } = renderHook(() => useTeluguTyping(true));
    const target = {
      value: 'ka',
      dispatchEvent: vi.fn(),
    };
    const mockEvent = {
      key: ' ',
      target,
      preventDefault: vi.fn(),
    } as any;

    result.current.handleKeyDown(mockEvent);

    expect(target.value).toBe('క ');
    expect(target.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('transliterates last word on Enter', () => {
    const { result } = renderHook(() => useTeluguTyping(true));
    const target = {
      value: 'hello ka',
      dispatchEvent: vi.fn(),
    };
    const mockEvent = {
      key: 'Enter',
      target,
      preventDefault: vi.fn(),
    } as any;

    result.current.handleKeyDown(mockEvent);

    expect(target.value).toBe('hello క');
    expect(target.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
  });

  it('does not transliterate if word is not in mapping or same', () => {
    const { result } = renderHook(() => useTeluguTyping(true));
    const target = {
      value: 'z',
      dispatchEvent: vi.fn(),
    };
    const mockEvent = {
      key: ' ',
      target,
      preventDefault: vi.fn(),
    } as any;

    result.current.handleKeyDown(mockEvent);

    expect(target.value).toBe('z');
    expect(target.dispatchEvent).not.toHaveBeenCalled();
  });

  it('ignores non-trigger keys', () => {
    const { result } = renderHook(() => useTeluguTyping(true));
    const target = {
      value: 'ka',
      dispatchEvent: vi.fn(),
    };
    const mockEvent = {
      key: 'a',
      target,
      preventDefault: vi.fn(),
    } as any;

    result.current.handleKeyDown(mockEvent);

    expect(target.value).toBe('ka');
    expect(target.dispatchEvent).not.toHaveBeenCalled();
  });

  it('handles empty input', () => {
    const { result } = renderHook(() => useTeluguTyping(true));
    const target = {
      value: '',
      dispatchEvent: vi.fn(),
    };
    const mockEvent = {
      key: ' ',
      target,
      preventDefault: vi.fn(),
    } as any;

    result.current.handleKeyDown(mockEvent);

    expect(target.value).toBe('');
    expect(target.dispatchEvent).not.toHaveBeenCalled();
  });
});
