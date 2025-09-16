import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator - Specifies required roles for accessing an endpoint
 * @param roles - Array of role names required
 *
 * Usage:
 * @Roles('admin', 'moderator')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);