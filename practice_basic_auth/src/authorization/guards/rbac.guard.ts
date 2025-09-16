import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../services/rbac.service';
import { RBAC_KEY, RbacOptions } from '../decorators/rbac.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private rbacService: RbacService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const rbacOptions = this.reflector.getAllAndOverride<RbacOptions>(RBAC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!rbacOptions) {
            return true; // No RBAC constraints
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return false;
        }

        const { roles, permissions, requireAll = false } = rbacOptions;

        // Check roles if specified
        if (roles && roles.length > 0) {
            const roleCheck = requireAll
                ? await this.rbacService.hasAllRoles(user.id, roles)
                : await this.rbacService.hasAnyRole(user.id, roles);

            if (!roleCheck) {
                return false;
            }
        }

        // Check permissions if specified
        if (permissions && permissions.length > 0) {
            const permissionCheck = requireAll
                ? await this.rbacService.hasAllPermissions(user.id, permissions)
                : await this.rbacService.hasAnyPermission(user.id, permissions);

            if (!permissionCheck) {
                return false;
            }
        }

        return true;
    }
}