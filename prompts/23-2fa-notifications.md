# Prompt 23: Two-Factor Authentication & Notification System

## Objective
Implement 2FA security and comprehensive notification preferences.

## Location: `hums-v2-project/prompts/23-2fa-notifications.md`

---

## Part 1: Two-Factor Authentication

### 1. 2FA Service (src/services/twoFactor.service.ts)
```typescript
enum TwoFactorMethod {
  TOTP = 'TOTP',           // Authenticator app (Google Auth, Authy)
  SMS = 'SMS',             // SMS OTP
  EMAIL = 'EMAIL'          // Email OTP
}

// Setup TOTP
generateTOTPSecret(userId: string): { secret: string; qrCode: string }
verifyTOTPSetup(userId: string, code: string): boolean
enableTOTP(userId: string): void

// SMS/Email OTP
sendOTP(userId: string, method: 'SMS' | 'EMAIL'): void
verifyOTP(userId: string, code: string): boolean

// General
enable2FA(userId: string, method: TwoFactorMethod): void
disable2FA(userId: string): void
verify2FA(userId: string, code: string): boolean
getBackupCodes(userId: string): string[]
regenerateBackupCodes(userId: string): string[]
```

### 2. Login Flow with 2FA
```
1. User submits email/password
2. If valid and 2FA enabled:
   - Return { requires2FA: true, methods: ['TOTP', 'SMS'] }
   - User selects method and enters code
   - Verify code
   - Issue tokens
3. If valid and 2FA disabled:
   - Issue tokens directly
```

### 3. API Routes
```
POST   /api/v1/auth/2fa/setup-totp     # Get QR code
POST   /api/v1/auth/2fa/verify-setup   # Verify and enable
POST   /api/v1/auth/2fa/enable         # Enable with method
POST   /api/v1/auth/2fa/disable        # Disable 2FA
POST   /api/v1/auth/2fa/send-otp       # Send SMS/Email OTP
POST   /api/v1/auth/2fa/verify         # Verify code during login
GET    /api/v1/auth/2fa/backup-codes   # Get backup codes
POST   /api/v1/auth/2fa/regenerate     # New backup codes
```

### 4. Frontend: 2FA Setup Page
```
┌─────────────────────────────────────────────────────────────┐
│ Two-Factor Authentication                                   │
├─────────────────────────────────────────────────────────────┤
│ Status: ● Enabled (Authenticator App)        [Disable]     │
├─────────────────────────────────────────────────────────────┤
│ Methods                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ◉ Authenticator App (Recommended)          [Configure] │ │
│ │ ○ SMS to +252 61 *** 5678                  [Configure] │ │
│ │ ○ Email to a****@hormuud.edu.so            [Configure] │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Backup Codes                                                │
│ You have 8 unused backup codes.              [View Codes]  │
│ [Regenerate Codes]                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 2: Notification Preferences

### 1. Notification Preference Service
```typescript
interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    categories: {
      academic: boolean;      // Grades, attendance
      finance: boolean;       // Payments, invoices
      library: boolean;       // Due dates, reservations
      announcements: boolean; // General announcements
      system: boolean;        // Password changes, security
    };
  };
  sms: {
    enabled: boolean;
    categories: {
      urgent: boolean;        // Important deadlines
      otp: boolean;           // Security codes
      payments: boolean;      // Payment confirmations
    };
  };
  push: {
    enabled: boolean;
    categories: { ... };
  };
  inApp: {
    enabled: boolean;         // Always true
    sound: boolean;
    desktop: boolean;
  };
}

getPreferences(userId: string): NotificationPreferences
updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): void
shouldNotify(userId: string, channel: string, category: string): boolean
```

### 2. Smart Notification Dispatch
```typescript
// When sending notification, check preferences
async function notify(userId: string, notification: NotificationData) {
  const prefs = await getPreferences(userId);
  
  // Always send in-app
  await createInAppNotification(userId, notification);
  
  // Check email preference
  if (prefs.email.enabled && prefs.email.categories[notification.category]) {
    await sendEmail(userId, notification);
  }
  
  // Check SMS for urgent
  if (prefs.sms.enabled && notification.urgent && prefs.sms.categories.urgent) {
    await sendSMS(userId, notification);
  }
}
```

### 3. API Routes
```
GET    /api/v1/notifications/preferences
PATCH  /api/v1/notifications/preferences
POST   /api/v1/notifications/test          # Send test notification
```

### 4. Frontend: Notification Settings
```
┌─────────────────────────────────────────────────────────────┐
│ Notification Settings                                       │
├─────────────────────────────────────────────────────────────┤
│ Email Notifications                         [Toggle: ON]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Academic (grades, attendance)                        │ │
│ │ ☑ Finance (payments, invoices)                         │ │
│ │ ☑ Library (due dates, reservations)                    │ │
│ │ ☑ Announcements                                        │ │
│ │ ☑ Security alerts (cannot disable)                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ SMS Notifications                           [Toggle: ON]   │
│ Phone: +252 61 234 5678                    [Change]        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Urgent deadlines only                                │ │
│ │ ☑ Payment confirmations                                │ │
│ │ ☑ Security codes (required)                            │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                     [Send Test] [Save]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Models

```prisma
model TwoFactorAuth {
  id           String   @id @default(uuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  method       String   // TOTP, SMS, EMAIL
  secret       String?  // Encrypted TOTP secret
  isEnabled    Boolean  @default(false)
  backupCodes  String[] // Hashed backup codes
  lastUsedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model NotificationPreference {
  id                String  @id @default(uuid())
  userId            String  @unique
  user              User    @relation(fields: [userId], references: [id])
  emailEnabled      Boolean @default(true)
  emailAcademic     Boolean @default(true)
  emailFinance      Boolean @default(true)
  emailLibrary      Boolean @default(true)
  emailAnnouncements Boolean @default(true)
  smsEnabled        Boolean @default(false)
  smsUrgent         Boolean @default(true)
  smsPayments       Boolean @default(true)
  pushEnabled       Boolean @default(true)
  inAppSound        Boolean @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## Security Considerations

1. **TOTP Secrets**: Encrypt at rest
2. **Backup Codes**: Hash like passwords, show only once
3. **Rate Limiting**: Limit OTP attempts (5 per 15 min)
4. **Session**: Require re-auth to disable 2FA
5. **Recovery**: Admin can reset 2FA with identity verification

---

## Validation Checklist

- [ ] TOTP setup generates QR code
- [ ] Authenticator app codes verify correctly
- [ ] SMS OTP sends and verifies
- [ ] Email OTP works
- [ ] Backup codes work (one-time use)
- [ ] Login flow handles 2FA
- [ ] Can disable 2FA with verification
- [ ] Admin accounts require 2FA
- [ ] Notification preferences save
- [ ] Email notifications respect preferences
- [ ] SMS only sent for opted-in categories
- [ ] Test notification works
