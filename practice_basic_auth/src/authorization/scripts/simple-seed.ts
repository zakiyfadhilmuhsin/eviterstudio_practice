import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRbac() {
  console.log('🌱 Starting RBAC seeding...');

  // Seed roles
  const roles = [
    { name: 'admin', description: 'Administrator with full system access' },
    { name: 'moderator', description: 'Moderator with limited administrative access' },
    { name: 'user', description: 'Regular user with basic access' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log('✅ Default roles seeded');

  // Seed permissions
  const permissions = [
    // User management
    { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
    { name: 'users:create', resource: 'users', action: 'create', description: 'Create users' },
    { name: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
    { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },

    // Role management
    { name: 'roles:read', resource: 'roles', action: 'read', description: 'View roles' },
    { name: 'roles:create', resource: 'roles', action: 'create', description: 'Create roles' },
    { name: 'roles:update', resource: 'roles', action: 'update', description: 'Update roles' },
    { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Delete roles' },

    // Permission management
    { name: 'permissions:read', resource: 'permissions', action: 'read', description: 'View permissions' },
    { name: 'permissions:create', resource: 'permissions', action: 'create', description: 'Create permissions' },
    { name: 'permissions:update', resource: 'permissions', action: 'update', description: 'Update permissions' },
    { name: 'permissions:delete', resource: 'permissions', action: 'delete', description: 'Delete permissions' },

    // Profile management
    { name: 'profile:read', resource: 'profile', action: 'read', description: 'View own profile' },
    { name: 'profile:update', resource: 'profile', action: 'update', description: 'Update own profile' },

    // System settings
    { name: 'settings:read', resource: 'settings', action: 'read', description: 'View system settings' },
    { name: 'settings:update', resource: 'settings', action: 'update', description: 'Update system settings' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
      },
      create: permission,
    });
  }
  console.log('✅ Default permissions seeded');

  // Assign permissions to roles

  // Admin gets all permissions
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Moderator gets read/update permissions for users and basic permissions
  const moderatorRole = await prisma.role.findUnique({ where: { name: 'moderator' } });
  const moderatorPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { name: { in: ['users:read', 'users:update'] } },
        { name: { in: ['roles:read', 'permissions:read'] } },
        { name: { in: ['profile:read', 'profile:update'] } },
        { name: { in: ['settings:read'] } },
      ],
    },
  });

  for (const permission of moderatorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: moderatorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: moderatorRole.id,
        permissionId: permission.id,
      },
    });
  }

  // User gets only basic profile permissions
  const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
  const userPermissions = await prisma.permission.findMany({
    where: {
      name: { in: ['profile:read', 'profile:update'] },
    },
  });

  for (const permission of userPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: userRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Role permissions assigned');
  console.log('🎉 RBAC seeding completed!');
}

async function main() {
  try {
    await seedRbac();
  } catch (error) {
    console.error('❌ Error during RBAC seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();