import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import type { PresignResult, PutResult, StorageAdapter } from './types';

const TTL_SECONDS = 15 * 60;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing storage configuration: ${name}`);
  return value;
}

/** Cloudflare R2 / any S3-compatible bucket. */
export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;

  private readonly bucket: string;

  constructor() {
    this.bucket = required('S3_BUCKET', env.S3_BUCKET);

    this.client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: required('S3_ACCESS_KEY_ID', env.S3_ACCESS_KEY_ID),
        secretAccessKey: required(
          'S3_SECRET_ACCESS_KEY',
          env.S3_SECRET_ACCESS_KEY,
        ),
      },
      forcePathStyle: true,
    });
  }

  async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<PutResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, url: this.publicUrl(key) };
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = response.Body as
      { transformToByteArray(): Promise<Uint8Array> } | undefined;
    if (!body) return Buffer.alloc(0);
    return Buffer.from(await body.transformToByteArray());
  }

  async presignPut(key: string, contentType: string): Promise<PresignResult> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: TTL_SECONDS },
    );

    return {
      url,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      expiresIn: TTL_SECONDS,
    };
  }

  publicUrl(key: string): string {
    const base = required('S3_PUBLIC_URL', env.S3_PUBLIC_URL).replace(
      /\/+$/,
      '',
    );
    return `${base}/${key.replace(/^\/+/, '')}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
