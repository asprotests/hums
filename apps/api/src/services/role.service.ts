import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';

export interface CreateRoleInput {
  name: string;
  displayName: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleInput {
  name?: string;
  displayName?: string;
  description?: string;
  permissionIds?: string[];
}

export class RoleService {
  /**
   * Get all roles
   */
  async getRoles() {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        displayName: rp.permission.displayName,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw AppError.notFound('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        displayName: rp.permission.displayName,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleInput, createdById?: string) {
    // Check if role name already exists
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw AppError.conflict('Role name already exists');
    }

    // Verify all permissions exist
    if (data.permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: { id: { in: data.permissionIds } },
      });
      if (permissions.length !== data.permissionIds.length) {
        throw AppError.badRequest('One or more invalid permission IDs');
      }
    }

    const role = await prisma.role.create({
      data: {
        name: data.name.toUpperCase().replace(/\s+/g, '_'),
        displayName: data.displayName,
        description: data.description,
        isSystem: false,
        permissions: {
          create: data.permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Audit log
    await this.createAuditLog(createdById, 'CREATE', 'Role', role.id, null, {
      name: role.name,
      permissions: role.permissions.map((rp) => rp.permission.name),
    });

    return this.getRoleById(role.id);
  }

  /**
   * Update role
   */
  async updateRole(id: string, data: UpdateRoleInput, updatedById?: string) {
    const existing = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!existing) {
      throw AppError.notFound('Role not found');
    }

    // Cannot modify system roles' name
    if (existing.isSystem && data.name && data.name !== existing.name) {
      throw AppError.forbidden('Cannot modify system role name');
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== existing.name) {
      const nameExists = await prisma.role.findUnique({
        where: { name: data.name },
      });
      if (nameExists) {
        throw AppError.conflict('Role name already exists');
      }
    }

    // Update basic info
    await prisma.role.update({
      where: { id },
      data: {
        name: data.name ? data.name.toUpperCase().replace(/\s+/g, '_') : undefined,
        displayName: data.displayName,
        description: data.description,
      },
    });

    // Update permissions if provided
    if (data.permissionIds) {
      // Verify all permissions exist
      if (data.permissionIds.length > 0) {
        const permissions = await prisma.permission.findMany({
          where: { id: { in: data.permissionIds } },
        });
        if (permissions.length !== data.permissionIds.length) {
          throw AppError.badRequest('One or more invalid permission IDs');
        }
      }

      // Delete existing and create new
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      if (data.permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }

    // Audit log
    await this.createAuditLog(updatedById, 'UPDATE', 'Role', id,
      { name: existing.name, permissions: existing.permissions.map((rp) => rp.permission.name) },
      { name: data.name || existing.name, permissionIds: data.permissionIds }
    );

    return this.getRoleById(id);
  }

  /**
   * Delete role
   */
  async deleteRole(id: string, deletedById?: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw AppError.notFound('Role not found');
    }

    if (role.isSystem) {
      throw AppError.forbidden('Cannot delete system role');
    }

    if (role._count.users > 0) {
      throw AppError.badRequest(
        `Cannot delete role. ${role._count.users} user(s) are assigned to this role.`
      );
    }

    // Delete permissions first
    await prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    await prisma.role.delete({
      where: { id },
    });

    // Audit log
    await this.createAuditLog(deletedById, 'DELETE', 'Role', id, {
      name: role.name,
    }, null);

    return { message: 'Role deleted successfully' };
  }

  /**
   * Get all permissions
   */
  async getPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    // Group by resource
    const grouped: Record<string, typeof permissions> = {};
    for (const perm of permissions) {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    }

    return {
      permissions,
      grouped,
    };
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

export const roleService = new RoleService();
