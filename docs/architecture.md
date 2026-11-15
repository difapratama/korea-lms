# Arsitektur dan domain

[Kembali ke README](../README.md) · [Kontrak API](api.md) · [Development](development.md)

## Tujuan dan hubungan aplikasi

Korea LMS ditujukan untuk pembelajaran persiapan EPS-TOPIK. Backend menjadi pusat autentikasi, data course, dan materi belajar. Admin ditujukan untuk pengelola konten, mobile untuk siswa.

```text
Admin Next.js ─ ─ ┐
                 ├─ HTTP JSON /api/v1 → NestJS → Prisma (adapter pg) → PostgreSQL
Mobile Expo ─ ─ ─┘
```

Garis dari frontend menunjukkan integrasi yang dituju: kedua frontend saat ini belum mengimplementasikan pemanggilan API.

## Struktur repository

```text
korea-lms/
├── apps/
│   ├── admin/
│   │   ├── app/                 # layout, halaman starter, global CSS
│   │   └── public/              # aset starter
│   ├── api/
│   │   ├── prisma/              # schema dan migration
│   │   ├── prisma7.config.ts    # konfigurasi CLI Prisma
│   │   ├── src/
│   │   │   ├── main.ts          # bootstrap, prefix, CORS, validation, Swagger
│   │   │   ├── app.module.ts    # komposisi modul
│   │   │   ├── app.controller.ts # health dan database health
│   │   │   ├── infrastructure/prisma/
│   │   │   ├── generated/prisma/ # hasil generate; bukan source manual
│   │   │   └── modules/
│   │   │       ├── auth/        # token, profil, guard, DTO
│   │   │       ├── courses/     # course publik dan admin
│   │   │       └── learning/    # module dan lesson publik/admin
│   │   └── test/               # tes e2e bawaan
│   └── mobile/
│       ├── app.json            # konfigurasi Expo dan plugin
│       ├── assets/
│       └── src/
│           ├── app/            # _layout, index, explore
│           ├── components/    # tab, themed UI, animasi, varian web
│           ├── constants/     # theme
│           └── hooks/         # color scheme dan theme
├── infra/docker-compose.yml
├── packages/                  # kosong
└── docs/
```

`pnpm-workspace.yaml` memasukkan `apps/*` dan `packages/*`. Root belum memiliki orchestrator build/test. Admin juga memiliki lockfile dan workspace file lokal; gunakan instalasi dari root untuk pekerjaan monorepo dan evaluasi file lokal tersebut sebelum mengubah strategi workspace.

## Backend

- `ConfigModule` bersifat global dan membaca environment; `PrismaModule` menyediakan `PrismaService` global.
- `PrismaService` menggunakan `@prisma/adapter-pg` dan `DATABASE_URL`, lalu disconnect saat module dihancurkan.
- Alur request: controller → guard bila diperlukan → validasi DTO → service → Prisma. Nest menjalankan guard sebelum pipe validasi.
- DTO memakai `class-validator` dan `class-transformer`. Update menggunakan `PartialType`.
- Response belum memiliki envelope global atau pagination standar.
- Prefix `api/v1` berlaku untuk controller; Swagger dipasang terpisah di `/docs` pada non-production.
- Manifest, TypeScript, dan generator Prisma saat ini dikonfigurasi CommonJS. Jangan menyimpulkan format modul hanya dari teks template panduan framework.

## Model data

Sumber kebenaran: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).

| Model / tabel | Isi utama | Relasi dan batasan |
| --- | --- | --- |
| `User` / `users` | nama, email, passwordHash, role | Email unik; role `STUDENT` atau `ADMIN`; memiliki progress dan refresh session |
| `Course` / `courses` | title, slug, description, thumbnail, status | Slug unik; memiliki banyak module |
| `CourseModule` / `course_modules` | title, position, courseId | Milik satu course; memiliki banyak lesson; index courseId + position |
| `Lesson` / `lessons` | title, type, content, mediaUrl, position, isFree | Milik module; index moduleId + position |
| `LessonProgress` / `lesson_progress` | userId, lessonId, isCompleted, completedAt | Pasangan userId + lessonId unik; belum ada endpoint |
| `RefreshSession` / `refresh_sessions` | tokenHash, userId, expiresAt, revokedAt | Banyak session per user; token mentah tidak disimpan |

Semua primary key memakai UUID. Status course: `DRAFT`, `PUBLISHED`, `ARCHIVED`. Jenis lesson: `TEXT`, `VIDEO`, `AUDIO`, `QUIZ`. Keberadaan enum `QUIZ` belum berarti ada penyimpanan soal, jawaban, atau penilaian.

Relasi database menghapus lesson secara cascade jika module dihapus, progress jika user/lesson dihapus, dan refresh session jika user dihapus. Namun service admin menerapkan aturan lebih ketat: module yang masih berisi lesson dan lesson yang sudah memiliki progress tidak boleh dihapus. Relasi course → module tidak mendefinisikan cascade eksplisit.

Migration yang tersedia:
- `20261113073555_init_lms`: struktur LMS awal.
- `20261113085035_add_refresh_sessions`: penyimpanan refresh session.

## Aturan bisnis yang sudah tertulis

1. Registrasi selalu menghasilkan `STUDENT`; request tidak dapat memilih role.
2. Password di-hash menggunakan Argon2. Email dinormalisasi ke lowercase dan di-trim oleh service.
3. Access token JWT HS256 berlaku 15 menit. Refresh token berupa `sessionId.secret`, dengan secret acak dan hash SHA-256 dalam database.
4. Refresh merotasi secret pada session yang sama dan memperpanjang masa berlaku menjadi tujuh hari. Conditional update menolak penggunaan ulang token lama, termasuk request bersamaan.
5. Logout mencabut refresh session terkait. Access token tidak memiliki blacklist dan masih dapat diverifikasi sampai kedaluwarsa.
6. Guard admin mengecek role terbaru dari database, bukan hanya klaim JWT.
7. Course publik hanya `PUBLISHED`. Hapus course adalah perubahan status menjadi `ARCHIVED`.
8. Kurikulum publik memuat metadata module/lesson, termasuk lesson non-gratis, tetapi tidak memuat `content` atau `mediaUrl`.
9. Detail lesson publik hanya tersedia untuk lesson gratis dalam course `PUBLISHED`. Lesson premium menghasilkan 403, termasuk jika request menyertakan token login.
10. Urutan materi menggunakan `position` ascending. Beberapa query admin memakai `createdAt` sebagai urutan sekunder; posisi belum diwajibkan unik.

## Frontend

### Admin

Entry point `app/layout.tsx` dan `app/page.tsx`. Halaman masih template Next.js. Alias `@/*` menunjuk root aplikasi. Tailwind diproses melalui loader Turbopack dalam `next.config.ts`; konfigurasi juga mengaktifkan `cacheComponents`, `partialPrefetching`, dan `experimental.agentFeedback`.

Belum ada login, pengelolaan course, API client, session storage, atau environment API URL. Panduan Next.js lokal wajib dibaca sebelum implementasi framework sebagaimana dijelaskan dalam `apps/admin/AGENTS.md`.

### Mobile

`expo-router/entry` menjadi entry point. `src/app/_layout.tsx` mengatur theme, splash overlay, dan tab. Screen `/` dan `/explore` masih template Expo. Native tab ada di `components/app-tabs.tsx`, implementasi web di `app-tabs.web.tsx`. Theme dan komponen themed sudah tersedia untuk digunakan kembali.

Alias `@/*` menunjuk `src/*`, `@/assets/*` menunjuk `assets/*`. Konfigurasi Expo masih memakai nama/slug/scheme `mobile`, mengaktifkan typed routes dan React Compiler; output web `server`. Belum ada direktori native `ios/`/`android/`, konfigurasi EAS, API client, maupun penyimpanan token.

## Batas implementasi

| Area | Status |
| --- | --- |
| Register/login/refresh/logout/me | Source backend tersedia |
| Admin CRUD course/module/lesson | Source backend tersedia; import DTO controller learning perlu diperbaiki |
| Katalog dan kurikulum publik, lesson gratis | Source backend tersedia |
| Progress belajar | Model database saja |
| Akses premium | Penolakan akses saja; `EntitlementGuard` baru disebut sebagai rencana di komentar |
| Quiz, ujian, scoring EPS-TOPIK | Belum ada engine/model khusus |
| Payment, enrollment, subscription | Belum ada |
| Upload/storage media | Belum ada; lesson menyimpan URL |
| UI admin/mobile untuk LMS | Belum ada |
| Shared SDK/types di `packages` | Belum ada |
| Seed admin, deployment pipeline, telemetry Observe | Belum dikonfigurasi dalam source yang diperiksa |

Tabel ini adalah catatan kondisi source, bukan roadmap yang sudah disetujui. Keputusan produk berikutnya perlu mengikuti permintaan pemilik proyek.
