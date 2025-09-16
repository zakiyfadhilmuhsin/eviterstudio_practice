/**
 🔍 RBAC Analysis & Design

  Current System Analysis

  Authentication Architecture:
  - ✅ JWT-based authentication with session management
  - ✅ Email verification enforcement via JWT strategy
  - ✅ User model with basic fields (isActive, isVerified)
  - ✅ Guards system (JwtAuthGuard, LocalAuthGuard)
  - ✅ Database audit logging support

  Integration Points:
  - JWT Strategy returns full user object to req.user
  - Guards protect routes with @UseGuards(JwtAuthGuard)
  - Prisma schema ready for extension
  - Existing audit log system

  🏗️ RBAC Schema Design

  I'll design a flexible, scalable RBAC system with the following structure:

  Core RBAC Entities

  // Roles - Define user roles (Admin, User, Moderator, etc.)
  model Role {
    id          String   @id @default(cuid())
    name        String   @unique
    description String?
    isActive    Boolean  @default(true)
    isSystem    Boolean  @default(false) // Prevent deletion of system roles

    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    // Relations
    userRoles   UserRole[]
    rolePermissions RolePermission[]

    @@map("roles")
  }

  // Permissions - Define granular permissions (CREATE_USER, DELETE_POST, etc.)
  model Permission {
    id          String   @id @default(cuid())
    name        String   @unique
    resource    String   // users, posts, orders, etc.
    action      String   // create, read, update, delete, manage
    description String?

    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    // Relations
    rolePermissions RolePermission[]

    @@map("permissions")
  }

  // Many-to-many: Role <-> Permission
  model RolePermission {
    id           String @id @default(cuid())
    roleId       String
    permissionId String

    createdAt    DateTime @default(now())

    // Relations
    role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
    permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

    @@unique([roleId, permissionId])
    @@map("role_permissions")
  }

  // Many-to-many: User <-> Role
  model UserRole {
    id        String   @id @default(cuid())
    userId    String
    roleId    String
    assignedBy String? // Who assigned this role
    
    createdAt DateTime @default(now())
    expiresAt DateTime? // Optional role expiration
    
    // Relations
    user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
    role      Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
    
    @@unique([userId, roleId])
    @@map("user_roles")
  }

  User Model Extension

  model User {
    // ... existing fields ...

    // Add RBAC relation
    userRoles UserRole[]
  }

  🎯 RBAC Features Design

  1. Permission System

  - Resource-based permissions: users:create, posts:delete, orders:manage
  - Hierarchical permissions: manage includes all CRUD operations
  - Dynamic permission checking: Runtime permission evaluation

  2. Role Management

  - System roles: Admin, User (cannot be deleted)
  - Custom roles: Organization-specific roles
  - Role inheritance: Roles can inherit permissions
  - Time-based roles: Optional role expiration

  3. Guard System

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'moderator')

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('users:delete')

  // Combined approach
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Rbac({ roles: ['admin'], permissions: ['users:manage'] })

  4. Management Endpoints

  // Role Management
  POST   /auth/roles              // Create role
  GET    /auth/roles              // List roles
  PUT    /auth/roles/:id          // Update role
  DELETE /auth/roles/:id          // Delete role

  // Permission Management
  GET    /auth/permissions        // List permissions
  POST   /auth/roles/:id/permissions // Assign permissions

  // User Role Management
  POST   /auth/users/:id/roles    // Assign role to user
  DELETE /auth/users/:id/roles/:roleId // Remove role
  GET    /auth/users/:id/roles    // Get user roles

  📋 Implementation Benefits

  Security:
  - ✅ Granular permission control
  - ✅ Role-based access separation
  - ✅ Audit trail integration
  - ✅ Time-based access control

  Scalability:
  - ✅ Many-to-many role/permission mapping
  - ✅ Dynamic permission evaluation
  - ✅ Custom role creation
  - ✅ Resource-based permissions

  Developer Experience:
  - ✅ Decorator-based protection
  - ✅ Type-safe permission checking
  - ✅ Integration with existing JWT flow
  - ✅ Backward compatible

  🚀 Next Steps

  Would you like me to implement this RBAC system? I can:

  1. Add schema models to Prisma
  2. Create RBAC guards & decorators
  3. Implement role management services
  4. Add admin endpoints for role management
  5. Create default roles & permissions

  This RBAC system akan integrate seamlessly dengan authentication system yang sudah ada! 💪
 */

  /**
   /sc:implement is running… rbac ini adalah authorization kan? kalau iya silahkan implementasi
  ⎿  Allowed 8 tools for this command

● Betul sekali! RBAC (Role-Based Access Control) adalah authorization system - mengatur apa yang boleh dilakukan user setelah mereka ter-autentikasi. Mari saya implementasi RBAC system
  yang lengkap!

● 🔐 Implementing Complete RBAC Authorization System

  Step 1: Add RBAC Schema Models
  Step 2: Create RBAC Guards and Decorators
  Step 3: Implement RBAC Services
  Step 4: Create Role Management Controllers
  Step 5: I'll continue seeding the default roles and permissions for the RBAC system.
   */


/**
 ● Penjelasan RBAC (Role-Based Access Control) yang Baru Dibuat

  🔍 Apa itu RBAC?

  RBAC (Role-Based Access Control) adalah sistem otorisasi yang mengatur akses pengguna berdasarkan peran (role) yang dimiliki. Ini seperti sistem kepangkatan di organisasi - setiap
  pangkat memiliki wewenang yang berbeda-beda.

  🏗️ Struktur Database RBAC

  1. Tabel Role (Peran)

  // Menyimpan definisi peran
  Role {
    id: string           // ID unik peran
    name: string         // Nama peran (admin, moderator, user)
    description: string  // Deskripsi peran
    isActive: boolean    // Status aktif/nonaktif
    createdAt: Date      // Waktu dibuat
  }

  Contoh data:
  - admin - Administrator dengan akses penuh sistem
  - moderator - Moderator dengan akses terbatas
  - user - Pengguna biasa dengan akses dasar

  2. Tabel Permission (Izin)

  // Menyimpan izin-izin spesifik
  Permission {
    id: string           // ID unik izin
    name: string         // Nama izin (users:read, roles:create)
    resource: string     // Resource yang diatur (users, roles, permissions)
    action: string       // Aksi yang diizinkan (read, create, update, delete)
    description: string  // Deskripsi izin
  }

  Contoh izin:
  - users:read - Melihat data pengguna
  - users:create - Membuat pengguna baru
  - roles:update - Mengubah data peran

  3. Tabel RolePermission (Hubungan Peran-Izin)

  // Menghubungkan peran dengan izin
  RolePermission {
    roleId: string       // ID peran
    permissionId: string // ID izin
  }

  4. Tabel UserRole (Hubungan Pengguna-Peran)

  // Memberikan peran kepada pengguna
  UserRole {
    id: string           // ID unik
    userId: string       // ID pengguna
    roleId: string       // ID peran
    assignedBy: string   // Siapa yang memberikan peran
    expiresAt: Date?     // Kapan peran berakhir (opsional)
    createdAt: Date      // Kapan peran diberikan
  }

  🛡️ Sistem Keamanan

  1. Guards (Penjaga)

  Guards adalah sistem yang memeriksa apakah pengguna memiliki izin untuk mengakses endpoint tertentu.

  RolesGuard

  // Memeriksa apakah pengguna memiliki peran tertentu
  @Get('admin-only')
  @Roles('admin')  // Hanya admin yang bisa akses
  async adminFunction() { ... }

  PermissionsGuard

  // Memeriksa izin spesifik
  @Get('users')
  @RequirePermissions('users:read')  // Harus punya izin baca pengguna
  async getUsers() { ... }

  RbacGuard

  // Gabungan peran dan izin
  @Post('users')
  @Rbac({ roles: ['admin'], permissions: ['users:create'] })
  async createUser() { ... }

  2. Decorators (Penanda)

  Decorators adalah penanda yang menentukan aturan akses untuk setiap endpoint.

  // Contoh penggunaan
  @Controller('auth/users')
  @UseGuards(JwtAuthGuard, RolesGuard)  // Wajib login + cek peran
  export class UsersController {

    @Get()
    @Roles('admin', 'moderator')  // Admin atau moderator bisa akses
    async getAllUsers() { ... }

    @Post()
    @Roles('admin')  // Hanya admin yang bisa buat user
    async createUser() { ... }
  }

  🎯 Pembagian Peran dan Izin

  👑 Admin (Administrator)

  Akses: Penuh ke seluruh sistem
  ✅ users:read, users:create, users:update, users:delete
  ✅ roles:read, roles:create, roles:update, roles:delete
  ✅ permissions:read, permissions:create, permissions:update, permissions:delete
  ✅ profile:read, profile:update
  ✅ settings:read, settings:update

  🛠️ Moderator

  Akses: Terbatas untuk moderasi
  ✅ users:read, users:update (bisa lihat & edit user)
  ✅ roles:read, permissions:read (bisa lihat peran & izin)
  ✅ profile:read, profile:update (bisa edit profil sendiri)
  ✅ settings:read (bisa lihat pengaturan)
  ❌ Tidak bisa hapus user, buat peran baru, atau ubah pengaturan

  👤 User (Pengguna Biasa)

  Akses: Hanya profil sendiri
  ✅ profile:read, profile:update (hanya profil sendiri)
  ❌ Tidak bisa akses data user lain, peran, atau pengaturan

  🌐 API Endpoints

  Role Management (/auth/roles)

  POST   /auth/roles              // Buat peran baru (admin only)
  GET    /auth/roles              // Lihat semua peran (admin/moderator)
  GET    /auth/roles/:id          // Lihat peran tertentu (admin/moderator)
  PUT    /auth/roles/:id          // Update peran (admin only)
  DELETE /auth/roles/:id          // Hapus peran (admin only)
  POST   /auth/roles/:id/users    // Berikan peran ke user (admin only)
  DELETE /auth/roles/:roleId/users/:userId  // Cabut peran dari user (admin only)

  Permission Management (/auth/permissions)

  POST   /auth/permissions        // Buat izin baru (admin only)
  GET    /auth/permissions        // Lihat semua izin (admin/moderator)
  GET    /auth/permissions/:id    // Lihat izin tertentu (admin/moderator)
  PUT    /auth/permissions/:id    // Update izin (admin only)
  DELETE /auth/permissions/:id    // Hapus izin (admin only)

  User Role Management (/auth/users)

  GET    /auth/users/me/roles     // Lihat peran sendiri (semua user)
  GET    /auth/users/:userId/roles       // Lihat peran user (admin/moderator)
  POST   /auth/users/:userId/roles       // Berikan peran (admin only)
  DELETE /auth/users/:userId/roles/:roleId  // Cabut peran (admin only)

  🔄 Cara Kerja Sistem

  1. Pengecekan Autentikasi

  // Setiap request harus punya JWT token valid
  @UseGuards(JwtAuthGuard)  // Wajib login dulu

  2. Pengecekan Otorisasi

  // Setelah login, cek apakah punya peran/izin yang dibutuhkan
  @UseGuards(RolesGuard)    // Cek peran
  @Roles('admin')           // Harus admin

  3. Proses Validasi

  1. JWT Guard: Periksa token valid & user masih aktif
  2. Roles Guard: Periksa apakah user punya peran yang dibutuhkan
  3. Service: Ambil data peran user dari database
  4. Decision: Izinkan atau tolak akses

  💡 Keuntungan Sistem RBAC

  🔒 Keamanan Berlapis

  - Autentikasi (siapa Anda?)
  - Otorisasi (apa yang boleh Anda lakukan?)
  - Validasi expired roles (peran bisa kedaluwarsa)

  📈 Skalabilitas

  - Mudah tambah peran baru
  - Mudah atur izin per resource
  - Flexible permission system

  👥 Manajemen User

  - Admin bisa berikan/cabut peran
  - User bisa punya multiple roles
  - Role bisa ada masa berlaku (expires)

  🎯 Granular Control

  - Izin sangat spesifik (users:read vs users:delete)
  - Bisa atur per resource dan action
  - Kontrol yang sangat detail

  🚀 Contoh Penggunaan

  Skenario 1: User Login

  // 1. User login → dapat JWT token
  // 2. Token berisi user ID
  // 3. Setiap request, sistem cek:
  //    - Token valid?
  //    - User masih aktif?
  //    - User punya peran yang dibutuhkan?
  //    - Peran masih berlaku (belum expired)?

  Skenario 2: Admin Memberikan Peran

  // POST /auth/users/123/roles
  {
    "roleId": "admin-role-id",
    "expiresAt": "2024-12-31"  // Opsional: admin sampai akhir tahun
  }

  Skenario 3: Moderator Mengakses Data User

  // GET /auth/users (moderator bisa akses karena punya izin users:read)
  // POST /auth/users (moderator tidak bisa karena tidak punya izin users:create)

  Sistem RBAC ini memberikan kontrol akses yang sangat fleksibel dan aman untuk aplikasi Anda! 🎉
 */

  /**
   zakiyfadhilmuhsin: tolong jelaskan apa saja fungsi2 yg ada di permission.service.ts ini

GitHub Copilot: Berikut penjelasan fungsi-fungsi yang ada di permission.service.ts:

1. **createPermission**  
   Membuat permission baru berdasarkan data yang diberikan. Mengecek apakah permission dengan nama yang sama sudah ada, jika ya akan melempar error.

2. **getAllPermissions**  
   Mengambil semua data permission dari database, termasuk jumlah relasi ke rolePermissions, dan mengurutkan berdasarkan resource dan action.

3. **getPermissionsByResource**  
   Mengambil semua permission berdasarkan nama resource tertentu, diurutkan berdasarkan action.

4. **getPermissionById**  
   Mengambil satu permission berdasarkan ID-nya, termasuk relasi ke rolePermissions dan role terkait. Jika tidak ditemukan, melempar error.

5. **updatePermission**  
   Memperbarui data permission berdasarkan ID. Mengecek apakah nama baru sudah digunakan permission lain, jika ya akan melempar error.

6. **deletePermission**  
   Menghapus permission berdasarkan ID. Jika tidak ditemukan, melempar error.

7. **createResourcePermissions**  
   Membuat permission standar (create, read, update, delete, manage) untuk sebuah resource. Jika permission sudah ada, tidak akan dibuat ulang.

8. **getResources**  
   Mengambil daftar nama resource unik yang ada di tabel permission.

9. **getResourceActions**  
   Mengambil daftar action unik untuk sebuah resource tertentu.

Semua fungsi di atas menggunakan Prisma untuk operasi database dan menangani error dengan baik menggunakan exception dari NestJS.

zakiyfadhilmuhsin: contoh2 keluaran outputnya seperti apa?

GitHub Copilot: Berikut contoh-contoh keluaran (output) dari fungsi-fungsi utama di permission.service.ts:

---

### 1. **createPermission**
**Input:**
```json
{
  "name": "user:create",
  "resource": "user",
  "action": "create",
  "description": "Create a user"
}
```
**Output:**
```json
{
  "id": "clwxyz1234567890",
  "name": "user:create",
  "resource": "user",
  "action": "create",
  "description": "Create a user",
  "createdAt": "2025-09-17T10:00:00.000Z",
  "updatedAt": "2025-09-17T10:00:00.000Z"
}
```

---

### 2. **getAllPermissions**
**Output:**
```json
[
  {
    "id": "clwxyz1234567890",
    "name": "user:create",
    "resource": "user",
    "action": "create",
    "description": "Create a user",
    "_count": { "rolePermissions": 2 }
  },
  {
    "id": "clwxyz1234567891",
    "name": "user:read",
    "resource": "user",
    "action": "read",
    "description": "Read user",
    "_count": { "rolePermissions": 3 }
  }
]
```

---

### 3. **getPermissionsByResource('user')**
**Output:**
```json
[
  {
    "id": "clwxyz1234567890",
    "name": "user:create",
    "resource": "user",
    "action": "create",
    "description": "Create a user"
  },
  {
    "id": "clwxyz1234567891",
    "name": "user:read",
    "resource": "user",
    "action": "read",
    "description": "Read user"
  }
]
```

---

### 4. **getPermissionById('clwxyz1234567890')**
**Output:**
```json
{
  "id": "clwxyz1234567890",
  "name": "user:create",
  "resource": "user",
  "action": "create",
  "description": "Create a user",
  "rolePermissions": [
    {
      "roleId": "admin",
      "role": {
        "id": "admin",
        "name": "Administrator"
      }
    }
  ]
}
```

---

### 5. **updatePermission**
**Input:**  
`permissionId = "clwxyz1234567890"`,  
`updatePermissionDto = { "description": "Create new user" }`

**Output:**
```json
{
  "id": "clwxyz1234567890",
  "name": "user:create",
  "resource": "user",
  "action": "create",
  "description": "Create new user"
}
```

---

### 6. **deletePermission**
**Output:**  
Tidak ada output (void), hanya menghapus data.

---

### 7. **createResourcePermissions('post')**
**Output:**
```json
[
  {
    "id": "clwxyz1234567892",
    "name": "post:create",
    "resource": "post",
    "action": "create",
    "description": "Create post"
  },
  {
    "id": "clwxyz1234567893",
    "name": "post:read",
    "resource": "post",
    "action": "read",
    "description": "Read post"
  },
  {
    "id": "clwxyz1234567894",
    "name": "post:update",
    "resource": "post",
    "action": "update",
    "description": "Update post"
  },
  {
    "id": "clwxyz1234567895",
    "name": "post:delete",
    "resource": "post",
    "action": "delete",
    "description": "Delete post"
  },
  {
    "id": "clwxyz1234567896",
    "name": "post:manage",
    "resource": "post",
    "action": "manage",
    "description": "Manage post"
  }
]
```

---

### 8. **getResources()**
**Output:**
```json
["post", "user", "comment"]
```

---

### 9. **getResourceActions('user')**
**Output:**
```json
["create", "read", "update", "delete", "manage"]
```

---

Jika ada fungsi spesifik yang ingin dicontohkan lebih detail, silakan sebutkan.
   */