/**
 * Doctor discovery routes (public / patient facing).
 *
 * Endpoints:
 *  GET /api/v1/doctors                 — Search active doctors by specialisation / name
 *  GET /api/v1/doctors/:id            — Get doctor public details
 *  GET /api/v1/doctors/:id/availability — Get available appointment slots on date
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as doctorService from '../services/doctor.service';
import { calculateDoctorAvailability } from '../services/availability.service';

const router = Router();

// ─── GET / — Search / List Doctors ───────────────────────────────────────────

router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { specialisation, search } = req.query;

      const doctors = await doctorService.listDoctors({
        specialisation: typeof specialisation === 'string' ? specialisation : undefined,
        search: typeof search === 'string' ? search : undefined,
        isAccepting: true, // Only return doctors currently accepting appointments
      });

      res.status(200).json({
        success: true,
        data: { doctors, count: doctors.length },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id/availability — Get Doctor Available Slots ────────────────────

router.get(
  '/:id/availability',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { date } = req.query;
      if (!date || typeof date !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            message: 'Query parameter date (YYYY-MM-DD) is required',
            code: 'BAD_REQUEST',
            statusCode: 400,
          },
        });
        return;
      }

      const availability = await calculateDoctorAvailability(
        req.params['id']!,
        date,
      );

      res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id — Get Doctor Details ──────────────────────────────────────────

router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctor = await doctorService.getDoctorById(req.params['id']!);
      res.status(200).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
