import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/login.dto";
import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GoogleLoginDto } from "../dto/google-login.dto";
import { LocalAuthGuard } from "../guards/local-auth.guard";

@Controller('auth')
export class AuthController {
    /**
     * 1. Register
     * 2. Login
     *  2.a. Local (username/password) Strategy
     *  2.b. OAuth (Google) Strategy
     * 3. Logout
     * 4. Email / Phone Verification
     * 5. Forgot Password / Reset Password
     * 6. Change Password
     * 7. Two-Factor Authentication (2FA)
     * 8. Account Lockout / Rate Limiting
     * 9. Remember Me / Persistent Login
     * 10. Session Management
     * 11. Profile Management
     * 12. Account Deletion / Deactivation
     */
    constructor(private authService: AuthService) {}

    @Post('login')
    @UseGuards(LocalAuthGuard)
    async login(@Body() loginDto: LoginDto, @Request() req) {
        // Passport local akan mengisi req.user jika valid
        return this.authService.login(req.user);
    }

    @Post('google')
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
        // Jika kamu ingin login via token dari frontend (misal: mobile), ini opsional
        // Tapi lebih baik gunakan redirect flow (lihat di bawah)
        throw new Error('Use Google OAuth redirect instead of direct token');
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() { }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthCallback(@Request() req) {
        // Setelah login sukses, kembalikan JWT ke frontend
        return this.authService.login(req.user);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    getProfile(@Request() req) {
        console.log(req)
        return req.user;
    }
}