/**
 * Appointment routes.
 *
 * All endpoints under /api/v1/appointments require authentication.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
  clinicalNoteSchema,
} from '../validators/appointment.validators';
import * as appointmentService from '../services/appointment.service';
import * as preVisitSummaryService from '../services/ai/preVisitSummary.service';
import * as clinicalNoteService from '../services/clinicalNote.service';
import logger from '../utils/logger';

const router = Router();

// Protect ALL routes in this router with authenticate
router.use(authenticate);

// ─── POST / — Book Appointment (PATIENT only) ────────────────────────────────

router.post(
  '/',
  authorize('PATIENT'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idempotencyHeader = req.headers['idempotency-key'] as string | undefined;
      const data = bookAppointmentSchema.parse({
        ...req.body,
        idempotencyKey: req.body?.idempotencyKey ?? idempotencyHeader,
      });

      const { appointment, isNew } = await appointmentService.bookAppointment(
        req.user!.id,
        data,
      );

      logger.info(
        { appointmentId: appointment.id, patientId: req.user!.id },
        isNew ? 'Patient booked new appointment' : 'Patient retrieved idempotent appointment',
      );

      res.status(isNew ? 201 : 200).json({
        success: true,
        data: { appointment },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET / — List Appointments ───────────────────────────────────────────────

router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, startDate, endDate } = req.query;

      const appointments = await appointmentService.listAppointments(
        req.user!.id,
        req.user!.role,
        {
          status: typeof status === 'string' ? (status as any) : undefined,
          startDate: typeof startDate === 'string' ? startDate : undefined,
          endDate: typeof endDate === 'string' ? endDate : undefined,
        },
      );

      res.status(200).json({
        success: true,
        data: { appointments, count: appointments.length },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id — Get Appointment Details ──────────────────────────────────────

router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointment = await appointmentService.getAppointmentById(
        req.params['id']!,
        req.user!.id,
        req.user!.role,
      );

      res.status(200).json({
        success: true,
        data: { appointment },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /:id/cancel — Cancel Appointment ──────────────────────────────────

router.patch(
  '/:id/cancel',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = cancelAppointmentSchema.parse(req.body);
      const appointment = await appointmentService.cancelAppointment(
        req.params['id']!,
        req.user!.id,
        req.user!.role,
        data.cancellationReason ?? undefined,
      );

      logger.info(
        { appointmentId: appointment.id, userId: req.user!.id },
        'Appointment cancelled',
      );

      res.status(200).json({
        success: true,
        data: { appointment },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /:id/status — Update Appointment Status (DOCTOR / ADMIN) ─────────

router.patch(
  '/:id/status',
  authorize('DOCTOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = updateAppointmentStatusSchema.parse(req.body);
      const appointment = await appointmentService.updateAppointmentStatus(
        req.params['id']!,
        data.status,
        req.user!.id,
        req.user!.role,
      );

      logger.info(
        { appointmentId: appointment.id, status: data.status, userId: req.user!.id },
        'Appointment status updated',
      );

      res.status(200).json({
        success: true,
        data: { appointment },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /:id/pre-visit-summary/generate — Generate AI Summary ───────────────

router.post(
  '/:id/pre-visit-summary/generate',
  authorize('DOCTOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ensure the doctor has access to this appointment
      const appointment = await appointmentService.getAppointmentById(
        req.params['id']!,
        req.user!.id,
        req.user!.role,
      );

      // Trigger asynchronously (fire-and-forget for now)
      // In the future this should be pushed to a BullMQ queue
      preVisitSummaryService.generateSummaryForAppointment(appointment.id).catch(err => {
        logger.error({ err, appointmentId: appointment.id }, 'Background AI generation failed');
      });

      res.status(202).json({
        success: true,
        message: 'Pre-visit summary generation started',
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id/pre-visit-summary — Retrieve AI Summary ────────────────────────

router.get(
  '/:id/pre-visit-summary',
  authorize('DOCTOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Enforce authorization via the existing appointment service
      await appointmentService.getAppointmentById(
        req.params['id']!,
        req.user!.id,
        req.user!.role,
      );

      const summary = await preVisitSummaryService.getSummaryForAppointment(req.params['id']!);

      res.status(200).json({
        success: true,
        data: summary ?? { status: 'PENDING' },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /:id/clinical-notes — Create/Update Clinical Notes ───────────────

router.post(
  '/:id/clinical-notes',
  authorize('DOCTOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = clinicalNoteSchema.parse(req.body);
      const note = await clinicalNoteService.saveClinicalNote(
        req.params['id']!,
        data,
        req.user!.id,
        req.user!.role,
      );

      logger.info(
        { appointmentId: req.params['id'], userId: req.user!.id },
        'Clinical notes saved',
      );

      res.status(200).json({
        success: true,
        data: { note },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id/clinical-notes — Retrieve Clinical Notes ──────────────────────

router.get(
  '/:id/clinical-notes',
  authorize('DOCTOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const note = await clinicalNoteService.getClinicalNoteForAppointment(
        req.params['id']!,
        req.user!.id,
        req.user!.role,
      );

      res.status(200).json({
        success: true,
        data: { note },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
