/**
 * Application logger (pino).
 *
 * - Structured JSON in production
 * - Human-readable pretty-print in development (pino-pretty)
 * - Log level controlled by LOG_LEVEL env var
 *
 * NEVER log: passwords, tokens, OAuth secrets, API keys,
 *            full clinical notes, or patient credentials.
 *
 * The `redact` list below masks sensitive fields automatically.
 */

import pino from 'pino';
import { config, isDev } from '../config';

const logger = pino({
  level: config.LOG_LEVEL,

  // Pretty-print only in development — pino-pretty is a devDependency
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
      },
    },
  }),

  // Automatically redact sensitive keys wherever they appear in log objects
  redact: {
    paths: [
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'access_token',
      'refresh_token',
      'apiKey',
      'api_key',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'googleClientSecret',
      'smtpPass',
      'smtp_pass',
      'privateKey',
      'private_key',
    ],
    censor: '[REDACTED]',
  },

  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

export default logger;
