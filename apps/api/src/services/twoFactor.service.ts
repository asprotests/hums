import { prisma } from '@hums/database';
import type { TwoFactorMethod } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import { auditService } from './audit.service.js';
import { smsService } from './sms.service.js';
import { emailService } from './email.service.js';
import crypto from 'crypto';

// TOTP configuration
const TOTP_ISSUER = 'HUMS';
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const BACKUP_CODES_COUNT = 10;
const OTP_EXPIRY_MINUTES = 5;

interface TOTPSetupResult {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

interface Verify2FAResult {
  success: boolean;
  remainingBackupCodes?: number;
}

export class TwoFactorService {
  /**
   * Generate a random base32 secret for TOTP
   */
  private generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return this.base32Encode(buffer);
  }

  /**
   * Base32 encode a buffer
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Base32 decode a string
   */
  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanInput = encoded.toUpperCase().replace(/=+$/, '');

    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of cleanInput) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Generate TOTP code
   */
  private generateTOTP(secret: string, timestamp?: number): string {
    const time = timestamp ?? Math.floor(Date.now() / 1000);
    const counter = Math.floor(time / TOTP_PERIOD);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const secretBuffer = this.base32Decode(secret);
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, TOTP_DIGITS);
    return otp.toString().padStart(TOTP_DIGITS, '0');
  }

  /**
   * Verify TOTP code (with time drift tolerance)
   */
  private verifyTOTP(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000);

    // Check current period and ±1 period for clock drift
    for (let i = -1; i <= 1; i++) {
      const timestamp = now + i * TOTP_PERIOD;
      const expectedCode = this.generateTOTP(secret, timestamp);
      if (code === expectedCode) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate OTPAUTH URI for QR code
   */
  private generateOTPAuthURI(secret: string, email: string): string {
    const encodedIssuer = encodeURIComponent(TOTP_ISSUER);
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
  }

  /**
   * Generate QR code as data URL
   */
  private async generateQRCode(uri: string): Promise<string> {
    // Simple SVG QR code generation (basic implementation)
    // In production, use a library like 'qrcode'
    // For now, return the URI for manual entry
    return `data:text/plain;base64,${Buffer.from(uri).toString('base64')}`;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Hash a backup code
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.replace('-', '')).digest('hex');
  }

  /**
   * Setup TOTP for user - returns QR code and secret
   */
  async setupTOTP(userId: string): Promise<TOTPSetupResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, is2FAEnabled: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const secret = this.generateSecret();
    const uri = this.generateOTPAuthURI(secret, user.email);
    const qrCode = await this.generateQRCode(uri);

    // Store secret temporarily (not enabled yet)
    await prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        method: 'TOTP',
        secret,
        isEnabled: false,
        backupCodes: [],
      },
      update: {
        method: 'TOTP',
        secret,
        isEnabled: false,
      },
    });

    return {
      secret,
      qrCode,
      manualEntryKey: secret,
    };
  }

  /**
   * Verify TOTP setup and enable 2FA
   */
  async verifyTOTPSetup(userId: string, code: string): Promise<{ success: boolean; backupCodes: string[] }> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.secret) {
      throw AppError.badRequest('TOTP setup not initiated');
    }

    if (twoFactorAuth.isEnabled) {
      throw AppError.badRequest('2FA is already enabled');
    }

    const isValid = this.verifyTOTP(twoFactorAuth.secret, code);
    if (!isValid) {
      throw AppError.badRequest('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedCodes = backupCodes.map(c => this.hashBackupCode(c));

    // Enable 2FA
    await prisma.$transaction([
      prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          isEnabled: true,
          backupCodes: hashedCodes,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { is2FAEnabled: true },
      }),
    ]);

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'TwoFactorAuth',
      resourceId: twoFactorAuth.id,
      newValues: { method: 'TOTP', enabled: true },
    });

    return { success: true, backupCodes };
  }

  /**
   * Send OTP via SMS or Email
   */
  async sendOTP(userId: string, method: 'SMS' | 'EMAIL'): Promise<{ success: boolean; expiresAt: Date }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP and send via appropriate channel
    if (method === 'SMS') {
      if (!user.phone) {
        throw AppError.badRequest('Phone number not configured');
      }
      // Store OTP in database
      await prisma.oTPCode.create({
        data: {
          phone: user.phone,
          code: otp,
          purpose: 'LOGIN',
          expiresAt,
        },
      });
      await smsService.sendSMS({
        to: user.phone,
        message: `Your HUMS login code is: ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      });
    } else {
      // Store OTP with email as identifier (reusing phone field)
      await prisma.oTPCode.create({
        data: {
          phone: user.email, // Using phone field for email OTP identifier
          code: otp,
          purpose: 'LOGIN',
          expiresAt,
        },
      });
      await emailService.sendEmail({
        to: user.email,
        subject: 'Your HUMS Login Code',
        html: `<p>Your login verification code is: <strong>${otp}</strong></p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
        text: `Your login verification code is: ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      });
    }

    return { success: true, expiresAt };
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(userId: string, code: string): Promise<boolean> {
    // Get user's phone and email to look up OTP
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });

    if (!user) {
      return false;
    }

    // Look for OTP using phone or email as identifier
    const otpRecord = await prisma.oTPCode.findFirst({
      where: {
        phone: { in: [user.phone, user.email].filter(Boolean) as string[] },
        purpose: 'LOGIN',
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return false;
    }

    const isValid = otpRecord.code === code;

    if (isValid) {
      await prisma.oTPCode.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      });
    }

    return isValid;
  }

  /**
   * Verify 2FA code (TOTP or backup code)
   */
  async verify2FA(userId: string, code: string): Promise<Verify2FAResult> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw AppError.badRequest('2FA is not enabled');
    }

    // Try TOTP first
    if (twoFactorAuth.method === 'TOTP' && twoFactorAuth.secret) {
      const isValidTOTP = this.verifyTOTP(twoFactorAuth.secret, code);
      if (isValidTOTP) {
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: { lastUsedAt: new Date() },
        });
        return { success: true };
      }
    }

    // Try backup code
    const normalizedCode = code.replace('-', '').toUpperCase();
    const hashedCode = this.hashBackupCode(normalizedCode);
    const backupCodeIndex = twoFactorAuth.backupCodes.indexOf(hashedCode);

    if (backupCodeIndex !== -1) {
      // Remove used backup code
      const newBackupCodes = [...twoFactorAuth.backupCodes];
      newBackupCodes.splice(backupCodeIndex, 1);

      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes: newBackupCodes,
          lastUsedAt: new Date(),
        },
      });

      return {
        success: true,
        remainingBackupCodes: newBackupCodes.length,
      };
    }

    return { success: false };
  }

  /**
   * Enable 2FA with specific method
   */
  async enable2FA(userId: string, method: TwoFactorMethod): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedCodes = backupCodes.map(c => this.hashBackupCode(c));

    await prisma.$transaction([
      prisma.twoFactorAuth.upsert({
        where: { userId },
        create: {
          userId,
          method,
          isEnabled: true,
          backupCodes: hashedCodes,
        },
        update: {
          method,
          isEnabled: true,
          backupCodes: hashedCodes,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { is2FAEnabled: true },
      }),
    ]);

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'TwoFactorAuth',
      resourceId: userId,
      newValues: { method, enabled: true },
    });
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, code: string): Promise<void> {
    // Verify code first
    const result = await this.verify2FA(userId, code);
    if (!result.success) {
      throw AppError.badRequest('Invalid verification code');
    }

    await prisma.$transaction([
      prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          isEnabled: false,
          secret: null,
          backupCodes: [],
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { is2FAEnabled: false },
      }),
    ]);

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'TwoFactorAuth',
      resourceId: userId,
      newValues: { enabled: false },
    });
  }

  /**
   * Get 2FA status for user
   */
  async get2FAStatus(userId: string) {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: {
        method: true,
        isEnabled: true,
        lastUsedAt: true,
        backupCodes: true,
        createdAt: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });

    return {
      isEnabled: twoFactorAuth?.isEnabled ?? false,
      method: twoFactorAuth?.method ?? null,
      lastUsedAt: twoFactorAuth?.lastUsedAt ?? null,
      backupCodesRemaining: twoFactorAuth?.backupCodes?.length ?? 0,
      availableMethods: {
        TOTP: true,
        SMS: !!user?.phone,
        EMAIL: true,
      },
    };
  }

  /**
   * Get backup codes (show once, regenerate to see again)
   */
  async getBackupCodes(userId: string): Promise<{ count: number; canRegenerate: boolean }> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { backupCodes: true, isEnabled: true },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw AppError.badRequest('2FA is not enabled');
    }

    return {
      count: twoFactorAuth.backupCodes.length,
      canRegenerate: true,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    // Verify current code first
    const result = await this.verify2FA(userId, code);
    if (!result.success) {
      throw AppError.badRequest('Invalid verification code');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedCodes = backupCodes.map(c => this.hashBackupCode(c));

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: hashedCodes },
    });

    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'TwoFactorAuth',
      resourceId: userId,
      newValues: { backupCodesRegenerated: true },
    });

    return backupCodes;
  }

  /**
   * Admin: Reset 2FA for user (requires admin privileges)
   */
  async adminReset2FA(userId: string, adminId: string): Promise<void> {
    await prisma.$transaction([
      prisma.twoFactorAuth.deleteMany({
        where: { userId },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { is2FAEnabled: false },
      }),
    ]);

    await auditService.log({
      userId: adminId,
      action: 'DELETE',
      resource: 'TwoFactorAuth',
      resourceId: userId,
      newValues: { adminReset: true, targetUserId: userId },
    });
  }
}

export const twoFactorService = new TwoFactorService();
