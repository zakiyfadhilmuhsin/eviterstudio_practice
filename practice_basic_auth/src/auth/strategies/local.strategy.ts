import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private userService: UsersService) {
        super({
            usernameField: 'email', // gunakan email sebagai username
            passwordField: 'password'
        });
    }

    async validate(email: string, password: string) {
        const user = await this.userService.findByEmail(email);
        
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Di produksi: bandingkan hash password dengan bcrypt.compare()
        // Contoh sederhana (HANYA UNTUK DEMO):
        if (user.password !== password) {
            throw new UnauthorizedException('Invalid email or password');
        }

        return user; // Ini akan dikirim ke req.user oleh Passport
    }
}