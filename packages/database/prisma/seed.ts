import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('Seeding database...');

  // Create default permissions
  const permissions = [
    // User permissions
    { name: 'users:create', displayName: 'Create Users', resource: 'users', action: 'create' },
    { name: 'users:read', displayName: 'View Users', resource: 'users', action: 'read' },
    { name: 'users:update', displayName: 'Update Users', resource: 'users', action: 'update' },
    { name: 'users:delete', displayName: 'Delete Users', resource: 'users', action: 'delete' },
    // Role permissions
    { name: 'roles:create', displayName: 'Create Roles', resource: 'roles', action: 'create' },
    { name: 'roles:read', displayName: 'View Roles', resource: 'roles', action: 'read' },
    { name: 'roles:update', displayName: 'Update Roles', resource: 'roles', action: 'update' },
    { name: 'roles:delete', displayName: 'Delete Roles', resource: 'roles', action: 'delete' },
    // Audit permissions
    { name: 'audit:read', displayName: 'View Audit Logs', resource: 'audit', action: 'read' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  console.info(`Created ${permissions.length} permissions`);

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Full system access',
      isSystem: true,
    },
  });

  // Staff and student roles - created for future use
  await prisma.role.upsert({
    where: { name: 'staff' },
    update: {},
    create: {
      name: 'staff',
      displayName: 'Staff',
      description: 'University staff member',
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: 'student' },
    update: {},
    create: {
      name: 'student',
      displayName: 'Student',
      description: 'Enrolled student',
      isSystem: true,
    },
  });

  console.info('Created default roles');

  // Assign all permissions to admin role
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.info('Assigned permissions to admin role');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hormuud.edu.so' },
    update: {},
    create: {
      email: 'admin@hormuud.edu.so',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      emailVerified: true,
      isActive: true,
    },
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.info('Created admin user: admin@hormuud.edu.so (password: admin123)');
  console.info('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
