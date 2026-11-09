import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import type {
  PresignResult,
  PresignedDownload,
  PutResult,
  StorageAdapter,
} from './types';

const TTL_SECONDS = 15 * 60;
const DOWNLOAD_TTL_SECONDS = 5 * 60;

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing storage configuration: ${name}`);
  return value;
}

/** Supabase Storage and other S3-compatible private buckets. */
export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;

  private readonly bucket: string;

  constructor(
    config: S3StorageConfig = {
      endpoint: required('S3_ENDPOINT', env.S3_ENDPOINT),
      region: required('S3_REGION', env.S3_REGION),
      bucket: required('S3_BUCKET', env.S3_BUCKET),
      accessKeyId: required('S3_ACCESS_KEY_ID', env.S3_ACCESS_KEY_ID),
      secretAccessKey: required(
        'S3_SECRET_ACCESS_KEY',
        env.S3_SECRET_ACCESS_KEY,
      ),
    },
  ) {
    this.bucket = config.bucket;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
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
    return { key };
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

  async presignGet(
    key: string,
    _contentType?: string,
  ): Promise<PresignedDownload> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: DOWNLOAD_TTL_SECONDS },
    );
    return { url, expiresIn: DOWNLOAD_TTL_SECONDS };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      const name = (error as { name?: string }).name;
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (name === 'NotFound' || name === 'NoSuchKey' || status === 404) {
        return false;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
