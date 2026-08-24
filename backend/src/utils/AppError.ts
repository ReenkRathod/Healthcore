/**
 * AppError — operational application error.
 *
 * Throw AppError for expected failures (404s, validation, auth).
 * The central error handler catches these and returns safe, structured
 * responses. Unrecognised errors (programming bugs) return a generic 500.
 *
 * Never put sensitive data in the `message` field — it is returned to clients.
 *
 * Usage:
 *   throw AppError.notFound('Patient not found');
 *   throw new AppError('Custom message', 409, 'CONFLICT_CODE');
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string | undefined;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factory helpers ────────────────────────────────────────────────────────

  static badRequest(message: string, code?: string): AppError {
    return new AppError(message, 400, code ?? 'BAD_REQUEST');
  }

  static unauthorized(
    message = 'Authentication required',
    code?: string,
  ): AppError {
    return new AppError(message, 401, code ?? 'UNAUTHORIZED');
  }

  static forbidden(message = 'Access denied', code?: string): AppError {
    return new AppError(message, 403, code ?? 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found', code?: string): AppError {
    return new AppError(message, 404, code ?? 'NOT_FOUND');
  }

  static conflict(message: string, code?: string): AppError {
    return new AppError(message, 409, code ?? 'CONFLICT');
  }

  static unprocessable(message: string, code?: string): AppError {
    return new AppError(message, 422, code ?? 'UNPROCESSABLE_ENTITY');
  }

  static tooManyRequests(
    message = 'Too many requests',
    code?: string,
  ): AppError {
    return new AppError(message, 429, code ?? 'RATE_LIMIT_EXCEEDED');
  }

  static serviceUnavailable(
    message = 'Service temporarily unavailable',
    code?: string,
  ): AppError {
    return new AppError(message, 503, code ?? 'SERVICE_UNAVAILABLE', false);
  }
}
