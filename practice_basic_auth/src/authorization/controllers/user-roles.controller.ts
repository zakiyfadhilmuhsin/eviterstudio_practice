import {
  Controller,
  Get,
  Post,
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
import { RoleService, AssignRoleDto } from '../services/role.service';
import { RbacService } from '../services/rbac.service';

@Controller('auth/users')
@UseGuards(JwtAuthGuard)
export class UserRolesController {
  /**
   * == Table of Contents ==
   * 
   * 1. Get My Roles and Permissions
   * 2. Get User's Roles and Permissions by ID
   * 3. Assign Role to User
   * 4. Remove Role from User
   * 5. Check if User has Specific Role
   * 6. Check if User has Specific Permission
   * 
   * =======================
   */
  constructor(
    private roleService: RoleService,
    private rbacService: RbacService,
  ) {}

  /**
   * Get current user's roles and permissions
   * No special role required (own profile)
   */
  @Get('me/roles')
  async getMyRoles(@Request() req) {
    const [roles, permissions] = await Promise.all([
      this.rbacService.getUserRoles(req.user.id),
      this.rbacService.getUserPermissions(req.user.id),
    ]);

    return {
      message: 'User roles and permissions retrieved successfully',
      roles,
      permissions,
    };
  }

  /**
   * Get user's roles and permissions by ID
   * Requires admin or moderator role
   */
  @Get(':userId/roles')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getUserRoles(@Param('userId') userId: string) {
    const [roles, permissions] = await Promise.all([
      this.rbacService.getUserRoles(userId),
      this.rbacService.getUserPermissions(userId),
    ]);

    return {
      message: 'User roles and permissions retrieved successfully',
      roles,
      permissions,
    };
  }

  /**
   * Assign role to user
   * Requires admin role
   */
  @Post(':userId/roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async assignRoleToUser(
    @Param('userId') userId: string,
    @Body() body: { roleId: string; expiresAt?: string },
    @Request() req,
  ) {
    const assignRoleDto: AssignRoleDto = {
      userId,
      roleId: body.roleId,
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
  @Delete(':userId/roles/:roleId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async removeRoleFromUser(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    await this.roleService.removeRoleFromUser(userId, roleId);
    return {
      message: 'Role removed from user successfully',
    };
  }

  /**
   * Check if user has specific role
   * Requires admin or moderator role (or checking own roles)
   */
  @Get(':userId/roles/:roleName/check')
  async checkUserRole(
    @Param('userId') userId: string,
    @Param('roleName') roleName: string,
    @Request() req,
  ) {
    // Allow users to check their own roles or require admin/moderator
    const canCheck =
      req.user.id === userId ||
      (await this.rbacService.hasAnyRole(req.user.id, ['admin', 'moderator']));

    if (!canCheck) {
      return {
        message: 'Insufficient permissions',
        hasRole: false,
      };
    }

    const hasRole = await this.rbacService.hasAnyRole(userId, [roleName]);
    return {
      message: 'Role check completed',
      hasRole,
    };
  }

  /**
   * Check if user has specific permission
   * Requires admin or moderator role (or checking own permissions)
   */
  @Get(':userId/permissions/:permissionName/check')
  async checkUserPermission(
    @Param('userId') userId: string,
    @Param('permissionName') permissionName: string,
    @Request() req,
  ) {
    // Allow users to check their own permissions or require admin/moderator
    const canCheck =
      req.user.id === userId ||
      (await this.rbacService.hasAnyRole(req.user.id, ['admin', 'moderator']));

    if (!canCheck) {
      return {
        message: 'Insufficient permissions',
        hasPermission: false,
      };
    }

    const hasPermission = await this.rbacService.hasAnyPermission(userId, [permissionName]);
    return {
      message: 'Permission check completed',
      hasPermission,
    };
  }
}