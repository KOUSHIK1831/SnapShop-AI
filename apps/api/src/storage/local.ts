import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { signUploadToken } from '../lib/tokens';
import { signDownloadToken } from './download-tokens';
import type {
  PresignResult,
  PresignedDownload,
  PutResult,
  StorageAdapter,
} from './types';

const DOWNLOAD_TTL_SECONDS = 5 * 60;

const mimeByExtension: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function localContentTypeForKey(key: string): string {
  return (
    mimeByExtension[path.extname(key).toLowerCase()] ??
    'application/octet-stream'
  );
}

export function localIsInlineImage(key: string): boolean {
  return localContentTypeForKey(key).startsWith('image/');
}

function resolveSafe(rootDir: string, key: string): string {
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
  private readonly rootDir: string;

  private readonly apiPublicUrl: string;

  constructor(
    rootDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR),
    apiPublicUrl = env.API_PUBLIC_URL,
  ) {
    this.rootDir = path.resolve(rootDir);
    this.apiPublicUrl = apiPublicUrl.replace(/\/+$/, '');
  }

  async put(
    key: string,
    body: Buffer,
    _contentType: string,
  ): Promise<PutResult> {
    const target = resolveSafe(this.rootDir, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return { key };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(resolveSafe(this.rootDir, key));
  }

  async presignPut(key: string, _contentType: string): Promise<PresignResult> {
    const token = signUploadToken(key);
    return {
      url: `${this.apiPublicUrl}/api/v1/files/local-upload?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`,
      method: 'PUT',
      headers: {},
      expiresIn: 15 * 60,
    };
  }

  async presignGet(key: string): Promise<PresignedDownload> {
    const token = signDownloadToken(key, DOWNLOAD_TTL_SECONDS);
    return {
      url: `${this.apiPublicUrl}/api/v1/files/local-download?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`,
      expiresIn: DOWNLOAD_TTL_SECONDS,
    };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(resolveSafe(this.rootDir, key));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(resolveSafe(this.rootDir, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
