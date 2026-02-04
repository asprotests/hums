import bcrypt from 'bcryptjs';
import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma } from '@hums/database';

const SALT_ROUNDS = 12;

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  roleIds: string[];
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  password?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roleIds?: string[];
}

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface BulkImportUser {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  password?: string;
}

export class UserService {
  /**
   * Create a new user
   */
  async createUser(data: CreateUserInput, createdById?: string) {
    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw AppError.conflict('Email already exists');
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUsername) {
      throw AppError.conflict('Username already exists');
    }

    // Verify all roles exist
    const roles = await prisma.role.findMany({
      where: { id: { in: data.roleIds } },
    });
    if (roles.length !== data.roleIds.length) {
      throw AppError.badRequest('One or more invalid role IDs');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user with roles
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        phone: data.phone,
        roles: {
          create: data.roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(createdById, 'CREATE', 'User', user.id, null, {
      email: user.email,
      username: user.username,
      roles: roles.map((r) => r.name),
    });

    return this.formatUser(user);
  }

  /**
   * Get users with pagination and filters
   */
  async getUsers(filters: UserFilters) {
    const { search, role, isActive, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (role) {
      where.roles = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.formatUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
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
      throw AppError.notFound('User not found');
    }

    return this.formatUserWithPermissions(user);
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserInput, updatedById?: string) {
    const existingUser = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!existingUser) {
      throw AppError.notFound('User not found');
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw AppError.conflict('Email already exists');
      }
    }

    // Check username uniqueness if changing
    if (data.username && data.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: data.username },
      });
      if (usernameExists) {
        throw AppError.conflict('Username already exists');
      }
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.email) updateData.email = data.email;
    if (data.username) updateData.username = data.username;
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.middleName !== undefined) updateData.middleName = data.middleName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    // Update roles if provided
    if (data.roleIds) {
      // Verify all roles exist
      const roles = await prisma.role.findMany({
        where: { id: { in: data.roleIds } },
      });
      if (roles.length !== data.roleIds.length) {
        throw AppError.badRequest('One or more invalid role IDs');
      }

      // Delete existing roles and create new ones
      await prisma.userRole.deleteMany({
        where: { userId: id },
      });

      await prisma.userRole.createMany({
        data: data.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(updatedById, 'UPDATE', 'User', id,
      { email: existingUser.email, roles: existingUser.roles.map((r) => r.role.name) },
      { email: updatedUser.email, roles: updatedUser.roles.map((r) => r.role.name) }
    );

    return this.formatUser(updatedUser);
  }

  /**
   * Soft delete user
   */
  async deleteUser(id: string, deletedById?: string) {
    // Cannot delete yourself
    if (id === deletedById) {
      throw AppError.badRequest('Cannot delete your own account');
    }

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Create audit log
    await this.createAuditLog(deletedById, 'DELETE', 'User', id, {
      email: user.email,
    }, null);

    return { message: 'User deleted successfully' };
  }

  /**
   * Activate user
   */
  async activateUser(id: string, activatedById?: string) {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (user.isActive) {
      throw AppError.badRequest('User is already active');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    await this.createAuditLog(activatedById, 'ACTIVATE', 'User', id,
      { isActive: false }, { isActive: true });

    return { message: 'User activated successfully' };
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: string, deactivatedById?: string) {
    // Cannot deactivate yourself
    if (id === deactivatedById) {
      throw AppError.badRequest('Cannot deactivate your own account');
    }

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (!user.isActive) {
      throw AppError.badRequest('User is already inactive');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    await this.createAuditLog(deactivatedById, 'DEACTIVATE', 'User', id,
      { isActive: true }, { isActive: false });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Bulk import users from CSV data
   */
  async bulkImportUsers(users: BulkImportUser[], importedById?: string) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; email: string; error: string }>,
    };

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      try {
        // Find role by name
        const role = await prisma.role.findUnique({
          where: { name: userData.role },
        });

        if (!role) {
          throw new Error(`Invalid role: ${userData.role}`);
        }

        // Generate password if not provided
        const password = userData.password || this.generateTempPassword();

        await this.createUser({
          email: userData.email,
          username: userData.username,
          password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          roleIds: [role.id],
        }, importedById);

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          email: userData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Create audit log for bulk import
    await this.createAuditLog(importedById, 'BULK_IMPORT', 'User', null, null, {
      totalRows: users.length,
      success: results.success,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Get user activity/audit logs
   */
  async getUserActivity(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          OR: [
            { userId },
            { resourceId: userId, resource: 'User' },
          ],
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({
        where: {
          OR: [
            { userId },
            { resourceId: userId, resource: 'User' },
          ],
        },
      }),
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

  // Private methods

  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
        displayName: ur.role.displayName,
      })) || [],
    };
  }

  private formatUserWithPermissions(user: any) {
    const formatted = this.formatUser(user);
    const permissions = [
      ...new Set(
        user.roles?.flatMap((ur: any) =>
          ur.role.permissions?.map((rp: any) => rp.permission.name) || []
        ) || []
      ),
    ];
    return { ...formatted, permissions };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + '!1Aa'; // Ensure it meets password requirements
  }

  private async createAuditLog(
    userId: string | null | undefined,
    action: string,
    resource: string,
    resourceId: string | null,
    oldValues: any,
    newValues: any
  ) {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
      },
    });
  }
}

export const userService = new UserService();
