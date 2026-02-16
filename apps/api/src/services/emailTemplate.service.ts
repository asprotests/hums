import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import Handlebars from 'handlebars';

// Email template names
export type EmailTemplate =
  // Auth
  | 'welcome'
  | 'password-reset'
  | 'password-changed'
  // Admission
  | 'application-received'
  | 'application-approved'
  | 'application-rejected'
  // Academic
  | 'enrollment-confirmed'
  | 'grades-published'
  | 'attendance-warning'
  // Finance
  | 'invoice-generated'
  | 'payment-received'
  | 'payment-reminder'
  | 'payment-overdue'
  // HR
  | 'leave-request-submitted'
  | 'leave-approved'
  | 'leave-rejected'
  | 'payslip-ready'
  | 'contract-expiring'
  // Library
  | 'book-due-reminder'
  | 'book-overdue'
  | 'reservation-ready'
  // General
  | 'announcement'
  | 'custom';

export interface EmailTemplateConfig {
  id: string;
  name: string;
  subject: string;
  subjectLocal?: string | null;
  bodyHtml: string;
  bodyText: string;
  bodyHtmlLocal?: string | null;
  bodyTextLocal?: string | null;
  variables: string[];
  category?: string | null;
  isActive: boolean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// Default templates
const DEFAULT_TEMPLATES: Record<EmailTemplate, Omit<EmailTemplateConfig, 'id'>> = {
  // Auth templates
  'welcome': {
    name: 'welcome',
    subject: 'Welcome to Hormuud University',
    subjectLocal: 'Ku soo dhawoow Jaamacadda Hormuud',
    bodyHtml: `
      <h2>Welcome to Hormuud University!</h2>
      <p>Dear {{firstName}},</p>
      <p>Your account has been created successfully.</p>
      <p><strong>Login Details:</strong></p>
      <ul>
        <li>Email: {{email}}</li>
        <li>Temporary Password: {{tempPassword}}</li>
      </ul>
      <p>Please change your password after first login.</p>
      <a href="{{loginUrl}}" class="button">Login Now</a>
    `,
    bodyText: 'Welcome to Hormuud University!\n\nDear {{firstName}},\n\nYour account has been created.\nEmail: {{email}}\nTemporary Password: {{tempPassword}}\n\nPlease login at {{loginUrl}}',
    bodyHtmlLocal: '<h2>Ku soo dhawoow Jaamacadda Hormuud!</h2><p>{{firstName}} sharaf,</p><p>Akoonkaaga si guul leh ayaa loo sameeyay.</p>',
    bodyTextLocal: 'Ku soo dhawoow Jaamacadda Hormuud!\n\n{{firstName}} sharaf,\nAkoonkaaga si guul leh ayaa loo sameeyay.',
    variables: ['firstName', 'email', 'tempPassword', 'loginUrl'],
    category: 'auth',
    isActive: true,
  },
  'password-reset': {
    name: 'password-reset',
    subject: 'Reset Your Password',
    subjectLocal: 'Dib u Dejiso Furaha Sirta Ah',
    bodyHtml: `
      <h2>Password Reset Request</h2>
      <p>Dear {{firstName}},</p>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      <a href="{{resetUrl}}" class="button">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    bodyText: 'Password Reset Request\n\nDear {{firstName}},\n\nClick this link to reset your password: {{resetUrl}}\n\nThis link expires in 1 hour.',
    variables: ['firstName', 'resetUrl'],
    category: 'auth',
    isActive: true,
  },
  'password-changed': {
    name: 'password-changed',
    subject: 'Your Password Has Been Changed',
    bodyHtml: `
      <h2>Password Changed</h2>
      <p>Dear {{firstName}},</p>
      <p>Your password has been successfully changed.</p>
      <p>If you did not make this change, please contact support immediately.</p>
    `,
    bodyText: 'Your password has been changed. If you did not make this change, contact support.',
    variables: ['firstName'],
    category: 'auth',
    isActive: true,
  },

  // Admission templates
  'application-received': {
    name: 'application-received',
    subject: 'Application Received - {{applicationNo}}',
    bodyHtml: `
      <h2>Application Received</h2>
      <p>Dear {{firstName}},</p>
      <p>We have received your admission application.</p>
      <p><strong>Application Number:</strong> {{applicationNo}}</p>
      <p><strong>Program:</strong> {{programName}}</p>
      <p>We will review your application and notify you of our decision.</p>
    `,
    bodyText: 'Application Received\n\nDear {{firstName}},\n\nApplication No: {{applicationNo}}\nProgram: {{programName}}',
    variables: ['firstName', 'applicationNo', 'programName'],
    category: 'admission',
    isActive: true,
  },
  'application-approved': {
    name: 'application-approved',
    subject: 'Congratulations! Your Application Has Been Approved',
    bodyHtml: `
      <h2>Congratulations!</h2>
      <p>Dear {{firstName}},</p>
      <p>We are pleased to inform you that your application has been <strong>approved</strong>.</p>
      <p><strong>Program:</strong> {{programName}}</p>
      <p><strong>Student ID:</strong> {{studentId}}</p>
      <p>Please login to complete your enrollment process.</p>
      <a href="{{loginUrl}}" class="button">Login to Enroll</a>
    `,
    bodyText: 'Congratulations!\n\nYour application has been approved.\nProgram: {{programName}}\nStudent ID: {{studentId}}',
    variables: ['firstName', 'programName', 'studentId', 'loginUrl'],
    category: 'admission',
    isActive: true,
  },
  'application-rejected': {
    name: 'application-rejected',
    subject: 'Update on Your Application',
    bodyHtml: `
      <h2>Application Status Update</h2>
      <p>Dear {{firstName}},</p>
      <p>After careful review, we regret to inform you that your application has not been approved at this time.</p>
      <p><strong>Reason:</strong> {{rejectionReason}}</p>
      <p>You may reapply for future semesters.</p>
    `,
    bodyText: 'Dear {{firstName}},\n\nYour application was not approved.\nReason: {{rejectionReason}}',
    variables: ['firstName', 'rejectionReason'],
    category: 'admission',
    isActive: true,
  },

  // Academic templates
  'enrollment-confirmed': {
    name: 'enrollment-confirmed',
    subject: 'Enrollment Confirmed - {{semesterName}}',
    bodyHtml: `
      <h2>Enrollment Confirmed</h2>
      <p>Dear {{firstName}},</p>
      <p>Your enrollment for <strong>{{semesterName}}</strong> has been confirmed.</p>
      <p><strong>Enrolled Courses:</strong></p>
      <ul>{{courseList}}</ul>
      <p>Total Credits: {{totalCredits}}</p>
    `,
    bodyText: 'Enrollment confirmed for {{semesterName}}.\n\nCourses: {{courseList}}\nTotal Credits: {{totalCredits}}',
    variables: ['firstName', 'semesterName', 'courseList', 'totalCredits'],
    category: 'academic',
    isActive: true,
  },
  'grades-published': {
    name: 'grades-published',
    subject: 'Grades Published - {{courseName}}',
    bodyHtml: `
      <h2>Grades Published</h2>
      <p>Dear {{firstName}},</p>
      <p>Grades for <strong>{{courseName}}</strong> have been published.</p>
      <p>Login to view your grades.</p>
      <a href="{{gradesUrl}}" class="button">View Grades</a>
    `,
    bodyText: 'Grades for {{courseName}} have been published. Login to view your grades.',
    variables: ['firstName', 'courseName', 'gradesUrl'],
    category: 'academic',
    isActive: true,
  },
  'attendance-warning': {
    name: 'attendance-warning',
    subject: 'Attendance Warning - {{courseName}}',
    bodyHtml: `
      <h2>Attendance Warning</h2>
      <p>Dear {{firstName}},</p>
      <p>Your attendance in <strong>{{courseName}}</strong> is below the required threshold.</p>
      <p><strong>Current Attendance:</strong> {{attendanceRate}}%</p>
      <p><strong>Required:</strong> {{requiredRate}}%</p>
      <p>Please improve your attendance to avoid academic consequences.</p>
    `,
    bodyText: 'Attendance Warning for {{courseName}}\n\nCurrent: {{attendanceRate}}%\nRequired: {{requiredRate}}%',
    variables: ['firstName', 'courseName', 'attendanceRate', 'requiredRate'],
    category: 'academic',
    isActive: true,
  },

  // Finance templates
  'invoice-generated': {
    name: 'invoice-generated',
    subject: 'New Invoice Generated - {{invoiceNo}}',
    bodyHtml: `
      <h2>Invoice Generated</h2>
      <p>Dear {{firstName}},</p>
      <p>A new invoice has been generated for your account.</p>
      <table>
        <tr><td>Invoice No:</td><td><strong>{{invoiceNo}}</strong></td></tr>
        <tr><td>Amount:</td><td><strong>{{amount}}</strong></td></tr>
        <tr><td>Due Date:</td><td>{{dueDate}}</td></tr>
      </table>
      <a href="{{paymentUrl}}" class="button">Pay Now</a>
    `,
    bodyText: 'Invoice Generated\n\nInvoice No: {{invoiceNo}}\nAmount: {{amount}}\nDue Date: {{dueDate}}',
    variables: ['firstName', 'invoiceNo', 'amount', 'dueDate', 'paymentUrl'],
    category: 'finance',
    isActive: true,
  },
  'payment-received': {
    name: 'payment-received',
    subject: 'Payment Confirmation - {{receiptNo}}',
    bodyHtml: `
      <h2>Payment Received</h2>
      <p>Dear {{firstName}},</p>
      <p>We have received your payment.</p>
      <table>
        <tr><td>Receipt No:</td><td><strong>{{receiptNo}}</strong></td></tr>
        <tr><td>Amount:</td><td><strong>{{amount}}</strong></td></tr>
        <tr><td>Date:</td><td>{{date}}</td></tr>
        <tr><td>Method:</td><td>{{paymentMethod}}</td></tr>
      </table>
      <p>Remaining Balance: {{balance}}</p>
    `,
    bodyText: 'Payment Received\n\nReceipt No: {{receiptNo}}\nAmount: {{amount}}\nBalance: {{balance}}',
    variables: ['firstName', 'receiptNo', 'amount', 'date', 'paymentMethod', 'balance'],
    category: 'finance',
    isActive: true,
  },
  'payment-reminder': {
    name: 'payment-reminder',
    subject: 'Payment Reminder - Due {{dueDate}}',
    bodyHtml: `
      <h2>Payment Reminder</h2>
      <p>Dear {{firstName}},</p>
      <p>This is a reminder that you have an outstanding balance.</p>
      <table>
        <tr><td>Amount Due:</td><td><strong>{{amount}}</strong></td></tr>
        <tr><td>Due Date:</td><td>{{dueDate}}</td></tr>
      </table>
      <p>Please make payment to avoid late fees.</p>
      <a href="{{paymentUrl}}" class="button">Pay Now</a>
    `,
    bodyText: 'Payment Reminder\n\nAmount: {{amount}}\nDue Date: {{dueDate}}',
    variables: ['firstName', 'amount', 'dueDate', 'paymentUrl'],
    category: 'finance',
    isActive: true,
  },
  'payment-overdue': {
    name: 'payment-overdue',
    subject: 'URGENT: Payment Overdue',
    bodyHtml: `
      <h2>Payment Overdue</h2>
      <p>Dear {{firstName}},</p>
      <p>Your payment is now <strong>overdue</strong>. Please make payment immediately to avoid service disruption.</p>
      <table>
        <tr><td>Amount Due:</td><td><strong>{{amount}}</strong></td></tr>
        <tr><td>Days Overdue:</td><td>{{daysOverdue}}</td></tr>
        <tr><td>Late Fee:</td><td>{{lateFee}}</td></tr>
      </table>
      <a href="{{paymentUrl}}" class="button">Pay Now</a>
    `,
    bodyText: 'URGENT: Payment Overdue\n\nAmount: {{amount}}\nDays Overdue: {{daysOverdue}}',
    variables: ['firstName', 'amount', 'daysOverdue', 'lateFee', 'paymentUrl'],
    category: 'finance',
    isActive: true,
  },

  // HR templates
  'leave-request-submitted': {
    name: 'leave-request-submitted',
    subject: 'Leave Request Submitted',
    bodyHtml: `
      <h2>Leave Request Submitted</h2>
      <p>Dear {{firstName}},</p>
      <p>Your leave request has been submitted for approval.</p>
      <table>
        <tr><td>Leave Type:</td><td>{{leaveType}}</td></tr>
        <tr><td>From:</td><td>{{startDate}}</td></tr>
        <tr><td>To:</td><td>{{endDate}}</td></tr>
        <tr><td>Days:</td><td>{{totalDays}}</td></tr>
      </table>
      <p>You will be notified once it is reviewed.</p>
    `,
    bodyText: 'Leave Request Submitted\n\nType: {{leaveType}}\nDates: {{startDate}} - {{endDate}}',
    variables: ['firstName', 'leaveType', 'startDate', 'endDate', 'totalDays'],
    category: 'hr',
    isActive: true,
  },
  'leave-approved': {
    name: 'leave-approved',
    subject: 'Leave Request Approved',
    bodyHtml: `
      <h2>Leave Request Approved</h2>
      <p>Dear {{firstName}},</p>
      <p>Your leave request has been <strong>approved</strong>.</p>
      <table>
        <tr><td>Leave Type:</td><td>{{leaveType}}</td></tr>
        <tr><td>From:</td><td>{{startDate}}</td></tr>
        <tr><td>To:</td><td>{{endDate}}</td></tr>
      </table>
      {{#if remarks}}<p>Remarks: {{remarks}}</p>{{/if}}
    `,
    bodyText: 'Leave Request Approved\n\nType: {{leaveType}}\nDates: {{startDate}} - {{endDate}}',
    variables: ['firstName', 'leaveType', 'startDate', 'endDate', 'remarks'],
    category: 'hr',
    isActive: true,
  },
  'leave-rejected': {
    name: 'leave-rejected',
    subject: 'Leave Request Not Approved',
    bodyHtml: `
      <h2>Leave Request Not Approved</h2>
      <p>Dear {{firstName}},</p>
      <p>Your leave request has been <strong>not approved</strong>.</p>
      <table>
        <tr><td>Leave Type:</td><td>{{leaveType}}</td></tr>
        <tr><td>From:</td><td>{{startDate}}</td></tr>
        <tr><td>To:</td><td>{{endDate}}</td></tr>
      </table>
      <p>Reason: {{rejectionReason}}</p>
    `,
    bodyText: 'Leave Request Not Approved\n\nReason: {{rejectionReason}}',
    variables: ['firstName', 'leaveType', 'startDate', 'endDate', 'rejectionReason'],
    category: 'hr',
    isActive: true,
  },
  'payslip-ready': {
    name: 'payslip-ready',
    subject: 'Payslip Ready - {{month}} {{year}}',
    bodyHtml: `
      <h2>Payslip Ready</h2>
      <p>Dear {{firstName}},</p>
      <p>Your payslip for <strong>{{month}} {{year}}</strong> is now available.</p>
      <table>
        <tr><td>Net Salary:</td><td><strong>{{netSalary}}</strong></td></tr>
      </table>
      <a href="{{payslipUrl}}" class="button">View Payslip</a>
    `,
    bodyText: 'Payslip Ready for {{month}} {{year}}\n\nNet Salary: {{netSalary}}',
    variables: ['firstName', 'month', 'year', 'netSalary', 'payslipUrl'],
    category: 'hr',
    isActive: true,
  },
  'contract-expiring': {
    name: 'contract-expiring',
    subject: 'Contract Expiring Soon',
    bodyHtml: `
      <h2>Contract Expiring</h2>
      <p>Dear {{firstName}},</p>
      <p>Your employment contract will expire on <strong>{{expiryDate}}</strong>.</p>
      <p>Please contact HR to discuss renewal.</p>
    `,
    bodyText: 'Your contract will expire on {{expiryDate}}. Contact HR for renewal.',
    variables: ['firstName', 'expiryDate'],
    category: 'hr',
    isActive: true,
  },

  // Library templates
  'book-due-reminder': {
    name: 'book-due-reminder',
    subject: 'Book Due Reminder - {{bookTitle}}',
    bodyHtml: `
      <h2>Book Due Reminder</h2>
      <p>Dear {{firstName}},</p>
      <p>This is a reminder that the following book is due soon:</p>
      <table>
        <tr><td>Book:</td><td><strong>{{bookTitle}}</strong></td></tr>
        <tr><td>Due Date:</td><td>{{dueDate}}</td></tr>
      </table>
      <p>Please return or renew the book to avoid late fees.</p>
      <a href="{{renewUrl}}" class="button">Renew Book</a>
    `,
    bodyText: 'Book Due Reminder\n\nBook: {{bookTitle}}\nDue Date: {{dueDate}}',
    variables: ['firstName', 'bookTitle', 'dueDate', 'renewUrl'],
    category: 'library',
    isActive: true,
  },
  'book-overdue': {
    name: 'book-overdue',
    subject: 'OVERDUE: {{bookTitle}}',
    bodyHtml: `
      <h2>Book Overdue</h2>
      <p>Dear {{firstName}},</p>
      <p>The following book is <strong>overdue</strong>:</p>
      <table>
        <tr><td>Book:</td><td><strong>{{bookTitle}}</strong></td></tr>
        <tr><td>Due Date:</td><td>{{dueDate}}</td></tr>
        <tr><td>Days Overdue:</td><td>{{daysOverdue}}</td></tr>
        <tr><td>Late Fee:</td><td>{{lateFee}}</td></tr>
      </table>
      <p>Please return the book immediately.</p>
    `,
    bodyText: 'Book Overdue\n\nBook: {{bookTitle}}\nDays Overdue: {{daysOverdue}}\nLate Fee: {{lateFee}}',
    variables: ['firstName', 'bookTitle', 'dueDate', 'daysOverdue', 'lateFee'],
    category: 'library',
    isActive: true,
  },
  'reservation-ready': {
    name: 'reservation-ready',
    subject: 'Your Reserved Book is Ready - {{bookTitle}}',
    bodyHtml: `
      <h2>Reservation Ready</h2>
      <p>Dear {{firstName}},</p>
      <p>The book you reserved is now available for pickup:</p>
      <table>
        <tr><td>Book:</td><td><strong>{{bookTitle}}</strong></td></tr>
        <tr><td>Location:</td><td>{{location}}</td></tr>
        <tr><td>Pickup By:</td><td>{{expiryDate}}</td></tr>
      </table>
      <p>Please pick up the book before the expiry date.</p>
    `,
    bodyText: 'Your reserved book {{bookTitle}} is ready for pickup at {{location}}. Pick up by {{expiryDate}}.',
    variables: ['firstName', 'bookTitle', 'location', 'expiryDate'],
    category: 'library',
    isActive: true,
  },

  // General templates
  'announcement': {
    name: 'announcement',
    subject: '{{announcementTitle}}',
    bodyHtml: `
      <h2>{{announcementTitle}}</h2>
      {{{announcementContent}}}
    `,
    bodyText: '{{announcementTitle}}\n\n{{announcementContent}}',
    variables: ['announcementTitle', 'announcementContent'],
    category: 'general',
    isActive: true,
  },
  'custom': {
    name: 'custom',
    subject: '{{subject}}',
    bodyHtml: '{{{content}}}',
    bodyText: '{{content}}',
    variables: ['subject', 'content'],
    category: 'general',
    isActive: true,
  },
};

// Base email template with styles
const BASE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
    .logo { max-height: 50px; }
    .content { padding: 30px 20px; background: #ffffff; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f8f9fa; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    h2 { color: #1a365d; margin-top: 0; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hormuud University</h1>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      <p>Hormuud University, Mogadishu, Somalia</p>
      <p>&copy; {{year}} All rights reserved</p>
    </div>
  </div>
</body>
</html>
`;

class EmailTemplateService {
  /**
   * Get all templates
   */
  async getTemplates(filters?: { category?: string; isActive?: boolean }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.emailTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get template by name
   */
  async getTemplate(name: EmailTemplate): Promise<EmailTemplateConfig> {
    // First check database
    const dbTemplate = await prisma.emailTemplate.findUnique({
      where: { name },
    });

    if (dbTemplate) {
      return dbTemplate as EmailTemplateConfig;
    }

    // Fall back to default template
    const defaultTemplate = DEFAULT_TEMPLATES[name];
    if (!defaultTemplate) {
      throw AppError.notFound(`Template "${name}" not found`);
    }

    // Save default to database for future customization
    const created = await prisma.emailTemplate.create({
      data: defaultTemplate,
    });

    return created as EmailTemplateConfig;
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    data: {
      subject?: string;
      subjectLocal?: string;
      bodyHtml?: string;
      bodyText?: string;
      bodyHtmlLocal?: string;
      bodyTextLocal?: string;
      isActive?: boolean;
    }
  ): Promise<EmailTemplateConfig> {
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw AppError.notFound('Template not found');
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data,
    });

    return updated as EmailTemplateConfig;
  }

  /**
   * Reset template to default
   */
  async resetToDefault(name: EmailTemplate): Promise<EmailTemplateConfig> {
    const defaultTemplate = DEFAULT_TEMPLATES[name];
    if (!defaultTemplate) {
      throw AppError.notFound(`No default template for "${name}"`);
    }

    const updated = await prisma.emailTemplate.upsert({
      where: { name },
      update: defaultTemplate,
      create: defaultTemplate,
    });

    return updated as EmailTemplateConfig;
  }

  /**
   * Render a template with data
   */
  async renderTemplate(
    name: EmailTemplate,
    data: Record<string, any>,
    locale: 'en' | 'so' = 'en'
  ): Promise<RenderedEmail> {
    const template = await this.getTemplate(name);

    // Add common data
    const fullData = {
      ...data,
      year: new Date().getFullYear(),
    };

    // Compile templates
    const subjectTemplate = Handlebars.compile(
      locale === 'so' && template.subjectLocal ? template.subjectLocal : template.subject
    );

    const bodyHtmlTemplate = Handlebars.compile(
      locale === 'so' && template.bodyHtmlLocal ? template.bodyHtmlLocal : template.bodyHtml
    );

    const bodyTextTemplate = Handlebars.compile(
      locale === 'so' && template.bodyTextLocal ? template.bodyTextLocal : template.bodyText
    );

    // Render body content
    const bodyContent = bodyHtmlTemplate(fullData);

    // Wrap in base template
    const baseTemplate = Handlebars.compile(BASE_TEMPLATE);
    const html = baseTemplate({ ...fullData, body: bodyContent });

    return {
      subject: subjectTemplate(fullData),
      html,
      text: bodyTextTemplate(fullData),
    };
  }

  /**
   * Preview template without sending
   */
  async previewTemplate(
    name: EmailTemplate,
    data?: Record<string, any>
  ): Promise<RenderedEmail & { variables: string[] }> {
    const template = await this.getTemplate(name);

    // Use sample data if not provided
    const sampleData: Record<string, any> = data || {};
    for (const variable of template.variables) {
      if (!(variable in sampleData)) {
        sampleData[variable] = `{{${variable}}}`;
      }
    }

    const rendered = await this.renderTemplate(name, sampleData);

    return {
      ...rendered,
      variables: template.variables,
    };
  }

  /**
   * Seed default templates
   */
  async seedDefaultTemplates(): Promise<void> {
    for (const [name, template] of Object.entries(DEFAULT_TEMPLATES)) {
      await prisma.emailTemplate.upsert({
        where: { name },
        update: {},
        create: template,
      });
    }
  }
}

export const emailTemplateService = new EmailTemplateService();
