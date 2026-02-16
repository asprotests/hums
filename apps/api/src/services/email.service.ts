import nodemailer from 'nodemailer';
import { prisma } from '@hums/database';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { emailTemplateService, type EmailTemplate } from './emailTemplate.service.js';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: EmailTemplate;
  data?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  scheduledAt?: Date;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create reusable transporter
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT, 10),
      secure: env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    });
  }

  /**
   * Send an email immediately
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      let html = options.html;
      let text = options.text;
      let subject = options.subject;

      // If template is provided, render it
      if (options.template) {
        const rendered = await emailTemplateService.renderTemplate(
          options.template,
          options.data || {}
        );
        html = rendered.html;
        text = rendered.text;
        subject = rendered.subject;
      }

      // Log the email
      const emailLog = await prisma.emailLog.create({
        data: {
          to: recipients,
          cc: options.cc || [],
          bcc: options.bcc || [],
          subject,
          template: options.template,
          bodyHtml: html,
          status: 'PROCESSING',
        },
      });

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
        to: recipients.join(', '),
        cc: options.cc?.join(', '),
        bcc: options.bcc?.join(', '),
        replyTo: options.replyTo || env.EMAIL_REPLY_TO,
        subject,
        html,
        text,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      // Update log with success
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          attempts: 1,
        },
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error('Email send failed:', error);

      // Log failure
      await prisma.emailLog.create({
        data: {
          to: Array.isArray(options.to) ? options.to : [options.to],
          cc: options.cc || [],
          bcc: options.bcc || [],
          subject: options.subject,
          template: options.template,
          status: 'FAILED',
          error: error.message,
          attempts: 1,
        },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
    }

    return results;
  }

  /**
   * Schedule an email for later
   */
  async scheduleEmail(options: EmailOptions): Promise<{ id: string; scheduledAt: Date }> {
    if (!options.scheduledAt) {
      throw AppError.badRequest('scheduledAt is required for scheduled emails');
    }

    const scheduled = await prisma.scheduledEmail.create({
      data: {
        options: options as any,
        scheduledAt: options.scheduledAt,
        status: 'PENDING',
      },
    });

    return {
      id: scheduled.id,
      scheduledAt: scheduled.scheduledAt,
    };
  }

  /**
   * Cancel a scheduled email
   */
  async cancelScheduledEmail(emailId: string): Promise<void> {
    const scheduled = await prisma.scheduledEmail.findUnique({
      where: { id: emailId },
    });

    if (!scheduled) {
      throw AppError.notFound('Scheduled email not found');
    }

    if (scheduled.status !== 'PENDING') {
      throw AppError.badRequest('Can only cancel pending emails');
    }

    await prisma.scheduledEmail.delete({
      where: { id: emailId },
    });
  }

  /**
   * Process scheduled emails (called by worker/cron)
   */
  async processScheduledEmails(): Promise<number> {
    const dueEmails = await prisma.scheduledEmail.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      take: 50, // Process in batches
    });

    let processed = 0;

    for (const email of dueEmails) {
      try {
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'PROCESSING' },
        });

        const options = email.options as unknown as EmailOptions;
        const result = await this.sendEmail(options);

        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: {
            status: result.success ? 'SENT' : 'FAILED',
            processedAt: new Date(),
            error: result.error,
          },
        });

        processed++;
      } catch (error: any) {
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: {
            status: 'FAILED',
            error: error.message,
          },
        });
      }
    }

    return processed;
  }

  /**
   * Get queue statistics
   */
  async getQueueStatus(): Promise<QueueStats> {
    const [pending, processing, sent, failed] = await Promise.all([
      prisma.emailLog.count({ where: { status: 'PENDING' } }),
      prisma.emailLog.count({ where: { status: 'PROCESSING' } }),
      prisma.emailLog.count({ where: { status: 'SENT' } }),
      prisma.emailLog.count({ where: { status: 'FAILED' } }),
    ]);

    return { pending, processing, sent, failed };
  }

  /**
   * Get email logs
   */
  async getEmailLogs(filters: {
    status?: string;
    template?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.template) {
      where.template = filters.template;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string, template?: EmailTemplate): Promise<EmailResult> {
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      email: to,
      studentId: 'HU/2025/TEST',
      amount: '1000.00',
      dueDate: new Date().toLocaleDateString(),
      receiptNo: 'RCP-TEST-001',
      loginUrl: 'https://hums.hormuud.edu.so/login',
      tempPassword: 'TempPass123!',
    };

    if (template) {
      return this.sendEmail({
        to,
        subject: `[TEST] ${template}`,
        template,
        data: testData,
      });
    }

    return this.sendEmail({
      to,
      subject: 'HUMS Test Email',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from HUMS.</p>
        <p>If you received this, email configuration is working correctly.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
      text: 'This is a test email from HUMS. If you received this, email configuration is working correctly.',
    });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

export const emailService = new EmailService();
