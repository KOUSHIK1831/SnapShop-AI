import { describe, expectTypeOf, it } from 'vitest';

import type { Database } from '@/integrations/supabase/types';

describe('supabase types', () => {
  it('exposes the generated public schema', () => {
    expectTypeOf<Database>().toHaveProperty('public');
  });
});
