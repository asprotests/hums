import { prisma } from '@hums/database';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export interface TestUserData {
  email?: string;
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Create a test user with optional custom data
 */
export async function createTestUser(data: TestUserData = {}) {
  const password = data.password || 'TestPassword123!';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email || `test-${Date.now()}@example.com`,
      username: data.username || `testuser-${Date.now()}`,
      passwordHash,
      firstName: data.firstName || 'Test',
      lastName: data.lastName || 'User',
    },
  });

  return { ...user, password };
}

/**
 * Create a test role
 */
export async function createTestRole(name: string, permissionNames: string[] = []) {
  // Find permission IDs
  const permissions = permissionNames.length > 0
    ? await prisma.permission.findMany({
        where: { name: { in: permissionNames } },
        select: { id: true },
      })
    : [];

  const role = await prisma.role.create({
    data: {
      name,
      displayName: name,
      description: `Test role: ${name}`,
    },
  });

  // Connect permissions if any
  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map(p => ({
        roleId: role.id,
        permissionId: p.id,
      })),
    });
  }

  return role;
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  // Delete in order of dependencies
  await prisma.auditLog.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test-',
      },
    },
  });
}
