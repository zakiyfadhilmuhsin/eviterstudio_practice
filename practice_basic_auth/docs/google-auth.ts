/** 
    Catatan:
    Perbedaan antara kedua endpoint Google OAuth ini adalah:

    POST /auth/google (Token Login - Mobile/SPA)

    @Post('google')
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
        return this.authService.googleTokenLogin(googleLoginDto);
    }

    Digunakan untuk:
    - Mobile apps (Android/iOS)
    - Single Page Applications (React, Vue, Angular)
    - Desktop apps

    Cara kerja:
    1. Client sudah mendapatkan Google access token dari Google SDK
    2. Client mengirim token ke endpoint ini
    3. Server memverifikasi token langsung ke Google
    4. Server return JWT token untuk authentication

    Request body:
    {
        "accessToken": "ya29.a0AfH6SMC...",
        "idToken": "eyJhbGciOiJSUzI1NiIs..."
    }

    ---
    GET /auth/google (Redirect Flow - Web)

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {
        // Redirect ke Google OAuth
    }

    Digunakan untuk:
    - Web applications (traditional web apps)
    - Server-side rendered apps

    Cara kerja:
    1. User klik "Login with Google" di web
    2. Browser redirect ke Google OAuth page
    3. User login di Google
    4. Google redirect kembali ke /auth/google/callback
    5. Server process callback dan return JWT

    Flow:
    User → GET /auth/google → Redirect ke Google →
    Google login → Redirect ke /auth/google/callback → JWT token

    ---
    Kapan pakai yang mana?

    Gunakan POST (Token):
    - ✅ Mobile apps (React Native, Flutter)
    - ✅ SPA yang sudah ada Google SDK
    - ✅ Client sudah handle Google login sendiri

    Gunakan GET (Redirect):
    - ✅ Traditional web apps
    - ✅ Server-side rendered apps
    - ✅ Tidak mau implement Google SDK di frontend

    Kedua endpoint ini melengkapi satu sama lain untuk mendukung berbagai jenis aplikasi client.
*/