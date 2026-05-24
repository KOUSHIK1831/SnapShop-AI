import { describe, expect, it } from 'vitest';

import { reducer } from './use-toast';

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
});
