import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/authentication/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { PermissionService, CreatePermissionDto, UpdatePermissionDto } from '../services/permission.service';

@Controller('auth/permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionsController {
    /**
     * == Table of Contents ==
     * 
     * 1. Create Permission
     * 2. Get All Permissions
     * 3. Get Permissions by Resource
     * 4. Create Resource Permissions
     * 5. Get Resources
     * 6. Get Resource Actions
     * 7. Get Permission by ID
     * 8. Update Permission
     * 9. Delete Permission
     * 
     * =======================
     */
    constructor(private permissionService: PermissionService) { }

    /**
     * Create a new permission
     * Requires admin role
     */
    @Post()
    @Roles('admin')
    @HttpCode(HttpStatus.CREATED)
    async createPermission(@Body() createPermissionDto: CreatePermissionDto) {
        const permission = await this.permissionService.createPermission(createPermissionDto);
        return {
            message: 'Permission created successfully',
            permission,
        };
    }

    /**
     * Get all permissions
     * Requires admin or moderator role
     */
    @Get()
    @Roles('admin', 'moderator')
    async getAllPermissions() {
        const permissions = await this.permissionService.getAllPermissions();
        return {
            message: 'Permissions retrieved successfully',
            permissions,
        };
    }

    /**
     * Get permissions by resource
     * Requires admin or moderator role
     */
    @Get('by-resource')
    @Roles('admin', 'moderator')
    async getPermissionsByResource(@Query('resource') resource: string) {
        const permissions = await this.permissionService.getPermissionsByResource(resource);
        return {
            message: 'Permissions retrieved successfully',
            permissions,
        };
    }

    /**
     * Create standard CRUD permissions for a resource
     * Requires admin role
     */
    @Post('resources/:resource')
    @Roles('admin')
    @HttpCode(HttpStatus.CREATED)
    async createResourcePermissions(
        @Param('resource') resource: string,
        @Body() body: { description?: string },
    ) {
        const permissions = await this.permissionService.createResourcePermissions(
            resource,
            body.description,
        );
        return {
            message: `CRUD permissions created for resource '${resource}'`,
            permissions,
        };
    }

    /**
     * Get available resources
     * Requires admin or moderator role
     */
    @Get('meta/resources')
    @Roles('admin', 'moderator')
    async getResources() {
        const resources = await this.permissionService.getResources();
        return {
            message: 'Resources retrieved successfully',
            resources,
        };
    }

    /**
     * Get available actions for a resource
     * Requires admin or moderator role
     */
    @Get('meta/resources/:resource/actions')
    @Roles('admin', 'moderator')
    async getResourceActions(@Param('resource') resource: string) {
        const actions = await this.permissionService.getResourceActions(resource);
        return {
            message: 'Resource actions retrieved successfully',
            actions,
        };
    }

    /**
     * Get permission by ID
     * Requires admin or moderator role
     */
    @Get(':id')
    @Roles('admin', 'moderator')
    async getPermissionById(@Param('id') id: string) {
        const permission = await this.permissionService.getPermissionById(id);
        return {
            message: 'Permission retrieved successfully',
            permission,
        };
    }

    /**
     * Update permission
     * Requires admin role
     */
    @Put(':id')
    @Roles('admin')
    async updatePermission(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
        const permission = await this.permissionService.updatePermission(id, updatePermissionDto);
        return {
            message: 'Permission updated successfully',
            permission,
        };
    }

    /**
     * Delete permission
     * Requires admin role
     */
    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.OK)
    async deletePermission(@Param('id') id: string) {
        await this.permissionService.deletePermission(id);
        return {
            message: 'Permission deleted successfully',
        };
    }
}