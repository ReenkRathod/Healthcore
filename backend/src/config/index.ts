/**
 * Centralised application configuration.
 *
 * All environment variables are parsed and validated here using Zod.
 * The app calls `process.exit(1)` on startup if any required variable
 * is missing or malformed — no silent misconfiguration.
 *
 * Usage:
 *   import { config } from './config';
 *   config.PORT  // number
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the backend root (one level above src/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  // ── Application ────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_VERSION: z.string().default('v1'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  // ── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .startsWith('postgresql://', 'DATABASE_URL must be a PostgreSQL connection string'),

  // ── Authentication (JWT) ───────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // ── Password Hashing ────────────────────────────────────────────────────────
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(20).default(12),

  // ── Admin Seed (optional — used by db:seed:admin script only) ───────────────
  ADMIN_SETUP_EMAIL: z.string().email().optional(),
  /** Admin setup password — sensitive, never logged */
  ADMIN_SETUP_PASSWORD: z.string().min(8).optional(),

  // ── LLM (OpenAI) ──────────────────────────────────────────────────────────
  /** Optional — features degrade gracefully when absent */
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // ── Email (SMTP) ───────────────────────────────────────────────────────────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  SMTP_USER: z.string().optional(),
  /** SMTP password is optional — sensitive, never logged */
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default('Healthcare Manager'),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),

  // ── Google OAuth 2.0 ──────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().optional(),
  /** Google client secret — sensitive, never logged */
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),

  // ── Redis (BullMQ) ────────────────────────────────────────────────────────
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  /** Window in milliseconds — default 15 minutes */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // ── Logging ───────────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

export type AppConfig = z.infer<typeof envSchema>;

function validateEnv(): AppConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Log human-readable errors; never expose raw process.env values
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    // eslint-disable-next-line no-console
    console.error(
      `\n❌  Invalid environment configuration:\n${issues}\n\nSee backend/.env.example for required variables.\n`,
    );
    process.exit(1);
  }

  return result.data;
}

export const config = validateEnv();

/** Convenience booleans — avoids repeated string comparisons across the codebase */
export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
