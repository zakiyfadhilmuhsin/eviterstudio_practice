import { Module } from '@nestjs/common';
import { RbacService } from './services/rbac.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RbacGuard } from './guards/rbac.guard';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { UserRolesController } from './controllers/user-roles.controller';
import { RbacSeeder } from './seeders/rbac.seeder';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [
        RolesController,
        PermissionsController,
        UserRolesController,
    ],
    providers: [
        RbacService,
        RoleService,
        PermissionService,
        RolesGuard,
        PermissionsGuard,
        RbacGuard,
        RbacSeeder,
    ],
    exports: [
        RbacService,
        RoleService,
        PermissionService,
        RolesGuard,
        PermissionsGuard,
        RbacGuard,
        RbacSeeder,
    ],
})
export class AuthorizationModule {}