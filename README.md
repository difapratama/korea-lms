# Korea LMS

Monorepo Learning Management System untuk persiapan **EPS-TOPIK**, dengan backend API, aplikasi web admin, dan aplikasi mobile siswa.

## Status proyek

Dokumentasi ini disusun dari source repository pada **15 November 2026**.

| Bagian | Teknologi | Kondisi saat ini |
| --- | --- | --- |
| `apps/api` | NestJS 12, Prisma 7, PostgreSQL 17 | Source auth, health, course, module, dan lesson tersedia; ada blocker yang dicatat di panduan development |
| `apps/admin` | Next.js 16.4.6, React 19.3, Tailwind CSS 4 | Starter Next.js; belum ada dashboard LMS atau integrasi API |
| `apps/mobile` | Expo SDK 58, React Native 0.88.1, Expo Router | Starter Home/Explore; belum ada layar LMS atau integrasi API |
| `infra` | Docker Compose | PostgreSQL lokal |
| `packages` | Workspace bersama | Masih kosong |

Progress belajar sudah dimodelkan di database, tetapi belum memiliki API. Premium baru berupa pembatasan lesson; payment, entitlement, dan quiz engine belum tersedia.

## Dokumentasi

- [Panduan AI](AGENTS.md): titik masuk konteks untuk coding assistant.
- [Arsitektur dan domain](docs/architecture.md): struktur aplikasi, model data, alur, dan fitur yang tersedia.
- [Kontrak API](docs/api.md): endpoint, autentikasi, payload, dan aturan akses.
- [Development](docs/development.md): setup lengkap, environment, pemeriksaan, dan masalah yang diketahui.
- [Upload dan update GitHub](docs/github.md): pemeriksaan file, commit pertama, remote, push, dan update berikutnya.
- Panduan framework per aplikasi: [admin](apps/admin/AGENTS.md), [API](apps/api/AGENTS.md), [mobile](apps/mobile/AGENTS.md).

## Menjalankan secara lokal

Prasyarat: Node.js yang kompatibel dengan dependency aplikasi, pnpm, Docker dengan Compose. Versi Node belum dipatok di root; admin mencantumkan `pnpm@12.18.0`.

Jalankan dari root repository:

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
```

Buat `apps/api/.env` dari contoh yang tersedia jika belum ada, tanpa menimpa konfigurasi lokal yang sudah dipakai:

```bash
cp -n apps/api/.env.example apps/api/.env
```

Isi secret lokal Anda sendiri. Contoh konfigurasi:

```dotenv
DATABASE_URL=postgresql://korea_user:korea_dev_password@localhost:5433/korea_lms?schema=public
JWT_ACCESS_SECRET=<isi-dengan-secret-acak-lokal>
PORT=3005
NODE_ENV=development
```

Kredensial database contoh mengikuti Compose untuk development. Generate client dan terapkan migration:

```bash
pnpm --dir apps/api exec prisma generate --config prisma7.config.ts
pnpm --dir apps/api exec prisma migrate dev --config prisma7.config.ts
```

Jalankan masing-masing aplikasi pada terminal terpisah:

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:mobile
```

| Layanan | Alamat default |
| --- | --- |
| Admin | `http://localhost:3000` |
| API | `http://localhost:3005/api/v1` |
| Swagger (non-production) | `http://localhost:3005/docs` |
| Health API | `http://localhost:3005/api/v1/health` |
| Health database | `http://localhost:3005/api/v1/health/database` |
| PostgreSQL dari host | `localhost:5433` |
| Mobile | Gunakan URL/QR yang ditampilkan Expo |

Source saat ini memiliki beberapa ketidaksesuaian yang dapat menghambat build atau test; lihat [masalah yang diketahui](docs/development.md#masalah-yang-diketahui) sebelum troubleshooting.

## Menggunakan dokumentasi bersama AI

Coding assistant yang mendukung `AGENTS.md` dapat memakai panduan root sebagai konteks awal. Untuk tool yang tidak membacanya otomatis, gunakan prompt berikut:

> Baca AGENTS.md dan README.md di root korea-lms, lalu dokumen terkait di docs/ dan AGENTS.md aplikasi yang akan diubah. Gunakan source aktual sebagai sumber kebenaran. Tugas saya: [jelaskan perubahan yang diinginkan].

Perbarui dokumentasi bersama perubahan fitur supaya sesi AI berikutnya tetap mendapatkan konteks terbaru.
