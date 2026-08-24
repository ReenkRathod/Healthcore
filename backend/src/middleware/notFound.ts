import { Request, Response } from 'express';

/** 404 catch-all for routes that don't match any registered handler */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
    },
  });
}
