/**
 * Specialisations listing route.
 *
 * GET /api/v1/specialisations — List available specialisations
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as doctorService from '../services/doctor.service';

const router = Router();

router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const specialisations = await doctorService.listSpecialisations();

      res.status(200).json({
        success: true,
        data: { specialisations, count: specialisations.length },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
