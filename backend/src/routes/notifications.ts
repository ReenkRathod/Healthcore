import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as notificationService from '../services/notification.service';

const router = Router();

router.use(authenticate);

// GET /api/v1/notifications
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await notificationService.getUserNotifications(req.user!.id);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await notificationService.markAllNotificationsAsRead(req.user!.id);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await notificationService.markNotificationAsRead(req.params['id']!, req.user!.id);
    res.status(200).json({
      success: true,
      data: { notification },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
