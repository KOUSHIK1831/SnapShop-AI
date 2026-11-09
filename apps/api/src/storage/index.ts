import { env } from '../config/env';
import { LocalStorageAdapter } from './local';
import { S3StorageAdapter } from './s3';
import type { StorageAdapter } from './types';

function createStorage(): StorageAdapter {
  if (env.STORAGE_DRIVER === 's3') {
    return new S3StorageAdapter();
  }

  return new LocalStorageAdapter();
}

export const storage: StorageAdapter = createStorage();
export type { PresignResult, PutResult, StorageAdapter } from './types';
