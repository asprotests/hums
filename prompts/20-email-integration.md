# Prompt 20: Email Integration & Notifications

## Objective
Implement email service for system notifications, templates, and scheduled emails.

## Location in Project
Place this file in: `hums-v2-project/prompts/20-email-integration.md`

---

## Backend Implementation

### 1. Email Service (src/services/email.service.ts)
```typescript
interface EmailOptions {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
  attachments?: EmailAttachment[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  scheduledAt?: DateTime;
}

interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

enum EmailTemplate {
  // Auth
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password-reset',
  PASSWORD_CHANGED = 'password-changed',
  
  // Admission
  APPLICATION_RECEIVED = 'application-received',
  APPLICATION_APPROVED = 'application-approved',
  APPLICATION_REJECTED = 'application-rejected',
  
  // Academic
  ENROLLMENT_CONFIRMED = 'enrollment-confirmed',
  GRADES_PUBLISHED = 'grades-published',
  ATTENDANCE_WARNING = 'attendance-warning',
  
  // Finance
  INVOICE_GENERATED = 'invoice-generated',
  PAYMENT_RECEIVED = 'payment-received',
  PAYMENT_REMINDER = 'payment-reminder',
  PAYMENT_OVERDUE = 'payment-overdue',
  
  // HR
  LEAVE_REQUEST_SUBMITTED = 'leave-request-submitted',
  LEAVE_APPROVED = 'leave-approved',
  LEAVE_REJECTED = 'leave-rejected',
  PAYSLIP_READY = 'payslip-ready',
  CONTRACT_EXPIRING = 'contract-expiring',
  
  // Library
  BOOK_DUE_REMINDER = 'book-due-reminder',
  BOOK_OVERDUE = 'book-overdue',
  RESERVATION_READY = 'reservation-ready',
  
  // General
  ANNOUNCEMENT = 'announcement',
  CUSTOM = 'custom'
}

// Core methods
sendEmail(options: EmailOptions): Promise<EmailResult>
sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]>
scheduleEmail(options: EmailOptions): Promise<ScheduledEmail>
cancelScheduledEmail(emailId: string): void

// Template methods
renderTemplate(template: EmailTemplate, data: Record<string, any>): string
previewEmail(template: EmailTemplate, data: Record<string, any>): EmailPreview
```

### 2. Email Template Service (src/services/emailTemplate.service.ts)
```typescript
interface EmailTemplateConfig {
  id: string;
  name: EmailTemplate;
  subject: string;
  subjectLocal?: string;        // Somali subject
  bodyHtml: string;
  bodyText: string;
  bodyHtmlLocal?: string;
  bodyTextLocal?: string;
  variables: string[];          // Available variables
  isActive: boolean;
}

getTemplate(name: EmailTemplate): EmailTemplateConfig
getTemplates(): EmailTemplateConfig[]
updateTemplate(id: string, data: UpdateTemplateDto): EmailTemplateConfig
resetToDefault(name: EmailTemplate): EmailTemplateConfig
testTemplate(name: EmailTemplate, testEmail: string): void
```

### 3. Notification Service (src/services/notification.service.ts)
```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: DateTime;
  createdAt: DateTime;
}

enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  ACADEMIC = 'ACADEMIC',
  FINANCE = 'FINANCE',
  LIBRARY = 'LIBRARY',
  HR = 'HR',
  SYSTEM = 'SYSTEM'
}

// In-app notifications
createNotification(userId: string, data: CreateNotificationDto): Notification
getUserNotifications(userId: string, unreadOnly?: boolean): Notification[]
markAsRead(notificationId: string): void
markAllAsRead(userId: string): void
deleteNotification(notificationId: string): void
getUnreadCount(userId: string): number

// Combined notification (in-app + email)
notify(userId: string, options: {
  type: NotificationType;
  title: string;
  message: string;
  emailTemplate?: EmailTemplate;
  emailData?: Record<string, any>;
  sendEmail?: boolean;
}): void
```

### 4. Email Queue Service (src/services/emailQueue.service.ts)
```typescript
interface QueuedEmail {
  id: string;
  options: EmailOptions;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  attempts: number;
  lastError?: string;
  scheduledAt?: DateTime;
  processedAt?: DateTime;
  createdAt: DateTime;
}

queueEmail(options: EmailOptions): QueuedEmail
processQueue(): void  // Called by worker
retryFailed(): void
getQueueStatus(): QueueStats
```

### 5. API Routes

**Email:**
```
POST   /api/v1/email/send                    # Send immediate
POST   /api/v1/email/send-bulk               # Send to multiple
POST   /api/v1/email/schedule                # Schedule for later
DELETE /api/v1/email/scheduled/:id           # Cancel scheduled
GET    /api/v1/email/queue/status            # Queue stats
POST   /api/v1/email/test                    # Send test email
```

**Templates:**
```
GET    /api/v1/email/templates
GET    /api/v1/email/templates/:name
PATCH  /api/v1/email/templates/:id
POST   /api/v1/email/templates/:name/reset
POST   /api/v1/email/templates/:name/preview
POST   /api/v1/email/templates/:name/test
```

**Notifications:**
```
GET    /api/v1/notifications                 # Current user's
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/:id/read
POST   /api/v1/notifications/mark-all-read
DELETE /api/v1/notifications/:id
```

---

## Frontend Implementation

### 1. Email Templates Management (src/pages/admin/EmailTemplatesPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Email Templates                                             │
├─────────────────────────────────────────────────────────────┤
│ Category: [All ▼]                                          │
├─────────────────────────────────────────────────────────────┤
│ Template Name         │ Subject              │ Status │ Act │
│───────────────────────┼──────────────────────┼────────┼─────│
│ Welcome               │ Welcome to HUMS      │ Active │ [✏️]│
│ Password Reset        │ Reset your password  │ Active │ [✏️]│
│ Application Approved  │ Congratulations!     │ Active │ [✏️]│
│ Payment Received      │ Payment Confirmation │ Active │ [✏️]│
│ Book Overdue          │ Library Notice       │ Active │ [✏️]│
│ ...                   │                      │        │     │
└─────────────────────────────────────────────────────────────┘
```

### 2. Template Editor (src/pages/admin/EmailTemplateEditorPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Template: Payment Received                             │
├─────────────────────────────────────────────────────────────┤
│ Subject (English): [Payment Confirmation - {{receiptNo}}  ] │
│ Subject (Somali):  [Xaqiijinta Lacag-bixinta - {{receiptNo}}│
├─────────────────────────────────────────────────────────────┤
│ Body (English)                              [Preview] [Test]│
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Dear {{studentName}},                                   │ │
│ │                                                         │ │
│ │ We have received your payment of {{amount}}.           │ │
│ │                                                         │ │
│ │ Receipt No: {{receiptNo}}                              │ │
│ │ Date: {{date}}                                         │ │
│ │ Method: {{paymentMethod}}                              │ │
│ │                                                         │ │
│ │ Your remaining balance is {{balance}}.                 │ │
│ │                                                         │ │
│ │ Thank you,                                             │ │
│ │ Hormuud University Finance                             │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Available Variables:                                        │
│ {{studentName}}, {{studentId}}, {{amount}}, {{receiptNo}}, │
│ {{date}}, {{paymentMethod}}, {{balance}}                   │
├─────────────────────────────────────────────────────────────┤
│ [Reset to Default]            [Cancel] [Save Template]      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Notification Bell (src/components/NotificationBell.tsx)
```tsx
┌─────────────────────────────────────────────────────────────┐
│                                                 🔔 (3)      │
│                                    ┌────────────────────────┤
│                                    │ Notifications          │
│                                    ├────────────────────────┤
│                                    │ 🔵 Grades published    │
│                                    │    CS101 - 2 min ago   │
│                                    │────────────────────────│
│                                    │ 🔵 Payment received    │
│                                    │    $500 - 1 hour ago   │
│                                    │────────────────────────│
│                                    │ 🔵 Book due tomorrow   │
│                                    │    Algorithms - 3h ago │
│                                    │────────────────────────│
│                                    │ [Mark all as read]     │
│                                    │ [View all notifications│
│                                    └────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### 4. Notifications Page (src/pages/NotificationsPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Notifications                              [Mark All Read]  │
├─────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Unread Only ☐]                            │
├─────────────────────────────────────────────────────────────┤
│ Today                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔵 📚 Grades Published                         2:30 PM  │ │
│ │    Your CS101 midterm grade has been published          │ │
│ │    [View Grades]                                        │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ○  💰 Payment Confirmed                       10:15 AM  │ │
│ │    Payment of $500 received. Receipt: RCP-2025-000123  │ │
│ │    [View Receipt]                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Yesterday                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○  📖 Book Due Reminder                        4:00 PM  │ │
│ │    "Introduction to Algorithms" is due tomorrow        │ │
│ │    [Renew Book]                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Email Templates (HTML)

### Base Template Structure
```html
<!-- src/templates/email/base.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
    .logo { max-height: 50px; }
    .content { padding: 30px 20px; background: #ffffff; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{logoUrl}}" alt="Hormuud University" class="logo">
      <h1>Hormuud University</h1>
    </div>
    <div class="content">
      {{content}}
    </div>
    <div class="footer">
      <p>Hormuud University, Mogadishu, Somalia</p>
      <p>© {{year}} All rights reserved</p>
    </div>
  </div>
</body>
</html>
```

### Sample Templates

**Welcome Email:**
```html
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
```

**Payment Reminder:**
```html
<h2>Payment Reminder</h2>
<p>Dear {{studentName}},</p>
<p>This is a reminder that you have an outstanding balance.</p>
<table>
  <tr><td>Amount Due:</td><td><strong>{{amount}}</strong></td></tr>
  <tr><td>Due Date:</td><td>{{dueDate}}</td></tr>
</table>
<p>Please make payment to avoid late fees.</p>
<a href="{{paymentUrl}}" class="button">Pay Now</a>
```

---

## Database Models

```prisma
model EmailTemplate {
  id            String   @id @default(uuid())
  name          String   @unique
  subject       String
  subjectLocal  String?
  bodyHtml      String   @db.Text
  bodyText      String   @db.Text
  bodyHtmlLocal String?  @db.Text
  bodyTextLocal String?  @db.Text
  variables     String[]
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model EmailLog {
  id          String   @id @default(uuid())
  to          String[]
  subject     String
  template    String?
  status      String   // SENT, FAILED, BOUNCED
  error       String?
  sentAt      DateTime?
  createdAt   DateTime @default(now())
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  message   String
  data      Json?
  link      String?
  isRead    Boolean          @default(false)
  readAt    DateTime?
  createdAt DateTime         @default(now())
  
  @@index([userId, isRead])
}

model ScheduledEmail {
  id          String   @id @default(uuid())
  options     Json
  scheduledAt DateTime
  status      String   @default("PENDING")
  processedAt DateTime?
  error       String?
  createdAt   DateTime @default(now())
  
  @@index([scheduledAt, status])
}

enum NotificationType {
  INFO
  SUCCESS
  WARNING
  ERROR
  ACADEMIC
  FINANCE
  LIBRARY
  HR
  SYSTEM
}
```

---

## Configuration

```typescript
// config/email.ts
export const emailConfig = {
  provider: process.env.EMAIL_PROVIDER || 'smtp', // smtp, sendgrid, ses
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: {
    name: 'Hormuud University',
    email: 'noreply@hormuud.edu.so'
  },
  replyTo: 'support@hormuud.edu.so',
  maxRetries: 3,
  retryDelay: 5000 // ms
};
```

---

## Validation Checklist

- [ ] SMTP connection works
- [ ] Welcome email sends on user creation
- [ ] Password reset email works
- [ ] Payment confirmation sends
- [ ] Templates can be customized
- [ ] Preview shows rendered template
- [ ] Test email sends correctly
- [ ] Bilingual templates work
- [ ] In-app notifications create
- [ ] Notification bell shows count
- [ ] Mark as read works
- [ ] Email queue processes
- [ ] Failed emails retry
- [ ] Scheduled emails send on time
- [ ] Email logs captured
