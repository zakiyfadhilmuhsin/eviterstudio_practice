import { SetMetadata } from '@nestjs/common';

export const RBAC_KEY = 'rbac';

export interface RbacOptions {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean; // If true, user must have ALL specified roles/permissions
}

/**
 * RBAC decorator - Combined roles and permissions check
 * @param options - RBAC configuration object
 *
 * Usage:
 * @Rbac({ roles: ['admin'], permissions: ['users:manage'] })
 * @UseGuards(JwtAuthGuard, RbacGuard)
 *
 * @Rbac({ roles: ['admin', 'moderator'], requireAll: false }) // OR condition
 * @Rbac({ permissions: ['users:create', 'users:read'], requireAll: true }) // AND condition
 */
export const Rbac = (options: RbacOptions) => SetMetadata(RBAC_KEY, options);