import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions decorator - Specifies required permissions for accessing an endpoint
 * @param permissions - Array of permission names required (e.g., 'users:create', 'posts:delete')
 *
 * Usage:
 * @RequirePermissions('users:create', 'users:update')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);