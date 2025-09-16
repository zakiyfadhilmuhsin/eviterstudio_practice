import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CreatePermissionDto {
    name: string;
    resource: string;
    action: string;
    description?: string;
}

export interface UpdatePermissionDto {
    name?: string;
    resource?: string;
    action?: string;
    description?: string;
}

@Injectable()
export class PermissionService {
    /**
     * == Table of Contents ==
     * 
     * - createPermission
     * - getAllPermissions
     * - getPermissionsByResource
     * - getPermissionById
     * - updatePermission
     * - deletePermission
     * - createResourcePermissions
     * - getResources
     * - getResourceActions
     * 
     * ==========================
     */
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new permission
     * @param createPermissionDto Permission creation data
     * @returns Promise<Permission>
     */
    async createPermission(createPermissionDto: CreatePermissionDto) {
        const { name, resource, action, description } = createPermissionDto;

        // Check if permission already exists
        const existingPermission = await this.prisma.permission.findUnique({
            where: { name },
        });

        if (existingPermission) {
            throw new BadRequestException(`Permission '${name}' already exists`);
        }

        return this.prisma.permission.create({
            data: {
                name,
                resource,
                action,
                description,
            },
        });
    }

    /**
     * Get all permissions
     * @returns Promise<Permission[]>
     */
    async getAllPermissions() {
        return this.prisma.permission.findMany({
            include: {
                _count: {
                    select: {
                        rolePermissions: true,
                    },
                },
            },
            orderBy: [
                { resource: 'asc' },
                { action: 'asc' },
            ],
        });
    }

    /**
     * Get permissions by resource
     * @param resource Resource name
     * @returns Promise<Permission[]>
     */
    async getPermissionsByResource(resource: string) {
        return this.prisma.permission.findMany({
            where: { resource },
            orderBy: { action: 'asc' },
        });
    }

    /**
     * Get permission by ID
     * @param permissionId Permission ID
     * @returns Promise<Permission>
     */
    async getPermissionById(permissionId: string) {
        const permission = await this.prisma.permission.findUnique({
            where: { id: permissionId },
            include: {
                rolePermissions: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!permission) {
            throw new NotFoundException('Permission not found');
        }

        return permission;
    }

    /**
     * Update permission
     * @param permissionId Permission ID
     * @param updatePermissionDto Update data
     * @returns Promise<Permission>
     */
    async updatePermission(permissionId: string, updatePermissionDto: UpdatePermissionDto) {
        const permission = await this.prisma.permission.findUnique({
            where: { id: permissionId },
        });

        if (!permission) {
            throw new NotFoundException('Permission not found');
        }

        // Check if name is being changed and already exists
        if (updatePermissionDto.name && updatePermissionDto.name !== permission.name) {
            const existingPermission = await this.prisma.permission.findUnique({
                where: { name: updatePermissionDto.name },
            });

            if (existingPermission) {
                throw new BadRequestException(`Permission '${updatePermissionDto.name}' already exists`);
            }
        }

        return this.prisma.permission.update({
            where: { id: permissionId },
            data: updatePermissionDto,
        });
    }

    /**
     * Delete permission
     * @param permissionId Permission ID
     * @returns Promise<void>
     */
    async deletePermission(permissionId: string): Promise<void> {
        const permission = await this.prisma.permission.findUnique({
            where: { id: permissionId },
        });

        if (!permission) {
            throw new NotFoundException('Permission not found');
        }

        await this.prisma.permission.delete({
            where: { id: permissionId },
        });
    }

    /**
     * Create standard CRUD permissions for a resource
     * @param resource Resource name
     * @param description Optional description prefix
     * @returns Promise<Permission[]>
     */
    async createResourcePermissions(resource: string, description?: string) {
        const actions = ['create', 'read', 'update', 'delete', 'manage'];
        const permissions = [];

        for (const action of actions) {
            const name = `${resource}:${action}`;
            const desc = description
                ? `${description} - ${action} ${resource}`
                : `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`;

            // Check if permission already exists
            const existing = await this.prisma.permission.findUnique({
                where: { name },
            });

            if (!existing) {
                const permission = await this.prisma.permission.create({
                    data: {
                        name,
                        resource,
                        action,
                        description: desc,
                    },
                });
                permissions.push(permission);
            }
        }

        return permissions;
    }

    /**
     * Get available resources
     * @returns Promise<string[]>
     */
    async getResources() {
        const resources = await this.prisma.permission.findMany({
            select: { resource: true },
            distinct: ['resource'],
            orderBy: { resource: 'asc' },
        });

        return resources.map(r => r.resource);
    }

    /**
     * Get available actions for a resource
     * @param resource Resource name
     * @returns Promise<string[]>
     */
    async getResourceActions(resource: string) {
        const actions = await this.prisma.permission.findMany({
            where: { resource },
            select: { action: true },
            distinct: ['action'],
            orderBy: { action: 'asc' },
        });

        return actions.map(a => a.action);
    }
}