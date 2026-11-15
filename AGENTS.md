# Panduan AI — Korea LMS

## Konteks yang wajib dibaca

Korea LMS adalah monorepo LMS persiapan EPS-TOPIK. Komunikasi dan dokumentasi proyek menggunakan bahasa Indonesia; ikuti penamaan kode yang sudah ada.

Sebelum mengerjakan tugas:
1. Baca [README.md](README.md) untuk status dan cara menjalankan proyek.
2. Baca [docs/architecture.md](docs/architecture.md) untuk struktur, domain, dan batas implementasi.
3. Untuk integrasi backend, baca [docs/api.md](docs/api.md).
4. Baca [docs/development.md](docs/development.md), terutama masalah yang sudah diketahui.
5. Baca `AGENTS.md` di aplikasi yang dikerjakan. Panduan framework di sana tetap berlaku; cocokkan klaim kondisi proyek dengan source dan konfigurasi aktual.

## Peta singkat

- `apps/api`: NestJS 12, Prisma 7, PostgreSQL 17; logika bisnis sudah mulai diimplementasikan.
- `apps/admin`: Next.js 16 App Router, React 19, Tailwind 4; masih starter, belum terhubung ke API.
- `apps/mobile`: Expo SDK 58, React Native 0.88, Expo Router; masih starter, belum terhubung ke API.
- `infra/docker-compose.yml`: PostgreSQL lokal, port host `5433`.
- `packages`: masih kosong; belum ada shared types atau SDK.
- Gunakan pnpm dari root untuk instalasi workspace. Script root hanya `dev:api`, `dev:admin`, `dev:mobile`.

## Aturan implementasi

- Source, schema, dan manifest adalah sumber kebenaran; dokumentasi adalah peta konteks yang perlu diperbarui bersama perubahan fitur.
- Jangan menganggap UI LMS, payment, entitlement premium, quiz engine, atau API progress sudah tersedia. Lihat status implementasi dalam dokumentasi.
- Backend: controller menangani HTTP, DTO menangani validasi, service menangani logika bisnis dan Prisma. Daftarkan modul baru di `app.module.ts`.
- Endpoint admin memakai `JwtAuthGuard` lalu `AdminGuard`; role admin diperiksa dari database.
- Course publik hanya `PUBLISHED`. Lesson publik hanya dari course terbit dan `isFree: true`. Jangan membuka lesson premium hanya karena pengguna sudah login.
- Hapus course berarti arsipkan. Penghapusan module berisi lesson dan lesson berisi progress ditolak oleh service.
- Ubah database melalui `apps/api/prisma/schema.prisma` dan migration. Jangan edit Prisma client hasil generate atau output `dist`.
- Config Prisma bernama `prisma7.config.ts`; sertakan `--config prisma7.config.ts` pada perintah Prisma dari direktori API.
- Pertahankan konfigurasi modul API aktual saat mengubah fitur: manifest, tsconfig, dan generator Prisma saat ini menggunakan CommonJS. Ada catatan ESM generik pada panduan API yang belum sesuai konfigurasi ini; jangan melakukan migrasi modul diam-diam.
- Admin menggunakan `app/`, bukan `src/app/`. Alias `@/*` mengarah ke root admin.
- Mobile menggunakan `src/app/` untuk route; komponen/hook di luar direktori route. Alias `@/*` mengarah ke `src/*`. Perhatikan implementasi `.web.tsx`.
- Baca dokumentasi framework sesuai versi sebagaimana diwajibkan panduan aplikasi sebelum menulis kode framework.
- Jangan menyalin isi `.env` ke dokumentasi. Gunakan placeholder untuk secret.

## Penyelesaian tugas

- Jalankan pemeriksaan yang relevan di [docs/development.md](docs/development.md). Laporkan perintah, hasil, dan blocker; jangan menyatakan lulus jika belum dijalankan.
- Perbarui dokumen terkait bila mengubah endpoint, konfigurasi environment, model data, struktur, atau status fitur.
- Bedakan masalah yang sudah ada dengan perubahan dari tugas saat ini. Jangan memperluas tugas ke refactor atau penggantian toolchain tanpa kebutuhan.
