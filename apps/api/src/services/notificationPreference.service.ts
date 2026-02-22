import { prisma } from '@hums/database';
import type { NotificationType } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';
import { emailService } from './email.service.js';
import { smsService } from './sms.service.js';

// Default notification preferences
const DEFAULT_PREFERENCES = {
  emailEnabled: true,
  emailAcademic: true,
  emailFinance: true,
  emailLibrary: true,
  emailAnnouncements: true,
  emailSystem: true,
  smsEnabled: false,
  smsUrgent: true,
  smsPayments: true,
  smsOtp: true,
  pushEnabled: true,
  pushAcademic: true,
  pushFinance: true,
  pushLibrary: true,
  pushAnnouncements: true,
  inAppSound: true,
  inAppDesktop: true,
};

interface UpdatePreferencesInput {
  emailEnabled?: boolean;
  emailAcademic?: boolean;
  emailFinance?: boolean;
  emailLibrary?: boolean;
  emailAnnouncements?: boolean;
  emailSystem?: boolean;
  smsEnabled?: boolean;
  smsUrgent?: boolean;
  smsPayments?: boolean;
  smsOtp?: boolean;
  pushEnabled?: boolean;
  pushAcademic?: boolean;
  pushFinance?: boolean;
  pushLibrary?: boolean;
  pushAnnouncements?: boolean;
  inAppSound?: boolean;
  inAppDesktop?: boolean;
}

type NotificationCategory = 'ACADEMIC' | 'FINANCE' | 'LIBRARY' | 'SYSTEM' | 'HR';
type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

interface NotificationResult {
  sent: boolean;
  channels: NotificationChannel[];
  errors?: string[];
}

export class NotificationPreferenceService {
  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string) {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences if not exists
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          ...DEFAULT_PREFERENCES,
        },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, data: UpdatePreferencesInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Validate SMS enabling requires phone number
    if (data.smsEnabled && !user.phone) {
      throw AppError.badRequest('Phone number required to enable SMS notifications');
    }

    const existingPrefs = await this.getPreferences(userId);

    const preferences = await prisma.notificationPreference.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'NotificationPreference',
      resourceId: preferences.id,
      oldValues: existingPrefs,
      newValues: preferences,
    });

    return preferences;
  }

  /**
   * Check if a notification should be sent based on user preferences
   */
  async shouldNotify(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    // Check if channel is enabled
    if (channel === 'EMAIL' && !preferences.emailEnabled) return false;
    if (channel === 'SMS' && !preferences.smsEnabled) return false;
    if (channel === 'PUSH' && !preferences.pushEnabled) return false;

    // Map notification type to preference fields
    const category = this.getCategory(type);

    if (channel === 'EMAIL') {
      if (category === 'ACADEMIC' && !preferences.emailAcademic) return false;
      if (category === 'FINANCE' && !preferences.emailFinance) return false;
      if (category === 'LIBRARY' && !preferences.emailLibrary) return false;
      // System notifications cannot be disabled
    }

    if (channel === 'PUSH') {
      if (category === 'ACADEMIC' && !preferences.pushAcademic) return false;
      if (category === 'FINANCE' && !preferences.pushFinance) return false;
      if (category === 'LIBRARY' && !preferences.pushLibrary) return false;
    }

    return true;
  }

  /**
   * Get notification category from type
   */
  private getCategory(type: NotificationType): NotificationCategory {
    if (['ACADEMIC'].includes(type)) return 'ACADEMIC';
    if (['FINANCE'].includes(type)) return 'FINANCE';
    if (['LIBRARY'].includes(type)) return 'LIBRARY';
    if (['HR'].includes(type)) return 'HR';
    return 'SYSTEM';
  }

  /**
   * Get available channels for a user based on their preferences and configuration
   */
  async getAvailableChannels(userId: string): Promise<NotificationChannel[]> {
    const preferences = await this.getPreferences(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });

    const channels: NotificationChannel[] = [];

    if (preferences.emailEnabled && user?.email) {
      channels.push('EMAIL');
    }
    if (preferences.smsEnabled && user?.phone) {
      channels.push('SMS');
    }
    if (preferences.pushEnabled) {
      channels.push('PUSH');
    }

    return channels;
  }

  /**
   * Smart notification dispatch - sends to appropriate channels based on preferences
   */
  async sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
    const { userId, type, title, message, link, priority = 'NORMAL' } = payload;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const preferences = await this.getPreferences(userId);
    const sentChannels: NotificationChannel[] = [];
    const errors: string[] = [];

    // Determine which channels to use based on preferences
    const shouldEmail = await this.shouldNotify(userId, type, 'EMAIL');
    const shouldSMS = priority === 'URGENT' && preferences.smsUrgent;
    const shouldPush = await this.shouldNotify(userId, type, 'PUSH');

    // Send via email
    if (shouldEmail && user.email) {
      try {
        await emailService.sendEmail({
          to: user.email,
          subject: title,
          html: `<p>${message}</p>${link ? `<p><a href="${link}">View details</a></p>` : ''}`,
          text: `${message}${link ? `\n\nView details: ${link}` : ''}`,
        });
        sentChannels.push('EMAIL');
      } catch (error) {
        errors.push(`Email failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Send via SMS for urgent notifications
    if (shouldSMS && user.phone) {
      try {
        await smsService.sendSMS({
          to: user.phone,
          message: `${title}: ${message}`,
        });
        sentChannels.push('SMS');
      } catch (error) {
        errors.push(`SMS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Send via Push (placeholder - would integrate with push notification service)
    if (shouldPush) {
      try {
        // TODO: Implement push notification service integration
        // await pushService.send(userId, { title, message, data: payload.data });
        sentChannels.push('PUSH');
      } catch (error) {
        errors.push(`Push failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log the notification in database
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        data: payload.data as object | undefined,
        isRead: false,
      },
    });

    return {
      sent: sentChannels.length > 0,
      channels: sentChannels,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Send bulk notifications (batch process)
   */
  async sendBulkNotification(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL'
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const result = await this.sendNotification({
          userId,
          type,
          title,
          message,
          priority,
        });
        if (result.sent) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ) {
    const { page = 1, limit = 20, unreadOnly = false, type } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) where.isRead = false;
    if (type) where.type = type;

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
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds?: string[]): Promise<number> {
    const where: Record<string, unknown> = { userId };
    if (notificationIds && notificationIds.length > 0) {
      where.id = { in: notificationIds };
    }

    const result = await prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });

    return result.count;
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
   * Delete old notifications (cleanup job)
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    return result.count;
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
