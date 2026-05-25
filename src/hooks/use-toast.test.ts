import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { reducer, useToast, toast } from './use-toast';

describe('toast reducer', () => {
  it('keeps only the most recent toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Older', open: true }],
    };

    const next = reducer(state, {
      type: 'ADD_TOAST',
      toast: { id: '2', title: 'Newest', open: true },
    });

    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0]?.id).toBe('2');
  });

  it('updates an existing toast in place', () => {
    const state = {
      toasts: [{ id: '1', title: 'Initial', open: true }],
    };

    const next = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });

    expect(next.toasts[0]).toMatchObject({
      id: '1',
      title: 'Updated',
      open: true,
    });
  });

  it('dismisses all toasts when no id is provided', () => {
    const state = {
      toasts: [
        { id: '1', title: 'One', open: true },
        { id: '2', title: 'Two', open: true },
      ],
    };

    const next = reducer(state, {
      type: 'DISMISS_TOAST',
    });

    expect(next.toasts.every(toast => toast.open === false)).toBe(true);
  });

  it('dismisses a specific toast and keeps others', () => {
    const state = {
      toasts: [
        { id: '1', title: 'One', open: true },
        { id: '2', title: 'Two', open: true },
      ],
    };

    const next = reducer(state, {
      type: 'DISMISS_TOAST',
      toastId: '1',
    });

    expect(next.toasts.find(t => t.id === '1')?.open).toBe(false);
    expect(next.toasts.find(t => t.id === '2')?.open).toBe(true);
  });

  it('removes all toasts when toastId is undefined', () => {
    const state = {
      toasts: [
        { id: '1', title: 'One', open: true },
        { id: '2', title: 'Two', open: true },
      ],
    };

    const next = reducer(state, {
      type: 'REMOVE_TOAST',
    });

    expect(next.toasts).toHaveLength(0);
  });

  it('removes a specific toast by id', () => {
    const state = {
      toasts: [
        { id: '1', title: 'One', open: true },
        { id: '2', title: 'Two', open: true },
      ],
    };

    const next = reducer(state, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    });

    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe('2');
  });
});

describe('useToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('adds a toast and dismisses it', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test Toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');

    act(() => {
      result.current.dismiss(result.current.toasts[0].id);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('updates a toast', () => {
    const { result } = renderHook(() => useToast());
    let toastRef: any;

    act(() => {
      toastRef = result.current.toast({ title: 'Initial' });
    });

    act(() => {
      toastRef.update({ id: toastRef.id, title: 'Updated' });
    });

    expect(result.current.toasts[0].title).toBe('Updated');
  });

  it('handles onOpenChange', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test' });
    });

    const toastItem = result.current.toasts[0];
    act(() => {
      if (toastItem.onOpenChange) toastItem.onOpenChange(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('removes toast after delay', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      const { id } = result.current.toast({ title: 'Test' });
      result.current.dismiss(id);
    });

    expect(result.current.toasts[0].open).toBe(false);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useToast());
    unmount();
    // This just verifies it doesn't crash, 
    // we can't easily check the internal listeners array.
  });
});
