import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  parseAIResponse,
  isClothingProduct,
  sanitizeText,
  getMockDigitizeResult,
} from '../src/services/ai/digitize';

const app = createApp();

describe('Phase 4: AI Digitize & WhatsApp Agent', () => {
  describe('WhatsApp Webhook verification', () => {
    it('GET /api/v1/whatsapp/webhook handles Meta challenge verification', async () => {
      const res = await request(app).get('/api/v1/whatsapp/webhook').query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'snapshop-verify-token',
        'hub.challenge': 'challenge-code-12345',
      });
      expect(res.status).toBe(200);
      expect(res.text).toBe('challenge-code-12345');
    });

    it('GET /api/v1/whatsapp/webhook rejects invalid verify token with 403', async () => {
      const res = await request(app).get('/api/v1/whatsapp/webhook').query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'challenge-code',
      });
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/whatsapp/webhook ignores non-message events gracefully', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          entry: [{ changes: [{ value: { statuses: [{ id: 'status-1' }] } }] }],
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ignored');
    });
  });

  describe('AI Digitize & Security validations', () => {
    it('POST /api/v1/ai/digitize requires authentication', async () => {
      const res = await request(app)
        .post('/api/v1/ai/digitize')
        .send({ imageUrl: 'https://example.com/item.jpg' });
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/ai/usage requires authentication', async () => {
      const res = await request(app).get('/api/v1/ai/usage');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/analytics/seller requires authentication', async () => {
      const res = await request(app).get('/api/v1/analytics/seller');
      expect(res.status).toBe(401);
    });

    it('sanitizes malicious HTML/script tags from text', () => {
      const raw = '<script>alert("xss")</script><b>Premium Silk Saree</b>';
      const clean = sanitizeText(raw);
      expect(clean).not.toContain('<script>');
      expect(clean).toBe('Premium Silk Saree');
    });

    it('accurately identifies clothing keywords', () => {
      expect(
        isClothingProduct({ title: 'Cotton Kurta', category: 'Ethnic' }),
      ).toBe(true);
      expect(
        isClothingProduct({ title: 'Running Shoes', category: 'Footwear' }),
      ).toBe(true);
      expect(
        isClothingProduct({
          title: 'Smart Television 55 inch',
          category: 'Electronics',
        }),
      ).toBe(false);
    });

    it('parses valid AI JSON and sets default confidence', () => {
      const json = JSON.stringify({
        title: 'Floral Summer Dress',
        description: 'Lightweight linen dress for summer.',
        price: 899,
        category: 'Womenswear',
        tags: ['dress', 'summer', 'linen'],
      });
      const parsed = parseAIResponse(json);
      expect(parsed.title).toBe('Floral Summer Dress');
      expect(parsed.price).toBe(899);
      expect(parsed.confidence?.title).toBeGreaterThan(0);
    });

    it('throws unprocessable when AI indicates non-clothing item', () => {
      const json = JSON.stringify({
        error: 'not-clothing',
        title: '',
        price: 0,
      });
      expect(() => parseAIResponse(json)).toThrow();
    });

    it('returns valid mock digitize product in fallback mode', () => {
      const mock = getMockDigitizeResult();
      expect(mock.title).toBeDefined();
      expect(mock.price).toBeGreaterThan(0);
      expect(mock.tags.length).toBeGreaterThan(0);
    });
  });
});
