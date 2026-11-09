import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { Router } from 'express';
import path from 'node:path';
import { z } from 'zod';
import { paginationSchema, uuidSchema } from '@snapshop/shared';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { storage } from '../storage';
import { badRequest, notFound, unauthorized } from '../lib/http-error';
import { verifyUploadToken } from '../lib/tokens';
import { verifyDownloadToken } from '../storage/download-tokens';
import type { StoredFile } from '@prisma/client';
import { localContentTypeForKey, localIsInlineImage } from '../storage/local';
import { storageKeyForSellerReference } from '../lib/dto';

export const filesRouter = Router();

async function fileDto(file: StoredFile) {
  return {
    id: file.id,
    storage_key: file.storageKey,
    url: (await storage.presignGet(file.storageKey, file.mimeType ?? undefined))
      .url,
    file_type: file.fileType,
    mime_type: file.mimeType,
    size_bytes: file.sizeBytes,
    status: file.status,
    created_at: file.createdAt.toISOString(),
  };
}

async function sellerFor(userId: string) {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw notFound('Create your store before uploading files');
  return seller;
}

const presignBody = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z
    .string()
    .trim()
    .regex(/^[a-z]+\/[a-z0-9.+-]+$/i, 'Invalid content type')
    .max(100),
  fileType: z.string().trim().max(40).optional(),
});

filesRouter.post(
  '/presign',
  requireAuth,
  requireRole('seller'),
  validate({ body: presignBody }),
  async (req, res) => {
    const seller = await sellerFor(req.actor!.id);
    const { filename, contentType, fileType } = req.valid.body;

    const allowed =
      contentType.startsWith('image/') ||
      contentType === 'application/pdf' ||
      contentType === 'video/mp4';
    if (!allowed) {
      throw badRequest('Only images, PDFs, and MP4 videos can be uploaded');
    }

    const safeName =
      path
        .basename(filename)
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .slice(0, 80) || 'upload';
    const key = `sellers/${seller.id}/${new Date().getUTCFullYear()}/${randomUUID()}-${safeName}`;

    const upload = await storage.presignPut(key, contentType);

    res.status(201).json({
      key,
      upload_url: upload.url,
      method: upload.method,
      headers: upload.headers,
      expires_in: upload.expiresIn,
      public_url: (await storage.presignGet(key, contentType)).url,
      file_type: fileType ?? null,
    });
  },
);

const confirmBody = z.object({
  key: z.string().min(1).max(500),
  mimeType: z.string().trim().max(100).optional(),
  sizeBytes: z
    .number()
    .int()
    .min(0)
    .max(50 * 1024 * 1024)
    .optional(),
  fileType: z.string().trim().max(40).optional(),
});

filesRouter.post(
  '/confirm',
  requireAuth,
  requireRole('seller'),
  validate({ body: confirmBody }),
  async (req, res) => {
    const seller = await sellerFor(req.actor!.id);
    const prefix = `sellers/${seller.id}/`;

    if (
      storageKeyForSellerReference(req.valid.body.key, seller.id) !==
      req.valid.body.key
    ) {
      throw badRequest('This upload key does not belong to your store');
    }

    if (!(await storage.exists(req.valid.body.key))) {
      throw badRequest('Uploaded object was not found');
    }

    const existing = await prisma.storedFile.findFirst({
      where: { sellerId: seller.id, storageKey: req.valid.body.key },
    });

    const data = {
      sellerId: seller.id,
      storageKey: req.valid.body.key,
      mimeType: req.valid.body.mimeType ?? null,
      sizeBytes: req.valid.body.sizeBytes ?? null,
      fileType: req.valid.body.fileType ?? existing?.fileType ?? null,
      status: 'completed' as const,
    };

    const file = existing
      ? await prisma.storedFile.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.storedFile.create({ data });

    res.status(201).json({ file: await fileDto(file) });
  },
);

filesRouter.get(
  '/',
  requireAuth,
  requireRole('seller'),
  validate({
    query: paginationSchema.extend({
      fileType: z.string().trim().max(40).optional(),
    }),
  }),
  async (req, res) => {
    const seller = await sellerFor(req.actor!.id);
    const where = {
      sellerId: seller.id,
      ...(req.valid.query.fileType
        ? { fileType: req.valid.query.fileType }
        : {}),
    };

    const [total, files] = await prisma.$transaction([
      prisma.storedFile.count({ where }),
      prisma.storedFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (req.valid.query.page - 1) * req.valid.query.pageSize,
        take: req.valid.query.pageSize,
      }),
    ]);

    res.json({
      items: await Promise.all(files.map(fileDto)),
      total,
      page: req.valid.query.page,
      pageSize: req.valid.query.pageSize,
    });
  },
);

filesRouter.delete(
  '/:id',
  requireAuth,
  requireRole('seller'),
  validate({ params: z.object({ id: uuidSchema }) }),
  async (req, res) => {
    const seller = await sellerFor(req.actor!.id);
    const file = await prisma.storedFile.findFirst({
      where: { id: req.valid.params.id, sellerId: seller.id },
    });
    if (!file) throw notFound('File not found');

    await storage.delete(file.storageKey).catch(() => undefined);
    await prisma.storedFile.delete({ where: { id: file.id } });
    res.status(204).send();
  },
);

/**
 * Self-authenticating upload target for the local storage driver. Mounted
 * before express.json() so the raw file body survives.
 */
export const localUploadHandler: RequestHandler = async (req, res) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  if (!key || !token || !verifyUploadToken(key, token)) {
    throw unauthorized('Invalid or expired upload token');
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw badRequest('Expected a raw file body');
  }
  if (req.body.length > 20 * 1024 * 1024) {
    throw badRequest('File is larger than 20 MB');
  }

  const contentType =
    typeof req.headers['content-type'] === 'string'
      ? req.headers['content-type']
      : 'application/octet-stream';

  await storage.put(key, req.body, contentType);

  res.status(204).send();
};

/** Short-lived local download target. The HMAC token is scoped to this key. */
export const localDownloadHandler: RequestHandler = async (req, res) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  if (!key || !token || !verifyDownloadToken(key, token)) {
    throw unauthorized('Invalid or expired download token');
  }

  const body = await storage.get(key);
  const isInlineImage = localIsInlineImage(key);
  res
    .set('Content-Type', localContentTypeForKey(key))
    .set('Content-Disposition', `${isInlineImage ? 'inline' : 'attachment'}`)
    .set('X-Content-Type-Options', 'nosniff')
    .set('Cache-Control', 'private, no-store')
    .send(body);
};
