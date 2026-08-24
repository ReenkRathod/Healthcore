/**
 * Health-check route integration tests.
 *
 * Prisma is mocked — no real database is needed to run these tests.
 * The app is created fresh per `describe` block to avoid state leaks.
 */

import request from 'supertest';
import { createApp } from '../app';

// ── Mock the Prisma client so tests run without a real database ───────────────
jest.mock('../db/client', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ ping: 1 }]),
    $on: jest.fn(), // silence event listeners
  },
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

describe('GET /api/v1/health', () => {
  it('returns HTTP 200 when database probe succeeds', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });

  it('response body has success:true and status:"healthy"', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
  });

  it('response contains expected top-level fields', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('checks');
  });

  it('checks.server.status is "ok"', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.checks.server.status).toBe('ok');
  });

  it('checks.database.status is "ok" when probe resolves', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.checks.database.status).toBe('ok');
  });

  it('returns HTTP 503 and status:"degraded" when database probe fails', async () => {
    // Override the mock to simulate a DB outage
    const { prisma } = jest.requireMock('../db/client') as {
      prisma: { $queryRaw: jest.Mock };
    };
    prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database.status).toBe('error');
  });

  it('degraded response never exposes internal error details', async () => {
    const { prisma } = jest.requireMock('../db/client') as {
      prisma: { $queryRaw: jest.Mock };
    };
    prisma.$queryRaw.mockRejectedValueOnce(
      new Error('password=secret_password host=db.internal'),
    );

    const res = await request(app).get('/api/v1/health');
    const body = JSON.stringify(res.body);
    // Safe message only
    expect(body).toContain('Database unreachable');
    // Must not echo the raw error message
    expect(body).not.toContain('password=');
    expect(body).not.toContain('db.internal');
  });
});

describe('GET /api/v1/<unknown>', () => {
  it('returns HTTP 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('404 response has success:false and ROUTE_NOT_FOUND code', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('404 body never contains a stack trace', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at\s+\w+\s+\(/);  // stack trace pattern
    expect(body).not.toContain('Error:');
  });
});

describe('Security headers', () => {
  it('response includes X-Content-Type-Options header', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('response does not expose X-Powered-By header', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
