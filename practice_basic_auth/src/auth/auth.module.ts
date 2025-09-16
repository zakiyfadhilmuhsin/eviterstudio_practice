import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "src/users/users.module";

// Controllers
import { AuthController } from "./controllers/auth.controller";

// Services
import { AuthenticationService } from "./services/authentication.service";
import { PasswordService } from "./services/password.service";
import { EmailVerificationService } from "./services/email-verification.service";
import { OAuthService } from "./services/oauth.service";
import { ProfileService } from "./services/profile.service";
import { SessionService } from "./services/session.service";
import { RefreshTokenService } from "./services/refresh-token.service";

// Strategies
import { LocalStrategy } from "./strategies/local.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
    imports: [
        PassportModule,
        UsersModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-super-secret-key-here',
            signOptions: { expiresIn: '1d' },
        })
    ],
    controllers: [
        AuthController
    ],
    providers: [
        // Specialized services
        AuthenticationService,
        PasswordService,
        EmailVerificationService,
        OAuthService,
        ProfileService,
        SessionService,
        RefreshTokenService,

        // Passport strategies
        LocalStrategy,
        GoogleStrategy,
        JwtStrategy
    ],
    exports: [
        AuthenticationService,
        PasswordService,
        EmailVerificationService,
        OAuthService,
        ProfileService,
        SessionService,
        RefreshTokenService
    ]
})
export class AuthModule { }