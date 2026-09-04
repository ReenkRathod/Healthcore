/**
 * API router — root mount point.
 *
 * All routes are mounted here and then attached to the Express app under
 * the versioned prefix  /api/v1  in app.ts.
 *
 * Add new feature routers to this file as they are implemented:
 *
 *   import authRouter from './auth';
 *   router.use('/auth', authRouter);
 */

import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import adminDoctorsRouter from './adminDoctors';
import adminUsersRouter from './admin';
import doctorsRouter from './doctors';
import specialisationsRouter from './specialisations';
import appointmentsRouter from './appointments';
import notificationsRouter from './notifications';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/admin/users', adminUsersRouter);
router.use('/admin/doctors', adminDoctorsRouter);
router.use('/doctors', doctorsRouter);
router.use('/specialisations', specialisationsRouter);
router.use('/appointments', appointmentsRouter);
router.use('/notifications', notificationsRouter);

export default router;
