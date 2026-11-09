import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('API routes wiring & validation', () => {
  it('POST /api/v1/auth/login validates required fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.title).toBe('Validation Failed');
  });

  it('POST /api/v1/auth/register validates email and password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/v1/auth/google validates credential payload', async () => {
    const res = await request(app).post('/api/v1/auth/google').send({});
    expect(res.status).toBe(422);
  });

  it('GET /api/v1/cart requires authentication (401)', async () => {
    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/orders requires authentication (401)', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(401);
  });
});
