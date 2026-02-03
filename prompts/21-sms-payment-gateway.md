# Prompt 21: SMS & Payment Gateway Integration

## Objective
Integrate SMS notifications and mobile money/bank payment gateways for Somalia.

## Location in Project
Place this file in: `hums-v2-project/prompts/21-sms-payment-gateway.md`

---

## Backend Implementation

### 1. SMS Service (src/services/sms.service.ts)
```typescript
interface SMSOptions {
  to: string;              // Phone number with country code
  message: string;
  template?: SMSTemplate;
  data?: Record<string, any>;
}

enum SMSTemplate {
  OTP = 'otp',
  PAYMENT_RECEIVED = 'payment-received',
  PAYMENT_REMINDER = 'payment-reminder',
  BOOK_OVERDUE = 'book-overdue',
  LEAVE_APPROVED = 'leave-approved',
  GRADE_PUBLISHED = 'grade-published',
  CUSTOM = 'custom'
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Core methods
sendSMS(options: SMSOptions): Promise<SMSResult>
sendBulkSMS(messages: SMSOptions[]): Promise<SMSResult[]>
getBalance(): Promise<number>
getDeliveryStatus(messageId: string): Promise<DeliveryStatus>

// OTP specific
sendOTP(phone: string, purpose: 'LOGIN' | 'PASSWORD_RESET' | 'VERIFY'): string
verifyOTP(phone: string, code: string, purpose: string): boolean

// Templates
renderTemplate(template: SMSTemplate, data: Record<string, any>): string
```

### 2. SMS Templates
```typescript
const smsTemplates = {
  otp: 'Your HUMS verification code is {{code}}. Valid for 5 minutes.',
  'payment-received': 'Payment of ${{amount}} received. Receipt: {{receiptNo}}. Balance: ${{balance}}',
  'payment-reminder': 'Reminder: ${{amount}} due on {{dueDate}}. Pay to avoid late fees.',
  'book-overdue': 'Library: "{{bookTitle}}" is overdue. Please return to avoid fines.',
  'leave-approved': 'Your leave request ({{dates}}) has been approved.',
  'grade-published': 'Your {{courseName}} grade has been published. Login to view.'
};
```

### 3. Payment Gateway Service (src/services/paymentGateway.service.ts)
```typescript
interface PaymentRequest {
  amount: Decimal;
  currency: string;          // USD, SOS
  method: PaymentMethod;
  studentId: string;
  invoiceId?: string;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status: PaymentStatus;
  redirectUrl?: string;      // For redirect-based payments
  error?: string;
}

enum PaymentMethod {
  EVC_PLUS = 'EVC_PLUS',           // Hormuud Telecom
  ZAAD = 'ZAAD',                   // Telesom
  SAHAL = 'SAHAL',                 // Golis
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD'                    // International cards
}

enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

// Initialize payment
initiatePayment(request: PaymentRequest): Promise<PaymentResponse>

// Mobile money specific (EVC Plus example)
initiateEVCPayment(phone: string, amount: Decimal, reference: string): Promise<PaymentResponse>
checkEVCStatus(transactionId: string): Promise<PaymentStatus>

// Callbacks
handleCallback(provider: string, payload: any): Promise<void>
verifyWebhook(provider: string, signature: string, payload: any): boolean

// Queries
getTransaction(transactionId: string): Transaction
getTransactionsByInvoice(invoiceId: string): Transaction[]
```

### 4. EVC Plus Integration (Somalia's largest mobile money)
```typescript
// src/integrations/evc-plus.ts
interface EVCConfig {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

class EVCPlusClient {
  async requestPayment(phone: string, amount: number, reference: string): Promise<EVCResponse> {
    // EVC Plus API call
    // Customer receives USSD prompt to confirm
  }
  
  async checkStatus(referenceId: string): Promise<TransactionStatus> {
    // Check payment status
  }
  
  async refund(transactionId: string, amount?: number): Promise<RefundResponse> {
    // Process refund
  }
}
```

### 5. Online Payment Service (src/services/onlinePayment.service.ts)
```typescript
interface OnlinePaymentSession {
  id: string;
  studentId: string;
  invoiceId?: string;
  amount: Decimal;
  currency: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  transactionId?: string;
  expiresAt: DateTime;
  completedAt?: DateTime;
}

// Create payment session
createPaymentSession(studentId: string, amount: Decimal, invoiceId?: string): OnlinePaymentSession

// Get available payment methods
getAvailableMethods(): PaymentMethod[]

// Process payment
processPayment(sessionId: string, method: PaymentMethod, details: PaymentDetails): PaymentResult

// For mobile money
initiateMobileMoneyPayment(sessionId: string, phone: string, provider: PaymentMethod): MobileMoneyResult

// Verify payment
verifyPayment(sessionId: string): PaymentVerification
```

### 6. API Routes

**SMS:**
```
POST   /api/v1/sms/send                      # Send single SMS
POST   /api/v1/sms/send-bulk                 # Send bulk SMS
POST   /api/v1/sms/send-otp                  # Send OTP
POST   /api/v1/sms/verify-otp                # Verify OTP
GET    /api/v1/sms/balance                   # Check SMS balance
GET    /api/v1/sms/status/:messageId         # Delivery status
```

**Payment Gateway:**
```
POST   /api/v1/payments/initiate             # Start payment
GET    /api/v1/payments/methods              # Available methods
GET    /api/v1/payments/session/:id          # Get session status
POST   /api/v1/payments/session/:id/process  # Process payment
POST   /api/v1/payments/webhook/:provider    # Webhook callback
GET    /api/v1/payments/transaction/:id      # Transaction details
POST   /api/v1/payments/verify/:sessionId    # Verify payment
```

**Student Online Payment:**
```
GET    /api/v1/student/payment/session       # Create/get session
POST   /api/v1/student/payment/mobile-money  # Pay with mobile money
GET    /api/v1/student/payment/status/:id    # Check status
```

---

## Frontend Implementation

### 1. Online Payment Page (src/pages/student/OnlinePaymentPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Make Payment                                                │
├─────────────────────────────────────────────────────────────┤
│ Outstanding Balance: $1,500.00                             │
├─────────────────────────────────────────────────────────────┤
│ Amount to Pay: [$500.00          ]                         │
│ ☐ Pay full balance ($1,500.00)                             │
├─────────────────────────────────────────────────────────────┤
│ Select Payment Method                                       │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │  📱        │ │  📱        │ │  🏦        │           │
│ │  EVC Plus  │ │   Zaad     │ │   Bank     │           │
│ │  (Hormuud) │ │  (Telesom) │ │  Transfer  │           │
│ │     ◉      │ │     ○      │ │     ○      │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│ EVC Plus Payment                                            │
│                                                             │
│ Phone Number: [+252 61 ________]                           │
│                                                             │
│ You will receive a prompt on your phone to confirm         │
│ the payment of $500.00                                     │
│                                                             │
│                              [Cancel] [Pay $500.00]        │
└─────────────────────────────────────────────────────────────┘
```

### 2. Payment Processing Modal
```
┌─────────────────────────────────────────────────────────────┐
│ Processing Payment                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ⏳                                       │
│                                                             │
│     Waiting for payment confirmation...                    │
│                                                             │
│     Please check your phone and enter your                 │
│     EVC Plus PIN to confirm the payment.                   │
│                                                             │
│     Amount: $500.00                                        │
│     To: Hormuud University                                 │
│                                                             │
│     Time remaining: 4:32                                   │
│                                                             │
│                    [Cancel Payment]                        │
└─────────────────────────────────────────────────────────────┘
```

### 3. Payment Success Page
```
┌─────────────────────────────────────────────────────────────┐
│                         ✓                                  │
│                  Payment Successful!                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Amount Paid:      $500.00                                  │
│ Payment Method:   EVC Plus                                 │
│ Transaction ID:   EVC-2025-123456                          │
│ Date:            Feb 15, 2025 10:30 AM                     │
│                                                             │
│ Receipt No:      RCP-2025-000456                           │
│ Remaining Balance: $1,000.00                               │
│                                                             │
│ A confirmation SMS has been sent to your phone.            │
│                                                             │
│         [Download Receipt]  [Back to Finance]              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Admin SMS Dashboard (src/pages/admin/SMSDashboardPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ SMS Dashboard                                               │
├─────────────────────────────────────────────────────────────┤
│ Balance: 5,432 SMS remaining          [Top Up]             │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│ │ Sent Today│ │ This Month│ │ Delivered │ │ Failed    │   │
│ │    156    │ │   2,340   │ │   98.5%   │ │    1.5%   │   │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions                                               │
│ [Send Bulk SMS] [Payment Reminders] [Overdue Notices]      │
├─────────────────────────────────────────────────────────────┤
│ Recent Messages                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ +252612345678 │ Payment received... │ Delivered │ 10:30 │ │
│ │ +252613456789 │ Your OTP is 1234... │ Delivered │ 10:28 │ │
│ │ +252614567890 │ Leave approved...   │ Failed    │ 10:25 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5. Bulk SMS Page (src/pages/admin/BulkSMSPage.tsx)
```
┌─────────────────────────────────────────────────────────────┐
│ Send Bulk SMS                                               │
├─────────────────────────────────────────────────────────────┤
│ Recipients                                                  │
│ ○ All Students    ○ All Employees                          │
│ ○ Specific Group: [Select group            ▼]             │
│ ○ Custom List:    [Upload CSV]                             │
│                                                             │
│ Selected: 450 recipients                                   │
├─────────────────────────────────────────────────────────────┤
│ Message Template: [Custom                  ▼]              │
│                                                             │
│ Message (160 chars max per SMS):                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Dear student, reminder that semester fees are due by    │ │
│ │ March 1st. Please pay to avoid late fees.              │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Characters: 124/160 (1 SMS)                                │
├─────────────────────────────────────────────────────────────┤
│ Cost Estimate: 450 SMS × $0.02 = $9.00                     │
│                                                             │
│                              [Cancel] [Send Now]           │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Models

```prisma
model SMSLog {
  id          String    @id @default(uuid())
  to          String
  message     String
  template    String?
  status      String    // SENT, DELIVERED, FAILED
  messageId   String?   // Provider message ID
  error       String?
  cost        Decimal?
  sentAt      DateTime?
  deliveredAt DateTime?
  createdAt   DateTime  @default(now())
  
  @@index([to])
  @@index([status])
}

model OTPCode {
  id        String   @id @default(uuid())
  phone     String
  code      String
  purpose   String   // LOGIN, PASSWORD_RESET, VERIFY
  expiresAt DateTime
  verified  Boolean  @default(false)
  attempts  Int      @default(0)
  createdAt DateTime @default(now())
  
  @@index([phone, purpose])
}

model PaymentTransaction {
  id              String        @id @default(uuid())
  sessionId       String?
  studentId       String?
  student         Student?      @relation(fields: [studentId], references: [id])
  invoiceId       String?
  invoice         Invoice?      @relation(fields: [invoiceId], references: [id])
  amount          Decimal
  currency        String        @default("USD")
  method          PaymentMethod
  provider        String        // EVC_PLUS, ZAAD, etc.
  providerTxnId   String?       // Provider's transaction ID
  status          PaymentStatus @default(PENDING)
  phone           String?       // For mobile money
  metadata        Json?
  errorMessage    String?
  initiatedAt     DateTime      @default(now())
  completedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([studentId])
  @@index([status])
  @@index([providerTxnId])
}

model PaymentSession {
  id          String        @id @default(uuid())
  studentId   String
  student     Student       @relation(fields: [studentId], references: [id])
  invoiceId   String?
  amount      Decimal
  currency    String        @default("USD")
  status      PaymentStatus @default(PENDING)
  expiresAt   DateTime
  completedAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum PaymentMethod {
  EVC_PLUS
  ZAAD
  SAHAL
  BANK_TRANSFER
  CARD
  CASH
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
}
```

---

## Configuration

```typescript
// config/sms.ts
export const smsConfig = {
  provider: process.env.SMS_PROVIDER || 'africa_talking',
  africaTalking: {
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
    senderId: 'HORMUUD-UNI'
  },
  costPerSMS: 0.02,  // USD
  maxRetries: 3
};

// config/payment.ts
export const paymentConfig = {
  evcPlus: {
    merchantId: process.env.EVC_MERCHANT_ID,
    apiKey: process.env.EVC_API_KEY,
    baseUrl: process.env.EVC_BASE_URL
  },
  zaad: {
    merchantId: process.env.ZAAD_MERCHANT_ID,
    apiKey: process.env.ZAAD_API_KEY,
    baseUrl: process.env.ZAAD_BASE_URL
  },
  sessionTimeout: 10 * 60 * 1000, // 10 minutes
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET
};
```

---

## Validation Checklist

- [ ] SMS sends successfully
- [ ] OTP generation and verification works
- [ ] SMS templates render correctly
- [ ] Bulk SMS sends to selected recipients
- [ ] SMS delivery status updates
- [ ] EVC Plus payment initiates
- [ ] Customer receives payment prompt
- [ ] Payment status updates correctly
- [ ] Successful payment creates receipt
- [ ] Payment updates invoice/balance
- [ ] Webhook processes payment confirmation
- [ ] Failed payments handled gracefully
- [ ] Payment session expires correctly
- [ ] SMS sent on payment confirmation
- [ ] Transaction history shows correctly
