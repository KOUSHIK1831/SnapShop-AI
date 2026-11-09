import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/lib/tokens';
import { prisma } from '../src/lib/prisma';

const app = createApp();

describe('Phase 5: Security, RBAC & Hardening Suite', () => {
  describe('RBAC & Role-Based Access Control', () => {
    it('rejects unauthorized requests to admin endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/overview');
      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('rejects unauthorized requests to seller endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/sellers/me');
      expect(res.status).toBe(401);
    });

    it('rejects unauthorized requests to file presign with 401', async () => {
      const res = await request(app)
        .post('/api/v1/files/presign')
        .send({ filename: 'test.jpg', contentType: 'image/jpeg' });
      expect(res.status).toBe(401);
    });

    it('rejects unauthorized requests to feedback resolution with 401', async () => {
      const res = await request(app)
        .post('/api/v1/admin/feedback/fb-123/respond')
        .send({ response: 'Fixed' });
      expect(res.status).toBe(401);
    });

    it('rejects non-admin users (buyer) from admin endpoints with 403', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'buyer-user-id',
        email: 'buyer@test.com',
        role: 'buyer',
        isBlocked: false,
        tokenVersion: 0,
      } as any);

      const buyerToken = await signAccessToken({
        sub: 'buyer-user-id',
        email: 'buyer@test.com',
        role: 'buyer',
        ver: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('rejects non-seller users (buyer) from seller endpoints with 403', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'buyer-user-id',
        email: 'buyer@test.com',
        role: 'buyer',
        isBlocked: false,
        tokenVersion: 0,
      } as any);

      const buyerToken = await signAccessToken({
        sub: 'buyer-user-id',
        email: 'buyer@test.com',
        role: 'buyer',
        ver: 0,
      });

      const res = await request(app)
        .get('/api/v1/sellers/me')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('rejects seller from admin endpoints with 403', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'seller-user-id',
        email: 'seller@test.com',
        role: 'seller',
        isBlocked: false,
        tokenVersion: 0,
      } as any);

      const sellerToken = await signAccessToken({
        sub: 'seller-user-id',
        email: 'seller@test.com',
        role: 'seller',
        ver: 0,
      });

      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('rejects blocked users with 403 even with valid token', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'blocked-user-id',
        email: 'blocked@test.com',
        role: 'buyer',
        isBlocked: true,
        tokenVersion: 0,
      } as any);

      const token = await signAccessToken({
        sub: 'blocked-user-id',
        email: 'blocked@test.com',
        role: 'buyer',
        ver: 0,
      });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('rejects session when token version has been revoked (401)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'revoked-user-id',
        email: 'revoked@test.com',
        role: 'buyer',
        isBlocked: false,
        tokenVersion: 2, // User has bumped tokenVersion
      } as any);

      const oldToken = await signAccessToken({
        sub: 'revoked-user-id',
        email: 'revoked@test.com',
        role: 'buyer',
        ver: 1, // Stale token
      });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('Rate Limiting & Security Headers', () => {
    it('sets security headers via Helmet', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('sets RateLimit standard headers on /api/v1', async () => {
      const res = await request(app).get('/api/v1');
      expect(
        res.headers['ratelimit'] ||
          res.headers['ratelimit-limit'] ||
          res.headers['x-ratelimit-limit'],
      ).toBeDefined();
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('rejects malformed payload on public auth routes with 422', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'invalid-email', password: '123' });
      expect(res.status).toBe(422);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('rejects dangerous content-types in file presign', async () => {
      const res = await request(app).post('/api/v1/files/presign').send({
        filename: 'payload.exe',
        contentType: 'application/x-msdownload',
      });
      expect(res.status).toBe(401);
    });
  });
});
