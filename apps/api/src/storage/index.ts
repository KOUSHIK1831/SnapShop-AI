import { env } from '../config/env';
import { LocalStorageAdapter } from './local';
import type { StorageAdapter } from './types';

function createStorage(): StorageAdapter {
  if (env.STORAGE_DRIVER === 's3') {
    throw new Error(
      'STORAGE_DRIVER=s3 is not implemented yet — it lands in Phase 3. Use "local" for now.',
    );
  }

  return new LocalStorageAdapter();
}

export const storage: StorageAdapter = createStorage();
export type { PutResult, StorageAdapter } from './types';
