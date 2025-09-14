import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-google-oauth20";
import { UsersService } from "src/users/users.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService
    ) {
        super({
            clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
            scope: ['profile', 'email']
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
        const { emails, displayName, photos } = profile;
        
        const email = emails[0].value;
        const firstName = displayName?.split(' ')[0];
        const lastName = displayName?.split(' ')[1] || '';
        const picture = photos?.[0]?.value;

        let user = await this.usersService.findByEmail(email);
        if (!user) {
            // Jika user belum ada, buat user baru
            user = {
                id: Date.now(), // Contoh sederhana, gunakan UUID atau metode lain di produksi
                email,
                password: '', // Tidak perlu password untuk OAuth
                firstName,
                lastName,
                picture
            };
            // Simpan user baru ke database di sini jika perlu
        }

        done(null, user); // Kirim user ke request
    }
}