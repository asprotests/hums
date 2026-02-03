import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@hums/database';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import type { JwtPayload, TokenPair, AuthUser, LoginResponse } from '../types/index.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';

export class AuthService {
  /**
   * Login user with email and password
   */
  async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    // Find user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.unauthorized('Account is disabled. Please contact administrator.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Extract roles and permissions
    const roles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      displayName: ur.role.displayName,
    }));

    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.name)
        )
      ),
    ];

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      roles.map((r) => r.name),
      permissions,
      ipAddress,
      userAgent
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create audit log
    await this.createAuditLog(user.id, 'LOGIN', 'User', user.id, ipAddress, userAgent);

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };

    return { user: authUser, tokens };
  }

  /**
   * Logout user by invalidating session
   */
  async logout(refreshToken: string, _userId?: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (session) {
      await prisma.session.delete({
        where: { id: session.id },
      });

      await this.createAuditLog(session.userId, 'LOGOUT', 'Session', session.id);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw AppError.unauthorized('Refresh token expired');
    }

    // Check if user is still active
    if (!session.user.isActive || session.user.deletedAt) {
      await prisma.session.delete({ where: { id: session.id } });
      throw AppError.unauthorized('Account is disabled');
    }

    // Extract roles and permissions
    const roles = session.user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        session.user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.name)
        )
      ),
    ];

    // Generate new access token
    const accessToken = this.signAccessToken(
      session.user.id,
      session.user.email,
      roles,
      permissions
    );

    // Generate new refresh token and update session
    const newRefreshToken = this.generateRefreshTokenString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Generate password reset token
   */
  async forgotPassword(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      // Don't reveal if user exists
      return 'If an account with that email exists, a password reset link has been sent.';
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store reset token in system config (in production, use a dedicated table)
    await prisma.systemConfig.upsert({
      where: { key: `password_reset_${user.id}` },
      update: {
        value: {
          token: resetTokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        },
      },
      create: {
        key: `password_reset_${user.id}`,
        value: {
          token: resetTokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        description: 'Password reset token',
      },
    });

    // In production, send email here
    console.info(`[AUTH] Password reset token for ${email}: ${resetToken}`);

    await this.createAuditLog(user.id, 'PASSWORD_RESET_REQUEST', 'User', user.id);

    return 'If an account with that email exists, a password reset link has been sent.';
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this reset token
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'password_reset_' },
      },
    });

    let userId: string | null = null;
    let configKey: string | null = null;

    for (const config of configs) {
      const value = config.value as { token: string; expiresAt: string };
      if (value.token === tokenHash) {
        if (new Date(value.expiresAt) < new Date()) {
          throw AppError.badRequest('Password reset token has expired');
        }
        userId = config.key.replace('password_reset_', '');
        configKey = config.key;
        break;
      }
    }

    if (!userId || !configKey) {
      throw AppError.badRequest('Invalid password reset token');
    }

    // Validate password
    this.validatePassword(newPassword);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Delete reset token
    await prisma.systemConfig.delete({
      where: { key: configKey },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId },
    });

    await this.createAuditLog(userId, 'PASSWORD_RESET', 'User', userId);
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValidPassword) {
      throw AppError.badRequest('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw AppError.badRequest('New password must be different from current password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.createAuditLog(userId, 'PASSWORD_CHANGE', 'User', userId);
  }

  /**
   * Verify JWT token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Access token expired');
      }
      throw AppError.unauthorized('Invalid access token');
    }
  }

  /**
   * Get user by ID with roles and permissions
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const roles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      displayName: ur.role.displayName,
    }));

    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.name)
        )
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  // Private methods

  private async generateTokens(
    userId: string,
    email: string,
    roles: string[],
    permissions: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const accessToken = this.signAccessToken(userId, email, roles, permissions);
    const refreshToken = this.generateRefreshTokenString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store session
    await prisma.session.create({
      data: {
        userId,
        token: accessToken.slice(-32), // Store last 32 chars for reference
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private signAccessToken(
    userId: string,
    email: string,
    roles: string[],
    permissions: string[]
  ): string {
    const payload: JwtPayload = { userId, email, roles, permissions };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  private generateRefreshTokenString(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw AppError.badRequest('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw AppError.badRequest('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw AppError.badRequest('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw AppError.badRequest('Password must contain at least one number');
    }
  }

  private async createAuditLog(
    userId: string | null,
    action: string,
    resource: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        ipAddress,
        userAgent,
      },
    });
  }
}

export const authService = new AuthService();
