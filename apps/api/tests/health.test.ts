import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('health endpoints', () => {
  it('GET /health returns 200 without touching the database', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'snapshop-api',
    });
  });

  it('GET /api/v1 returns API metadata', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: 'SnapShop AI API',
      version: 'v1',
    });
  });

  it('unknown routes return RFC 7807 problem details', async () => {
    const response = await request(app).get('/nope');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.body).toMatchObject({ status: 404, title: 'Not Found' });
  });

  it('GET /openapi.json returns OpenAPI 3.1 schema', async () => {
    const response = await request(app).get('/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(response.body.info.title).toBe('SnapShop AI API');
  });

  it('GET /docs returns HTML documentation UI', async () => {
    const response = await request(app).get('/docs');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('SwaggerUIBundle');
  });
});
