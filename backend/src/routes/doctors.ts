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
import { authenticate, requireRole } from '../middleware/authenticate';
import { doctorLeaveSchema } from '../validators/doctor.validators';
import { prisma } from '../db/client';
import { AppError } from '../utils/AppError';

const router = Router();

// ─── GET /me/profile — Get own profile (DOCTOR only) ────────────────────────
router.get(
  '/me/profile',
  authenticate,
  requireRole('DOCTOR'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!doctorProfile) throw AppError.notFound('Doctor profile not found');

      const doctor = await doctorService.getDoctorById(doctorProfile.id);
      res.status(200).json({ success: true, data: { doctor } });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /me/fee — Update own consultation fee (DOCTOR only) ──────────────
router.patch(
  '/me/fee',
  authenticate,
  requireRole('DOCTOR'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { consultationFee } = req.body as { consultationFee?: number };

      if (consultationFee === undefined || typeof consultationFee !== 'number' || consultationFee < 0) {
        res.status(400).json({
          success: false,
          error: { message: 'consultationFee must be a non-negative number', code: 'BAD_REQUEST', statusCode: 400 },
        });
        return;
      }

      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!doctorProfile) throw AppError.notFound('Doctor profile not found');

      const doctor = await doctorService.updateDoctor(doctorProfile.id, { consultationFee });
      res.status(200).json({ success: true, data: { doctor } });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /me/leaves — Apply for leave (DOCTOR only) ────────────────────────
router.post(
  '/me/leaves',
  authenticate,
  requireRole('DOCTOR'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = doctorLeaveSchema.parse(req.body);
      
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user!.id }
      });
      
      if (!doctorProfile) throw AppError.notFound('Doctor profile not found');
      
      const leave = await doctorService.addDoctorLeave(doctorProfile.id, data);

      res.status(201).json({
        success: true,
        data: { leave },
      });
    } catch (err) {
      next(err);
    }
  },
);

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
