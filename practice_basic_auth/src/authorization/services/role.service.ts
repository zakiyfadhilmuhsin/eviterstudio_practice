import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CreateRoleDto {
    name: string;
    description?: string;
}

export interface UpdateRoleDto {
    name?: string;
    description?: string;
    isActive?: boolean;
}

export interface AssignRoleDto {
    userId: string;
    roleId: string;
    expiresAt?: Date;
}

@Injectable()
export class RoleService {
    /**
     * == Table of Contents ==
     * 
     * 1. Create Role
     * 2. Get All Roles
     * 3. Get Role By ID
     * 4. Update Role
     * 5. Delete Role
     * 6. Assign Role to User
     * 7. Remove Role from User
     * 8. Get Users with Specific Role
     * 9. Assign Permissions to Role
     * 
     * =======================
     */
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new role
     * @param createRoleDto Role creation data
     * @returns Promise<Role>
     */
    async createRole(createRoleDto: CreateRoleDto) {
        const { name, description } = createRoleDto;

        // Check if role already exists
        const existingRole = await this.prisma.role.findUnique({
            where: { name },
        });

        if (existingRole) {
            throw new BadRequestException(`Role '${name}' already exists`);
        }

        return this.prisma.role.create({
            data: {
                name,
                description,
                isSystem: false, // Custom roles are not system roles
            },
        });
    }

    /**
     * Get all roles
     * @param includeInactive Include inactive roles
     * @returns Promise<Role[]>
     */
    async getAllRoles(includeInactive = false) {
        return this.prisma.role.findMany({
            where: includeInactive ? {} : { isActive: true },
            include: {
                _count: {
                    select: {
                        userRoles: true,
                        rolePermissions: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get role by ID
     * @param roleId Role ID
     * @returns Promise<Role>
     */
    async getRoleById(roleId: string) {
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
                userRoles: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                username: true,
                            },
                        },
                    },
                },
            },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        return role;
    }

    /**
     * Update role
     * @param roleId Role ID
     * @param updateRoleDto Update data
     * @returns Promise<Role>
     */
    async updateRole(roleId: string, updateRoleDto: UpdateRoleDto) {
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        // Prevent modification of system roles
        if (role.isSystem) {
            throw new BadRequestException('Cannot modify system roles');
        }

        // Check if name is being changed and already exists
        if (updateRoleDto.name && updateRoleDto.name !== role.name) {
            const existingRole = await this.prisma.role.findUnique({
                where: { name: updateRoleDto.name },
            });

            if (existingRole) {
                throw new BadRequestException(`Role '${updateRoleDto.name}' already exists`);
            }
        }

        return this.prisma.role.update({
            where: { id: roleId },
            data: updateRoleDto,
        });
    }

    /**
     * Delete role
     * @param roleId Role ID
     * @returns Promise<void>
     */
    async deleteRole(roleId: string): Promise<void> {
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        if (role.isSystem) {
            throw new BadRequestException('Cannot delete system roles');
        }

        await this.prisma.role.delete({
            where: { id: roleId },
        });
    }

    /**
     * Assign role to user
     * @param assignRoleDto Assignment data
     * @param assignedBy Who is assigning the role
     * @returns Promise<UserRole>
     */
    async assignRoleToUser(assignRoleDto: AssignRoleDto, assignedBy?: string) {
        const { userId, roleId, expiresAt } = assignRoleDto;

        // Check if role exists and is active
        const role = await this.prisma.role.findFirst({
            where: { id: roleId, isActive: true },
        });

        if (!role) {
            throw new NotFoundException('Role not found or inactive');
        }

        // Check if user exists and is active
        const user = await this.prisma.user.findFirst({
            where: { id: userId, isActive: true },
        });

        if (!user) {
            throw new NotFoundException('User not found or inactive');
        }

        // Check if user already has this role
        const existingAssignment = await this.prisma.userRole.findFirst({
            where: { userId, roleId },
        });

        if (existingAssignment) {
            throw new BadRequestException('User already has this role');
        }

        return this.prisma.userRole.create({
            data: {
                userId,
                roleId,
                assignedBy,
                expiresAt,
            },
            include: {
                role: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                    },
                },
            },
        });
    }

    /**
     * Remove role from user
     * @param userId User ID
     * @param roleId Role ID
     * @returns Promise<void>
     */
    async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
        const userRole = await this.prisma.userRole.findFirst({
            where: { userId, roleId },
        });

        if (!userRole) {
            throw new NotFoundException('User role assignment not found');
        }

        await this.prisma.userRole.delete({
            where: { id: userRole.id },
        });
    }

    /**
     * Get users with specific role
     * @param roleId Role ID
     * @returns Promise<UserRole[]>
     */
    async getUsersWithRole(roleId: string) {
        return this.prisma.userRole.findMany({
            where: {
                roleId,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        isActive: true,
                        isVerified: true,
                    },
                },
                role: true,
            },
        });
    }

    /**
     * Assign permissions to role
     * @param roleId Role ID
     * @param permissionIds Array of permission IDs
     * @returns Promise<void>
     */
    async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        // Remove existing permissions
        await this.prisma.rolePermission.deleteMany({
            where: { roleId },
        });

        // Add new permissions
        if (permissionIds.length > 0) {
            const rolePermissions = permissionIds.map((permissionId) => ({
                roleId,
                permissionId,
            }));

            await this.prisma.rolePermission.createMany({
                data: rolePermissions,
                skipDuplicates: true,
            });
        }
    }
}