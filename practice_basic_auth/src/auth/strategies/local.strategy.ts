import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private userService: UsersService) {
        super({
            usernameField: 'email', // gunakan email sebagai username
            passwordField: 'password',
        });
    }

    async validate(email: string, password: string) {
        const user = await this.userService.findByEmail(email);

        if (!user || !user.passwords || user.passwords.length === 0) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new UnauthorizedException('Account is inactive');
        }

        // Get the active password hash
        const activePassword = user.passwords[0];
        const isPasswordValid = await bcrypt.compare(password, activePassword.hash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Update last login
        await this.userService.updateLastLogin(user.id);

        // Return user without password data
        const { passwords, ...userWithoutPasswords } = user;
        return userWithoutPasswords;
    }
}