/**
 * Admin Doctor Management Routes.
 *
 * All endpoints under /api/v1/admin/doctors require authentication
 * and ADMIN role.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createDoctorSchema,
  updateDoctorSchema,
  doctorStatusSchema,
  specialisationInputSchema,
  setWorkingHoursSchema,
  doctorLeaveSchema,
} from '../validators/doctor.validators';
import * as doctorService from '../services/doctor.service';
import logger from '../utils/logger';

const router = Router();

// Protect ALL routes in this router with authenticate + ADMIN authorization
router.use(authenticate, authorize('ADMIN'));

// ─── POST / — Create Doctor ──────────────────────────────────────────────────

router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = createDoctorSchema.parse(req.body);
      const doctor = await doctorService.createDoctor(data);

      logger.info({ doctorId: doctor.id, adminId: req.user!.id }, 'Admin created new doctor profile');

      res.status(201).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET / — List Doctors (Admin View) ───────────────────────────────────────

router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { specialisation, isAccepting, search } = req.query;

      const doctors = await doctorService.listDoctors({
        specialisation: typeof specialisation === 'string' ? specialisation : undefined,
        isAccepting: isAccepting !== undefined ? isAccepting === 'true' : undefined,
        search: typeof search === 'string' ? search : undefined,
        isAdminView: true,
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

// ─── GET /:id — Get Doctor Profile ──────────────────────────────────────────

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

// ─── PATCH /:id — Update Doctor Profile ─────────────────────────────────────

router.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = updateDoctorSchema.parse(req.body);
      const doctor = await doctorService.updateDoctor(req.params['id']!, data);

      logger.info({ doctorId: doctor.id, adminId: req.user!.id }, 'Admin updated doctor profile');

      res.status(200).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /:id/verify — Verify Doctor Profile ──────────────────────────────

router.patch(
  '/:id/verify',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctor = await doctorService.verifyDoctor(req.params['id']!);

      logger.info({ doctorId: doctor.id, adminId: req.user!.id }, 'Admin verified doctor');

      res.status(200).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /:id/status — Activate / Deactivate Doctor ──────────────────────

router.patch(
  '/:id/status',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = doctorStatusSchema.parse(req.body);
      const doctor = await doctorService.setDoctorStatus(req.params['id']!, data);

      logger.info(
        { doctorId: doctor.id, adminId: req.user!.id, status: data },
        'Admin updated doctor status',
      );

      res.status(200).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Specialisation Endpoints ───────────────────────────────────────────────

router.post(
  '/:id/specialisations',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = specialisationInputSchema.parse(req.body);
      const specialisation = await doctorService.addSpecialisation(req.params['id']!, data);

      res.status(201).json({
        success: true,
        data: { specialisation },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id/specialisations/:specId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await doctorService.removeSpecialisation(
        req.params['id']!,
        req.params['specId']!,
      );

      res.status(200).json({
        success: true,
        data: { message: 'Specialisation removed successfully' },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Working Hours Endpoints ────────────────────────────────────────────────

router.put(
  '/:id/working-hours',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = setWorkingHoursSchema.parse(req.body);
      const workingHours = await doctorService.setWorkingHours(req.params['id']!, data);

      res.status(200).json({
        success: true,
        data: { workingHours },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id/working-hours',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workingHours = await doctorService.getWorkingHours(req.params['id']!);

      res.status(200).json({
        success: true,
        data: { workingHours },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Leave Endpoints ────────────────────────────────────────────────────────

router.post(
  '/:id/leaves',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = doctorLeaveSchema.parse(req.body);
      const leave = await doctorService.addDoctorLeave(req.params['id']!, data);

      res.status(201).json({
        success: true,
        data: { leave },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id/leaves',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leaves = await doctorService.getDoctorLeaves(req.params['id']!);

      res.status(200).json({
        success: true,
        data: { leaves },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id/leaves/:leaveId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await doctorService.removeDoctorLeave(
        req.params['id']!,
        req.params['leaveId']!,
      );

      res.status(200).json({
        success: true,
        data: { message: 'Doctor leave record removed successfully' },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
