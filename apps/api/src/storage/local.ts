import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { signUploadToken } from '../lib/tokens';
import type { PresignResult, PutResult, StorageAdapter } from './types';

const rootDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);

function resolveSafe(key: string): string {
  const target = path.resolve(rootDir, key);
  if (target !== rootDir && !target.startsWith(rootDir + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return target;
}

/**
 * Filesystem driver used for local development and tests. Uploads are
 * "presigned" with an HMAC token so the browser can PUT straight to the API
 * without needing a bearer token.
 */
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

  async get(key: string): Promise<Buffer> {
    return readFile(resolveSafe(key));
  }

  async presignPut(key: string, _contentType: string): Promise<PresignResult> {
    const token = signUploadToken(key);
    const base = env.API_PUBLIC_URL.replace(/\/+$/, '');
    return {
      url: `${base}/api/v1/files/local-upload?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`,
      method: 'PUT',
      headers: {},
      expiresIn: 15 * 60,
    };
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
