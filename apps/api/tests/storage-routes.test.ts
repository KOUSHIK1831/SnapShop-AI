import type { Request, Response, NextFunction } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { localDownloadHandler, localUploadHandler } from '../src/routes/files';
import { getVerificationDocumentDownload } from '../src/routes/admin';
import { HttpError } from '../src/lib/http-error';
import { prisma } from '../src/lib/prisma';
import { storage } from '../src/storage';
import { storageKeyForSellerReference } from '../src/lib/dto';
import { presignPaymentProof } from '../src/repositories/orders';

function responseMock() {
  const response = {
    status: vi.fn(),
    set: vi.fn(),
    send: vi.fn(),
  } as unknown as Response;
  vi.mocked(response.status).mockReturnValue(response);
  vi.mocked(response.set).mockReturnValue(response);
  vi.mocked(response.send).mockReturnValue(response);
  return response;
}

function requestMock(query: Record<string, string>, extra = {}) {
  return { query, ...extra } as unknown as Request;
}

afterEach(() => vi.restoreAllMocks());

describe('private storage routes', () => {
  it('allows expiring local upload and download URLs to transfer private files', async () => {
    const key = `sellers/test/${Date.now()}-private.jpg`;
    const upload = await storage.presignPut(key, 'image/jpeg');
    const uploadUrl = new URL(upload.url);
    const uploadedResponse = responseMock();

    await localUploadHandler(
      requestMock(Object.fromEntries(uploadUrl.searchParams.entries()), {
        body: Buffer.from('fake-image-bytes'),
        headers: { 'content-type': 'image/jpeg' },
      }),
      uploadedResponse,
      vi.fn() as NextFunction,
    );
    expect(uploadedResponse.status).toHaveBeenCalledWith(204);

    const download = await storage.presignGet(key);
    const downloadUrl = new URL(download.url);
    const downloadedResponse = responseMock();
    await localDownloadHandler(
      requestMock(Object.fromEntries(downloadUrl.searchParams.entries())),
      downloadedResponse,
      vi.fn() as NextFunction,
    );

    expect(downloadedResponse.set).toHaveBeenCalledWith(
      'Content-Type',
      'image/jpeg',
    );
    expect(downloadedResponse.set).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
    expect(downloadedResponse.send).toHaveBeenCalledWith(
      Buffer.from('fake-image-bytes'),
    );
    await storage.delete(key);
  });

  it('rejects forged local download tokens', async () => {
    const response = responseMock();
    await expect(
      localDownloadHandler(
        requestMock({ key: 'sellers/test/private.png', token: '1.invalid' }),
        response,
        vi.fn() as NextFunction,
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('only signs documents referenced by a seller and scoped to that seller', async () => {
    const key = 'sellers/seller-1/2026/document.pdf';
    vi.spyOn(prisma.seller, 'findFirst').mockResolvedValueOnce(null);

    await expect(getVerificationDocumentDownload(key)).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(getVerificationDocumentDownload(key)).rejects.toMatchObject({
      status: 404,
    });

    vi.spyOn(prisma.seller, 'findFirst').mockResolvedValueOnce({
      id: 'seller-1',
      verificationDocuments: [key],
    } as any);
    const signed = await getVerificationDocumentDownload(key);
    expect(signed.url).toContain('/api/v1/files/local-download');
  });

  it('rejects storage keys that traverse outside the seller prefix', () => {
    expect(
      storageKeyForSellerReference(
        'sellers/seller-1/../seller-2/secret.pdf',
        'seller-1',
      ),
    ).toBeNull();
  });

  it('does not issue payment-proof upload URLs to a different buyer', async () => {
    vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
      id: 'order-1',
      buyerId: 'buyer-owner',
      sellerId: 'seller-1',
    } as any);

    await expect(
      presignPaymentProof(
        {
          id: 'buyer-attacker',
          email: 'attacker@example.test',
          role: 'buyer',
          tokenVersion: 0,
        },
        'order-1',
        'proof.png',
        'image/png',
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
