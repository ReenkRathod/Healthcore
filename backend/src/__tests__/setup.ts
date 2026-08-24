/**
 * Test environment bootstrap.
 *
 * This file is listed in jest.config.js `setupFiles` so it executes
 * BEFORE any source module is imported. Setting process.env here ensures
 * the Zod-based config validator sees valid values when app modules load.
 *
 * NEVER put real credentials here — use dummy values only.
 */

process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['API_VERSION'] = 'v1';
process.env['FRONTEND_URL'] = 'http://localhost:5173';

// Dummy PostgreSQL URL — Prisma client is mocked in tests so no real DB needed
process.env['DATABASE_URL'] =
  'postgresql://test:test@localhost:5432/healthcare_test';

// Dummy JWT secrets — must be ≥ 32 chars to pass Zod validation
process.env['JWT_ACCESS_SECRET'] =
  'test-jwt-access-secret-must-be-at-least-32-characters!!';
process.env['JWT_REFRESH_SECRET'] =
  'test-jwt-refresh-secret-must-be-at-least-32-characters!';

// Silence pino output during tests
process.env['LOG_LEVEL'] = 'fatal';
