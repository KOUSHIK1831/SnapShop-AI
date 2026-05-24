import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('merges conditional classes', () => {
    const isHidden = false;
    expect(cn('base', isHidden && 'hidden', 'active')).toBe('base active');
  });

  it('lets tailwind-merge resolve conflicting utilities', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
