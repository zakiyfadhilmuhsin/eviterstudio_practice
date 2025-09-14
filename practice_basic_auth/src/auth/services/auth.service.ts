import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "src/users/users.service";

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    async login(user: any) {
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: await this.jwtService.sign(payload, {
                secret: this.configService.get('JWT_SECRET')
            }) // Problemnya selalu disini. jadi jwt secret/secret sering lupa dimasukkan juga. jadi hanya payload yg membuat jwt terhubungnya gagal. kadang sudah cek berapa kali di jwt.strategy.ts ternyata masalahnya disini.
        };
    }

    async googleLogin(googleLoginDto: { accessToken: string }) {
        // Di produksi: verifikasi token Google dengan Google API
        // Contoh sederhana: kita asumsikan token valid dan dapatkan info dari Google
        // Untuk demo, kita skip verifikasi langsung — TAPI DI PRODUKSI WAJIB DIVERIFIKASI!

        // Anda bisa gunakan: https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}
        // Tapi karena kita pakai passport-google-oauth20, itu sudah otomatis diverifikasi
        // Jadi di strategy kita sudah dapat user, jadi cukup login seperti biasa
        throw new UnauthorizedException('Google login handled by strategy');
    }
}