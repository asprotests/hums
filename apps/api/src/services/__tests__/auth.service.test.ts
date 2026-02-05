// Jest globals are available without import in test environment
import { prisma } from '@hums/database';
import bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service.js';

const authService = new AuthService();
const SALT_ROUNDS = 12;

describe('AuthService', () => {
  let testUserId: string | null = null;
  let testUserEmail: string | null = null;

  beforeEach(async () => {
    // Create a test user for each test
    const email = `test-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('TestPassword123!', SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        username: `testuser-${Date.now()}`,
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      },
    });
    testUserId = user.id;
    testUserEmail = email;
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      // Delete related data first
      await prisma.auditLog.deleteMany({ where: { userId: testUserId } });
      await prisma.session.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      testUserId = null;
      testUserEmail = null;
    }
  });

  describe('login', () => {
    it('should throw for non-existent email', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw for invalid password', async () => {
      await expect(
        authService.login(testUserEmail!, 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw for inactive user', async () => {
      // Deactivate the user
      await prisma.user.update({
        where: { id: testUserId! },
        data: { isActive: false },
      });

      await expect(
        authService.login(testUserEmail!, 'TestPassword123!')
      ).rejects.toThrow('Account is disabled');
    });

    it('should return tokens for valid credentials', async () => {
      const result = await authService.login(testUserEmail!, 'TestPassword123!');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(testUserEmail);
    });

    it('should update lastLoginAt after successful login', async () => {
      const beforeLogin = await prisma.user.findUnique({ where: { id: testUserId! } });
      const originalLastLogin = beforeLogin!.lastLoginAt;

      await authService.login(testUserEmail!, 'TestPassword123!');

      const afterLogin = await prisma.user.findUnique({ where: { id: testUserId! } });
      expect(afterLogin!.lastLoginAt).not.toEqual(originalLastLogin);
    });

    it('should create an audit log entry', async () => {
      await authService.login(testUserEmail!, 'TestPassword123!');

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: testUserId!,
          action: 'LOGIN',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog!.action).toBe('LOGIN');
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const { tokens: originalTokens } = await authService.login(testUserEmail!, 'TestPassword123!');

      const newTokens = await authService.refreshToken(originalTokens.refreshToken);

      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      // New refresh token should be different (it's regenerated)
      expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken);
    });

    it('should throw for invalid refresh token', async () => {
      await expect(
        authService.refreshToken('invalid-refresh-token')
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should delete the session', async () => {
      const { tokens } = await authService.login(testUserEmail!, 'TestPassword123!');

      // Verify session exists
      const sessionBefore = await prisma.session.findUnique({
        where: { refreshToken: tokens.refreshToken },
      });
      expect(sessionBefore).not.toBeNull();

      // Logout
      await authService.logout(tokens.refreshToken);

      // Verify session is deleted
      const sessionAfter = await prisma.session.findUnique({
        where: { refreshToken: tokens.refreshToken },
      });
      expect(sessionAfter).toBeNull();
    });
  });
});
