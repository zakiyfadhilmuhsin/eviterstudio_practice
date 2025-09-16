import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { UserProfileDto, UpdateProfileDto } from '../dto';
import { plainToInstance } from 'class-transformer';
import { AuthenticationService } from './authentication.service';

@Injectable()
export class ProfileService {
    /**
     * == Table of Contents ==
     * 
     * 1. Profile Management
     *    - Get Profile
     *    - Update Profile
     * 
     * =============================================
     */
    constructor(
        private usersService: UsersService,
        @Inject(forwardRef(() => AuthenticationService))
        private authenticationService: AuthenticationService
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
    async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<UserProfileDto> {
        try {
            // Check if user exists first
            const existingUser = await this.usersService.findById(userId);
            if (!existingUser) {
                throw new NotFoundException('User not found');
            }

            // Filter out undefined values to avoid updating fields with null
            const filteredData = Object.entries(updateData)
                .filter(([key, value]) => value !== undefined && value !== null && value !== '')
                .reduce((obj, [key, value]) => ({
                    ...obj,
                    [key]: value
                }), {});

            // If no valid data to update, return current profile
            if (Object.keys(filteredData).length === 0) {
                throw new BadRequestException('No valid data provided for update');
            }

            // Update user profile
            const updatedUser = await this.usersService.updateUser(userId, filteredData);

            // Return updated profile
            return plainToInstance(UserProfileDto, updatedUser, {
                excludeExtraneousValues: true
            });
        } catch (error) {
            if (error.message === 'Username already exists') {
                throw new BadRequestException('Username already exists');
            }
            throw error;
        }
    }
}