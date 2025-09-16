import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RbacService {
    /**
     * == Table of Contents ==
     * 
     * 1. Check if User Has Any Role
     * 2. Check if User Has All Roles
     * 3. Check if User Has Any Permission
     * 4. Check if User Has All Permissions
     * 5. Check if User Has Resource Permission
     * 6. Get User Roles
     * 7. Get User Permissions
     * 8. Is Super Admin
     * 
     * ======================
     */
    constructor(private prisma: PrismaService) { }

    /**
     * Check if user has any of the specified roles
     * @param userId User ID
     * @param roleNames Array of role names to check
     * @returns Promise<boolean>
     */
    async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
        const userRoles = await this.prisma.userRole.count({
            where: {
                userId,
                role: {
                    name: {
                        in: roleNames,
                    },
                    isActive: true,
                },
                OR: [
                    { expiresAt: null }, // No expiration
                    { expiresAt: { gt: new Date() } }, // Not expired
                ],
            },
        });

        return userRoles > 0;
    }

    /**
     * Check if user has all of the specified roles
     * @param userId User ID
     * @param roleNames Array of role names to check
     * @returns Promise<boolean>
     */
    async hasAllRoles(userId: string, roleNames: string[]): Promise<boolean> {
        const userRoles = await this.prisma.userRole.count({
            where: {
                userId,
                role: {
                    name: {
                        in: roleNames,
                    },
                    isActive: true,
                },
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
        });

        return userRoles === roleNames.length;
    }

    /**
     * Check if user has any of the specified permissions
     * @param userId User ID
     * @param permissionNames Array of permission names to check
     * @returns Promise<boolean>
     */
    async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
        const userPermissions = await this.prisma.rolePermission.count({
            where: {
                permission: {
                    name: {
                        in: permissionNames,
                    },
                },
                role: {
                    isActive: true,
                    userRoles: {
                        some: {
                            userId,
                            OR: [
                                { expiresAt: null },
                                { expiresAt: { gt: new Date() } },
                            ],
                        },
                    },
                },
            },
        });

        return userPermissions > 0;
    }

    /**
     * Check if user has all of the specified permissions
     * @param userId User ID
     * @param permissionNames Array of permission names to check
     * @returns Promise<boolean>
     */
    async hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
        const userPermissions = await this.prisma.rolePermission.count({
            where: {
                permission: {
                    name: {
                        in: permissionNames,
                    },
                },
                role: {
                    isActive: true,
                    userRoles: {
                        some: {
                            userId,
                            OR: [
                                { expiresAt: null },
                                { expiresAt: { gt: new Date() } },
                            ],
                        },
                    },
                },
            },
        });

        return userPermissions === permissionNames.length;
    }

    /**
     * Check if user has a specific permission on a resource
     * @param userId User ID
     * @param resource Resource name (e.g., 'users', 'posts')
     * @param action Action name (e.g., 'create', 'read', 'update', 'delete', 'manage')
     * @returns Promise<boolean>
     */
    async hasResourcePermission(userId: string, resource: string, action: string): Promise<boolean> {
        const permissionName = `${resource}:${action}`;
        return this.hasAnyPermission(userId, [permissionName]);
    }

    /**
     * Get all user roles
     * @param userId User ID
     * @returns Promise<Role[]>
     */
    async getUserRoles(userId: string) {
        const userRoles = await this.prisma.userRole.findMany({
            where: {
                userId,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            include: {
                role: true,
            },
        });

        return userRoles
            .filter((ur) => ur.role?.isActive)
            .map((ur) => ur.role)
            .filter(Boolean);
    }

    /**
     * Get all user permissions (through roles)
     * @param userId User ID
     * @returns Promise<Permission[]>
     */
    async getUserPermissions(userId: string) {
        const permissions = await this.prisma.permission.findMany({
            where: {
                rolePermissions: {
                    some: {
                        role: {
                            isActive: true,
                            userRoles: {
                                some: {
                                    userId,
                                    OR: [
                                        { expiresAt: null },
                                        { expiresAt: { gt: new Date() } },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
            distinct: ['id'],
        });

        return permissions;
    }

    /**
     * Check if user is super admin (has 'admin' role)
     * @param userId User ID
     * @returns Promise<boolean>
     */
    async isSuperAdmin(userId: string): Promise<boolean> {
        return this.hasAnyRole(userId, ['admin']);
    }
}