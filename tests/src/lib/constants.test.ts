import { describe, it, expect } from 'vitest';

describe('constants', () => {
  it('exports BACKEND_URL with fallback', async () => {
    const { BACKEND_URL } = await import('@/lib/constants');
    expect(BACKEND_URL).toBe('/api/v1');
  });
});
