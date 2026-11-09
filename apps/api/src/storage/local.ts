import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import type { PutResult, StorageAdapter } from './types';

const rootDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);

function resolveSafe(key: string): string {
  const target = path.resolve(rootDir, key);
  if (target !== rootDir && !target.startsWith(rootDir + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return target;
}

/** Filesystem driver used for local development and tests. */
export class LocalStorageAdapter implements StorageAdapter {
  async put(
    key: string,
    body: Buffer,
    _contentType: string,
  ): Promise<PutResult> {
    const target = resolveSafe(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return { key, url: this.publicUrl(key) };
  }

  publicUrl(key: string): string {
    const base = env.PUBLIC_MEDIA_URL.replace(/\/+$/, '');
    return `${base}/${key.replace(/^\/+/, '')}`;
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(resolveSafe(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
