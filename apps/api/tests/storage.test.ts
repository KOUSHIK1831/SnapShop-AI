import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  getSignedUrl,
  S3ClientMock,
  PutObjectCommandMock,
  GetObjectCommandMock,
} = vi.hoisted(() => ({
  getSignedUrl: vi.fn(),
  S3ClientMock: vi.fn(),
  PutObjectCommandMock: vi.fn(function (this: unknown, input: unknown) {
    Object.assign(this as object, input);
  }),
  GetObjectCommandMock: vi.fn(function (this: unknown, input: unknown) {
    Object.assign(this as object, input);
  }),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: S3ClientMock,
  PutObjectCommand: PutObjectCommandMock,
  GetObjectCommand: GetObjectCommandMock,
  DeleteObjectCommand: vi.fn(),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }));

import { LocalStorageAdapter } from '../src/storage/local';
import { S3StorageAdapter } from '../src/storage/s3';

afterEach(() => vi.clearAllMocks());

describe('S3StorageAdapter', () => {
  const config = {
    endpoint: 'https://project-ref.storage.supabase.co/storage/v1/s3',
    region: 'ap-south-1',
    bucket: 'private-assets',
    accessKeyId: 'server-access-key',
    secretAccessKey: 'server-secret-key',
  };

  it('uses configured Supabase S3 settings to presign private PUT uploads', async () => {
    getSignedUrl.mockResolvedValue('https://signed.example/put');
    const storage = new S3StorageAdapter(config);

    const result = await storage.presignPut(
      'sellers/1/document.pdf',
      'application/pdf',
    );

    expect(S3ClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: config.endpoint,
        region: config.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    );
    expect(PutObjectCommandMock).toHaveBeenCalledWith({
      Bucket: config.bucket,
      Key: 'sellers/1/document.pdf',
      ContentType: 'application/pdf',
    });
    expect(result.url).toBe('https://signed.example/put');
    expect(result.method).toBe('PUT');
  });

  it('presigns private GET downloads without requiring a public bucket URL', async () => {
    getSignedUrl.mockResolvedValue('https://signed.example/get');
    const storage = new S3StorageAdapter(config);

    const result = await storage.presignGet('sellers/1/document.pdf');

    expect(GetObjectCommandMock).toHaveBeenCalledWith({
      Bucket: config.bucket,
      Key: 'sellers/1/document.pdf',
    });
    expect(result.url).toBe('https://signed.example/get');
    expect(result.expiresIn).toBeGreaterThan(0);
  });

  it('requires complete endpoint credentials when using the S3 adapter', () => {
    expect(() => new S3StorageAdapter()).toThrow(
      'Missing storage configuration: S3_ENDPOINT',
    );
  });
});

describe('LocalStorageAdapter', () => {
  it('stores files locally and provides expiring signed download URLs', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'snapshop-storage-'));
    const storage = new LocalStorageAdapter(root, 'http://localhost:4000');

    try {
      await storage.put(
        'sellers/1/document.txt',
        Buffer.from('private'),
        'text/plain',
      );
      const result = await storage.presignGet('sellers/1/document.txt');

      expect(result.url).toContain('/api/v1/files/local-download?');
      expect(result.expiresIn).toBeGreaterThan(0);
      await expect(storage.get('sellers/1/document.txt')).resolves.toEqual(
        Buffer.from('private'),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
