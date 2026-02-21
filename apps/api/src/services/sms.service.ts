import { prisma, Prisma } from '@hums/database';
import type { OTPPurpose, SMSStatus } from '@hums/database';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// ===========================================
// Types
// ===========================================

export interface SMSOptions {
  to: string; // Phone number with country code
  message: string;
  template?: SMSTemplate;
  data?: Record<string, any>;
}

export enum SMSTemplate {
  OTP = 'otp',
  PAYMENT_RECEIVED = 'payment-received',
  PAYMENT_REMINDER = 'payment-reminder',
  BOOK_OVERDUE = 'book-overdue',
  LEAVE_APPROVED = 'leave-approved',
  LEAVE_REJECTED = 'leave-rejected',
  GRADE_PUBLISHED = 'grade-published',
  CLASS_CANCELLED = 'class-cancelled',
  FEE_DUE = 'fee-due',
  REGISTRATION_REMINDER = 'registration-reminder',
  CUSTOM = 'custom',
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export interface DeliveryStatus {
  messageId: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  deliveredAt?: Date;
  error?: string;
}

export interface SMSBalance {
  balance: number;
  currency: string;
}

export interface SMSStats {
  today: number;
  thisMonth: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

// ===========================================
// SMS Templates
// ===========================================

const smsTemplates: Record<SMSTemplate, string> = {
  [SMSTemplate.OTP]: 'Your HUMS verification code is {{code}}. Valid for 5 minutes. Do not share this code.',
  [SMSTemplate.PAYMENT_RECEIVED]: 'Payment of ${{amount}} received. Receipt: {{receiptNo}}. Remaining balance: ${{balance}}. Thank you!',
  [SMSTemplate.PAYMENT_REMINDER]: 'Reminder: ${{amount}} due on {{dueDate}}. Pay on time to avoid late fees. Hormuud University.',
  [SMSTemplate.BOOK_OVERDUE]: 'Library Notice: "{{bookTitle}}" is overdue. Please return immediately to avoid fines. HUMS Library.',
  [SMSTemplate.LEAVE_APPROVED]: 'Your leave request ({{dates}}) has been approved. Enjoy your time off!',
  [SMSTemplate.LEAVE_REJECTED]: 'Your leave request ({{dates}}) has been rejected. Reason: {{reason}}. Contact HR for details.',
  [SMSTemplate.GRADE_PUBLISHED]: 'Your {{courseName}} grade has been published. Login to HUMS portal to view your results.',
  [SMSTemplate.CLASS_CANCELLED]: 'Notice: {{courseName}} class on {{date}} has been cancelled. Check portal for updates.',
  [SMSTemplate.FEE_DUE]: 'Fee Reminder: ${{amount}} due by {{dueDate}}. Avoid registration hold - pay now. HUMS Finance.',
  [SMSTemplate.REGISTRATION_REMINDER]: 'Registration for {{semester}} opens on {{startDate}}. Don\'t miss your preferred classes!',
  [SMSTemplate.CUSTOM]: '{{message}}',
};

// ===========================================
// SMS Service Class
// ===========================================

class SMSService {
  private readonly costPerSMS: number;
  private readonly provider: string;
  private readonly senderId: string; // Used in Africa's Talking integration

  constructor() {
    this.costPerSMS = parseFloat(env.SMS_COST_PER_SMS);
    this.provider = env.SMS_PROVIDER;
    this.senderId = env.SMS_SENDER_ID;
    // Mark as used to satisfy TypeScript
    void this.senderId;
  }

  /**
   * Send a single SMS
   */
  async sendSMS(options: SMSOptions): Promise<SMSResult> {
    const { to, message, template, data } = options;

    // Validate phone number
    const normalizedPhone = this.normalizePhoneNumber(to);
    if (!this.isValidPhoneNumber(normalizedPhone)) {
      return { success: false, error: 'Invalid phone number format' };
    }

    // Render message from template if provided
    const finalMessage = template && template !== SMSTemplate.CUSTOM
      ? this.renderTemplate(template, data || {})
      : message;

    // Create SMS log entry
    const smsLog = await prisma.sMSLog.create({
      data: {
        to: normalizedPhone,
        message: finalMessage,
        template: template || null,
        status: 'PENDING',
        provider: this.provider,
        cost: new Prisma.Decimal(this.costPerSMS),
      },
    });

    try {
      // Send via provider
      const result = await this.sendViaProvider(normalizedPhone, finalMessage);

      // Update log with result
      await prisma.sMSLog.update({
        where: { id: smsLog.id },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          messageId: result.messageId,
          error: result.error,
          sentAt: result.success ? new Date() : null,
        },
      });

      return {
        success: result.success,
        messageId: result.messageId || smsLog.id,
        error: result.error,
        cost: this.costPerSMS,
      };
    } catch (error: any) {
      // Update log with error
      await prisma.sMSLog.update({
        where: { id: smsLog.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: SMSOptions[]): Promise<SMSResult[]> {
    const results: SMSResult[] = [];

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((msg) => this.sendSMS(msg))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Send OTP code
   */
  async sendOTP(
    phone: string,
    purpose: OTPPurpose
  ): Promise<{ success: boolean; error?: string }> {
    const normalizedPhone = this.normalizePhoneNumber(phone);

    // Generate 6-digit OTP
    const code = this.generateOTPCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate any existing OTPs for this phone/purpose
    await prisma.oTPCode.updateMany({
      where: {
        phone: normalizedPhone,
        purpose,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt: new Date(), // Expire immediately
      },
    });

    // Create new OTP
    await prisma.oTPCode.create({
      data: {
        phone: normalizedPhone,
        code,
        purpose,
        expiresAt,
      },
    });

    // Send SMS
    const result = await this.sendSMS({
      to: normalizedPhone,
      message: '',
      template: SMSTemplate.OTP,
      data: { code },
    });

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    phone: string,
    code: string,
    purpose: OTPPurpose
  ): Promise<{ success: boolean; error?: string }> {
    const normalizedPhone = this.normalizePhoneNumber(phone);

    const otpRecord = await prisma.oTPCode.findFirst({
      where: {
        phone: normalizedPhone,
        purpose,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return { success: false, error: 'No valid OTP found. Please request a new code.' };
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      return { success: false, error: 'Too many attempts. Please request a new code.' };
    }

    // Increment attempts
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify code
    if (otpRecord.code !== code) {
      return { success: false, error: 'Invalid code. Please try again.' };
    }

    // Mark as verified
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return { success: true };
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    const log = await prisma.sMSLog.findFirst({
      where: {
        OR: [{ id: messageId }, { messageId }],
      },
    });

    if (!log) {
      throw AppError.notFound('SMS not found');
    }

    return {
      messageId: log.messageId || log.id,
      status: log.status as DeliveryStatus['status'],
      deliveredAt: log.deliveredAt || undefined,
      error: log.error || undefined,
    };
  }

  /**
   * Get SMS balance (simulated for development)
   */
  async getBalance(): Promise<SMSBalance> {
    // In production, this would call the SMS provider's API
    // For development, return simulated balance
    const totalSent = await prisma.sMSLog.count();
    const simulatedBalance = Math.max(10000 - totalSent, 0);

    return {
      balance: simulatedBalance,
      currency: 'SMS',
    };
  }

  /**
   * Get SMS statistics
   */
  async getStats(): Promise<SMSStats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, thisMonth, delivered, failed] = await Promise.all([
      prisma.sMSLog.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      prisma.sMSLog.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.sMSLog.count({
        where: { status: 'DELIVERED' },
      }),
      prisma.sMSLog.count({
        where: { status: 'FAILED' },
      }),
    ]);

    const total = delivered + failed;
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 100;

    return {
      today,
      thisMonth,
      delivered,
      failed,
      deliveryRate: Math.round(deliveryRate * 10) / 10,
    };
  }

  /**
   * Get recent SMS logs
   */
  async getLogs(options: {
    page?: number;
    limit?: number;
    status?: SMSStatus;
    phone?: string;
  }) {
    const { page = 1, limit = 20, status, phone } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (phone) where.to = { contains: phone };

    const [logs, total] = await Promise.all([
      prisma.sMSLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sMSLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Render template with data
   */
  renderTemplate(template: SMSTemplate, data: Record<string, any>): string {
    let message = smsTemplates[template];
    if (!message) {
      throw AppError.badRequest(`Unknown SMS template: ${template}`);
    }

    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return message;
  }

  // ===========================================
  // Private Methods
  // ===========================================

  /**
   * Normalize phone number to international format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If starts with 0, assume Somalia and add +252
    if (normalized.startsWith('0')) {
      normalized = '+252' + normalized.substring(1);
    }

    // If no +, assume it's missing country code
    if (!normalized.startsWith('+')) {
      // If 9 digits (Somalia mobile without country code)
      if (normalized.length === 9 && normalized.match(/^[67]/)) {
        normalized = '+252' + normalized;
      }
    }

    return normalized;
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Somalia phone numbers: +252 6X XXXX XXX or +252 7X XXXX XXX
    const somaliaRegex = /^\+252[67]\d{8}$/;

    // Also accept other international formats
    const internationalRegex = /^\+\d{10,15}$/;

    return somaliaRegex.test(phone) || internationalRegex.test(phone);
  }

  /**
   * Generate 6-digit OTP code
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send SMS via configured provider
   * In production, this would integrate with actual SMS providers
   */
  private async sendViaProvider(
    to: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // For development/testing, simulate sending
    if (env.NODE_ENV === 'development' || !env.SMS_API_KEY) {
      console.log(`[SMS DEV] To: ${to}`);
      console.log(`[SMS DEV] Message: ${message}`);

      // Simulate success with 95% probability
      const success = Math.random() > 0.05;
      return {
        success,
        messageId: success ? `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined,
        error: success ? undefined : 'Simulated failure',
      };
    }

    // In production, integrate with actual SMS provider
    switch (this.provider) {
      case 'africa_talking':
        return this.sendViaAfricasTalking(to, message);
      default:
        return { success: false, error: 'SMS provider not configured' };
    }
  }

  /**
   * Send via Africa's Talking API
   */
  private async sendViaAfricasTalking(
    _to: string,
    _message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Africa's Talking integration would go here
    // For now, return simulated response
    try {
      // const response = await fetch('https://api.africastalking.com/version1/messaging', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/x-www-form-urlencoded',
      //     'apiKey': env.AT_API_KEY!,
      //   },
      //   body: new URLSearchParams({
      //     username: env.AT_USERNAME!,
      //     to,
      //     message,
      //     from: this.senderId,
      //   }),
      // });
      // const data = await response.json();
      // return { success: true, messageId: data.SMSMessageData.Recipients[0].messageId };

      return {
        success: true,
        messageId: `AT-${Date.now()}`,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // Convenience Methods for Common SMS
  // ===========================================

  async sendPaymentReceived(
    phone: string,
    amount: number,
    receiptNo: string,
    balance: number
  ): Promise<SMSResult> {
    return this.sendSMS({
      to: phone,
      message: '',
      template: SMSTemplate.PAYMENT_RECEIVED,
      data: { amount: amount.toFixed(2), receiptNo, balance: balance.toFixed(2) },
    });
  }

  async sendPaymentReminder(
    phone: string,
    amount: number,
    dueDate: string
  ): Promise<SMSResult> {
    return this.sendSMS({
      to: phone,
      message: '',
      template: SMSTemplate.PAYMENT_REMINDER,
      data: { amount: amount.toFixed(2), dueDate },
    });
  }

  async sendBookOverdue(phone: string, bookTitle: string): Promise<SMSResult> {
    return this.sendSMS({
      to: phone,
      message: '',
      template: SMSTemplate.BOOK_OVERDUE,
      data: { bookTitle },
    });
  }

  async sendLeaveApproved(phone: string, dates: string): Promise<SMSResult> {
    return this.sendSMS({
      to: phone,
      message: '',
      template: SMSTemplate.LEAVE_APPROVED,
      data: { dates },
    });
  }

  async sendGradePublished(phone: string, courseName: string): Promise<SMSResult> {
    return this.sendSMS({
      to: phone,
      message: '',
      template: SMSTemplate.GRADE_PUBLISHED,
      data: { courseName },
    });
  }
}

export const smsService = new SMSService();
