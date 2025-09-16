import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeeding() {
  console.log('🔍 Verifying RBAC seeding...');

  // Check roles
  const roles = await prisma.role.findMany();
  console.log('\n📋 Roles:');
  roles.forEach((role) => {
    console.log(`  - ${role.name}: ${role.description} (${role.isActive ? 'Active' : 'Inactive'})`);
  });

  // Check permissions
  const permissions = await prisma.permission.findMany({
    orderBy: { resource: 'asc' },
  });
  console.log('\n🔐 Permissions:');
  permissions.forEach((permission) => {
    console.log(`  - ${permission.name}: ${permission.description}`);
  });

  // Check role permissions
  console.log('\n🔗 Role Permissions:');
  for (const role of roles) {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      include: { permission: true },
    });

    console.log(`\n  ${role.name}:`);
    rolePermissions.forEach((rp) => {
      console.log(`    - ${rp.permission.name}`);
    });
  }

  console.log('\n✅ Verification completed!');
}

async function main() {
  try {
    await verifySeeding();
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();