export interface PutResult {
  key: string;
  url: string;
}

/**
 * Storage is deliberately provider-agnostic.
 * Phase 0 ships the local-driver only; the S3/R2 driver lands in Phase 3.
 */
export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<PutResult>;
  publicUrl(key: string): string;
  delete(key: string): Promise<void>;
}
