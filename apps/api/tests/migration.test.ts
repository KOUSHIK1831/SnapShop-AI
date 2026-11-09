import { describe, expect, it } from 'vitest';
import { runMigration } from '../scripts/migrate-from-supabase';

describe('Phase 2: Supabase to Prisma data migration script', () => {
  it('gracefully handles missing directory and completes report', async () => {
    const report = await runMigration('/tmp/non-existent-migration-dir');
    expect(report.usersMigrated).toBe(0);
    expect(report.sellersMigrated).toBe(0);
    expect(report.productsMigrated).toBe(0);
    expect(report.variantsMigrated).toBe(0);
    expect(report.ordersMigrated).toBe(0);
    expect(report.orderItemsMigrated).toBe(0);
  });
});
