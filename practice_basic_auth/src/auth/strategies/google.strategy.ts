import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        configService: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
            scope: ['profile', 'email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: Function,
    ) {
        const { emails, displayName, photos, id: providerId } = profile;

        const email = emails[0].value;
        const firstName = displayName?.split(' ')[0];
        const lastName = displayName?.split(' ')[1] || '';
        const avatar = photos?.[0]?.value;

        // Check if user already exists via OAuth
        let user = await this.usersService.findByOAuthProvider(
            'google',
            providerId,
        );

        if (!user) {
            // Check if user exists with same email
            const existingUser = await this.usersService.findByEmail(email);

            if (existingUser) {
                // User exists with email but no Google OAuth - add OAuth account
                // For now, we'll treat them as different users for security
                // In production, you might want to add a linking mechanism
                user = await this.usersService.createUserWithOAuth({
                    email: `${email}.google`, // Append .google to avoid conflict
                    firstName,
                    lastName,
                    avatar,
                    provider: 'google',
                    providerId,
                    accessToken,
                    refreshToken,
                });
            } else {
                // Create new user with OAuth
                user = await this.usersService.createUserWithOAuth({
                    email,
                    firstName,
                    lastName,
                    avatar,
                    provider: 'google',
                    providerId,
                    accessToken,
                    refreshToken,
                });
            }
        } else {
            // Update last login for existing OAuth user
            await this.usersService.updateLastLogin(user.id);
        }

        done(null, user);
    }
}