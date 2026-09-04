import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { authenticate, requireRole } from '../middleware/authenticate';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

const router = Router();

// Apply auth and admin role check to all routes in this file
router.use(authenticate);
router.use(requireRole('ADMIN'));

import { Role } from '@prisma/client';

// ─── GET /users ─────────────────────────────────────────────────────────────────
// List all users, optionally filtered by role
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role } = req.query;
    const filter = role ? { role: role as Role } : {};

    const users = await prisma.user.findMany({
      where: filter,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        doctorProfile: true,
        patientProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /doctors/:id/verify ───────────────────────────────────────────────────
// Verify a doctor's profile using userId
router.patch('/doctors/:id/verify', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: id },
    });

    if (!doctorProfile) {
      throw AppError.notFound('Doctor profile not found');
    }

    const updated = await prisma.doctorProfile.update({
      where: { userId: id },
      data: { isVerifiedByAdmin: true },
    });

    logger.info({ adminId: req.user!.id, doctorId: id }, 'Doctor profile verified by admin');

    res.status(200).json({ success: true, data: { doctor: updated } });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────
// Soft-delete a user (deactivate)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Soft delete by setting isActive to false
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info({ adminId: req.user!.id, deletedUserId: id }, 'User deactivated by admin');

    res.status(200).json({ success: true, data: { user: { id: updated.id, isActive: updated.isActive } } });
  } catch (err) {
    next(err);
  }
});

export default router;
