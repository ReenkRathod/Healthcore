import { prisma } from '../db/client';
import { AppError } from '../utils/AppError';

/**
 * Service to handle in-app notifications for users (Doctors and Patients).
 */

export async function getUserNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      recipientId: userId,
      status: 'PENDING',
    },
  });

  return {
    notifications,
    unreadCount,
  };
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw AppError.notFound('Notification not found');
  }

  if (notification.recipientId !== userId) {
    throw AppError.forbidden('You are not authorized to update this notification');
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  return updated;
}

export async function markAllNotificationsAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      recipientId: userId,
      status: 'PENDING',
    },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  return { success: true };
}
