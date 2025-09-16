import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/authentication/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleService, CreateRoleDto, UpdateRoleDto, AssignRoleDto } from '../services/role.service';

@Controller('auth/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  /**
   * == Table of Contents ==
   * 
   * 1. Create Role
   * 2. Get All Roles
   * 3. Get Role by ID
   * 4. Update Role
   * 5. Delete Role
   * 6. Assign Role to User
   * 7. Remove Role from User
   * 8. Get Users with Role
   * 9. Assign Permissions to Role
   * 
   * =======================
   */
  constructor(private roleService: RoleService) {}

  /**
   * Create a new role
   * Requires admin role
   */
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.roleService.createRole(createRoleDto);
    return {
      message: 'Role created successfully',
      role,
    };
  }

  /**
   * Get all roles
   * Requires admin or moderator role
   */
  @Get()
  @Roles('admin', 'moderator')
  async getAllRoles() {
    const roles = await this.roleService.getAllRoles();
    return {
      message: 'Roles retrieved successfully',
      roles,
    };
  }

  /**
   * Get role by ID
   * Requires admin or moderator role
   */
  @Get(':id')
  @Roles('admin', 'moderator')
  async getRoleById(@Param('id') id: string) {
    const role = await this.roleService.getRoleById(id);
    return {
      message: 'Role retrieved successfully',
      role,
    };
  }

  /**
   * Update role
   * Requires admin role
   */
  @Put(':id')
  @Roles('admin')
  async updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.roleService.updateRole(id, updateRoleDto);
    return {
      message: 'Role updated successfully',
      role,
    };
  }

  /**
   * Delete role
   * Requires admin role
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string) {
    await this.roleService.deleteRole(id);
    return {
      message: 'Role deleted successfully',
    };
  }

  /**
   * Assign role to user
   * Requires admin role
   */
  @Post(':id/users')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async assignRoleToUser(
    @Param('id') roleId: string,
    @Body() body: { userId: string; expiresAt?: string },
    @Request() req,
  ) {
    const assignRoleDto: AssignRoleDto = {
      userId: body.userId,
      roleId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    };

    const userRole = await this.roleService.assignRoleToUser(assignRoleDto, req.user.id);
    return {
      message: 'Role assigned to user successfully',
      userRole,
    };
  }

  /**
   * Remove role from user
   * Requires admin role
   */
  @Delete(':roleId/users/:userId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async removeRoleFromUser(@Param('roleId') roleId: string, @Param('userId') userId: string) {
    await this.roleService.removeRoleFromUser(userId, roleId);
    return {
      message: 'Role removed from user successfully',
    };
  }

  /**
   * Get users with specific role
   * Requires admin or moderator role
   */
  @Get(':id/users')
  @Roles('admin', 'moderator')
  async getUsersWithRole(@Param('id') roleId: string) {
    const users = await this.roleService.getUsersWithRole(roleId);
    return {
      message: 'Users with role retrieved successfully',
      users,
    };
  }

  /**
   * Assign permissions to role
   * Requires admin role
   */
  @Post(':id/permissions')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async assignPermissionsToRole(
    @Param('id') roleId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    await this.roleService.assignPermissionsToRole(roleId, body.permissionIds);
    return {
      message: 'Permissions assigned to role successfully',
    };
  }
}