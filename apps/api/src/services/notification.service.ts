import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { emailService, type EmailOptions } from './email.service.js';
import type { EmailTemplate } from './emailTemplate.service.js';

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ACADEMIC' | 'FINANCE' | 'LIBRARY' | 'HR' | 'SYSTEM';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
}

export interface NotifyOptions {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  emailTemplate?: EmailTemplate;
  emailData?: Record<string, any>;
  sendEmail?: boolean;
}

class NotificationService {
  /**
   * Create an in-app notification
   */
  async createNotification(input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
        link: input.link,
      },
    });

    return notification;
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(userIds: string[], notification: Omit<CreateNotificationInput, 'userId'>) {
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data as any,
        link: notification.link,
      })),
    });

    return notifications;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    filters?: {
      unreadOnly?: boolean;
      type?: NotificationType;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (filters?.unreadOnly) {
      where.isRead = false;
    }
    if (filters?.type) {
      where.type = filters.type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw AppError.notFound('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw AppError.notFound('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Clear all notifications for a user
   */
  async clearAllNotifications(userId: string): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  /**
   * Combined notification (in-app + optional email)
   */
  async notify(userId: string, options: NotifyOptions) {
    // Get user info for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Create in-app notification
    const notification = await this.createNotification({
      userId,
      type: options.type,
      title: options.title,
      message: options.message,
      data: options.data,
      link: options.link,
    });

    // Send email if requested
    if (options.sendEmail && options.emailTemplate) {
      const emailOptions: EmailOptions = {
        to: user.email,
        subject: options.title,
        template: options.emailTemplate,
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          ...options.emailData,
        },
      };

      // Send email asynchronously (don't wait)
      emailService.sendEmail(emailOptions).catch((err) => {
        console.error('Failed to send notification email:', err);
      });
    }

    return notification;
  }

  /**
   * Notify multiple users
   */
  async notifyMany(userIds: string[], options: Omit<NotifyOptions, 'sendEmail' | 'emailTemplate' | 'emailData'>) {
    return this.createBulkNotifications(userIds, {
      type: options.type,
      title: options.title,
      message: options.message,
      data: options.data,
      link: options.link,
    });
  }

  /**
   * Notify users by role
   */
  async notifyByRole(roleName: string, options: Omit<NotifyOptions, 'sendEmail' | 'emailTemplate' | 'emailData'>) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        roles: {
          some: {
            role: { name: roleName },
          },
        },
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);
    return this.notifyMany(userIds, options);
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    return result.count;
  }

  // ============================================
  // Pre-built notification helpers
  // ============================================

  /**
   * Send grades published notification
   */
  async notifyGradesPublished(userId: string, courseName: string, gradesUrl: string) {
    return this.notify(userId, {
      type: 'ACADEMIC',
      title: 'Grades Published',
      message: `Grades for ${courseName} have been published.`,
      link: gradesUrl,
      sendEmail: true,
      emailTemplate: 'grades-published',
      emailData: { courseName, gradesUrl },
    });
  }

  /**
   * Send payment received notification
   */
  async notifyPaymentReceived(
    userId: string,
    data: {
      receiptNo: string;
      amount: string;
      paymentMethod: string;
      balance: string;
    }
  ) {
    return this.notify(userId, {
      type: 'FINANCE',
      title: 'Payment Received',
      message: `Payment of ${data.amount} received. Receipt: ${data.receiptNo}`,
      data,
      sendEmail: true,
      emailTemplate: 'payment-received',
      emailData: { ...data, date: new Date().toLocaleDateString() },
    });
  }

  /**
   * Send book due reminder notification
   */
  async notifyBookDueReminder(userId: string, bookTitle: string, dueDate: string, renewUrl: string) {
    return this.notify(userId, {
      type: 'LIBRARY',
      title: 'Book Due Reminder',
      message: `"${bookTitle}" is due on ${dueDate}`,
      link: renewUrl,
      sendEmail: true,
      emailTemplate: 'book-due-reminder',
      emailData: { bookTitle, dueDate, renewUrl },
    });
  }

  /**
   * Send leave request status notification
   */
  async notifyLeaveStatus(
    userId: string,
    status: 'APPROVED' | 'REJECTED',
    leaveType: string,
    startDate: string,
    endDate: string,
    remarks?: string
  ) {
    const isApproved = status === 'APPROVED';
    return this.notify(userId, {
      type: 'HR',
      title: `Leave Request ${isApproved ? 'Approved' : 'Not Approved'}`,
      message: `Your ${leaveType} leave from ${startDate} to ${endDate} has been ${status.toLowerCase()}.`,
      sendEmail: true,
      emailTemplate: isApproved ? 'leave-approved' : 'leave-rejected',
      emailData: {
        leaveType,
        startDate,
        endDate,
        remarks,
        rejectionReason: remarks,
      },
    });
  }

  /**
   * Send reservation ready notification
   */
  async notifyReservationReady(userId: string, bookTitle: string, location: string, expiryDate: string) {
    return this.notify(userId, {
      type: 'LIBRARY',
      title: 'Reserved Book Ready',
      message: `"${bookTitle}" is ready for pickup at ${location}`,
      sendEmail: true,
      emailTemplate: 'reservation-ready',
      emailData: { bookTitle, location, expiryDate },
    });
  }
}

export const notificationService = new NotificationService();
