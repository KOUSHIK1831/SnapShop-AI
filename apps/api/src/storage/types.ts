export interface PutResult {
  key: string;
}

export interface PresignResult {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
}

export interface PresignedDownload {
  url: string;
  expiresIn: number;
}

/**
 * Storage is deliberately provider-agnostic. The local driver is used in
 * development; an S3-compatible private bucket is used in production.
 */
export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<PutResult>;
  get(key: string): Promise<Buffer>;
  presignPut(key: string, contentType: string): Promise<PresignResult>;
  presignGet(key: string, contentType?: string): Promise<PresignedDownload>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
