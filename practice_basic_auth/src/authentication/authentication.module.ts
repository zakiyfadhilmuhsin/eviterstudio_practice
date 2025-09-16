import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { UsersModule } from "src/users/users.module";
import { EmailModule } from "src/email/email.module";

// Controllers
import { AuthenticationController } from "./controllers/authentication.controller";
import { SecurityAdminController } from "./controllers/security-admin.controller";

// Services
import { AuthenticationService } from "./services/authentication.service";
import { PasswordService } from "./services/password.service";
import { EmailVerificationService } from "./services/email-verification.service";
import { OAuthService } from "./services/oauth.service";
import { ProfileService } from "./services/profile.service";
import { SessionService } from "./services/session.service";
import { RefreshTokenService } from "./services/refresh-token.service";
import { AccountLockoutService } from "./services/account-lockout.service";
import { SecurityService } from "./services/security.service";
import { TwoFactorAuthService } from "./services/two-factor-auth.service";
import { TempTokenService } from "./services/temp-token.service";

// Strategies
import { LocalStrategy } from "./strategies/local.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

// Guards
import { RateLimitGuard } from "./guards/rate-limit.guard";

// Configuration
import { createThrottlerConfig } from "./config/throttler.config";
import { AuthorizationModule } from "src/authorization/authentication.module";

@Module({
    imports: [
        PassportModule,
        UsersModule,
        EmailModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-super-secret-key-here',
            signOptions: { expiresIn: '1d' },
        }),
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => createThrottlerConfig(configService),
        }),
        AuthorizationModule
    ],
    controllers: [
        AuthenticationController,
        SecurityAdminController
    ],
    providers: [
        // Core authentication services
        AuthenticationService,
        PasswordService,
        EmailVerificationService,
        OAuthService,
        ProfileService,
        SessionService,
        RefreshTokenService,

        // Security services
        AccountLockoutService,
        SecurityService,
        TwoFactorAuthService,
        TempTokenService,

        // Guards
        RateLimitGuard,

        // Passport strategies
        LocalStrategy,
        GoogleStrategy,
        JwtStrategy
    ],
    exports: [
        // Core services
        AuthenticationService,
        PasswordService,
        EmailVerificationService,
        OAuthService,
        ProfileService,
        SessionService,
        RefreshTokenService,

        // Security services
        AccountLockoutService,
        SecurityService,
        TwoFactorAuthService,
        TempTokenService,

        // Guards
        RateLimitGuard
    ]
})
export class AuthenticationModule { }