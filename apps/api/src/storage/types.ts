export interface PutResult {
  key: string;
  url: string;
}

export interface PresignResult {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
}

/**
 * Storage is deliberately provider-agnostic. The local driver is used in
 * development; Cloudflare R2 (S3-compatible) is used in production.
 */
export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<PutResult>;
  get(key: string): Promise<Buffer>;
  presignPut(key: string, contentType: string): Promise<PresignResult>;
  publicUrl(key: string): string;
  delete(key: string): Promise<void>;
}
