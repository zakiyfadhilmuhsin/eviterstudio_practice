import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { UserProfileDto } from '../dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ProfileService {
    /**
     * == Table of Contents ==
     * 
     * 1. Profile Management
     *    - Get Profile
     *    - Update Profile
     *    - Delete Profile
     * 
     * =============================================
     */
    constructor(
        private usersService: UsersService
    ) {}

    // =============================================
    // PROFILE MANAGEMENT
    // =============================================

    /**
     * Get Profile
     * Get the profile of the authenticated user.
     * @param userId 
     * @returns 
     */
    async getProfile(userId: string): Promise<UserProfileDto> {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return plainToInstance(UserProfileDto, user, {
            excludeExtraneousValues: true
        });
    }

    /**
     * Update Profile
     * Update the profile of the authenticated user.
     * @param userId 
     * @param updateData 
     * @returns 
     */
    async updateProfile(userId: string, updateData: {
        username?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        avatar?: string;
    }): Promise<UserProfileDto> {
        // This would use a method in UsersService
        // For now, just get the profile
        return this.getProfile(userId);
    }

    /**
     * Delete Profile
     * Soft delete the profile of the authenticated user.
     * @param userId 
     * @returns 
     */
    async deleteProfile(userId: string): Promise<{ message: string }> {
        // Soft delete - mark as inactive
        // This would be handled by AuthenticationService.deactivateAccount
        return { message: 'Profile deletion should be handled by AuthenticationService.deactivateAccount' };
    }
}