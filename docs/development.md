# Panduan development

[Kembali ke README](../README.md) · [Arsitektur](architecture.md) · [Kontrak API](api.md)

## Toolchain dan instalasi

- Gunakan pnpm; workspace root mencakup `apps/*` dan `packages/*`.
- Root belum mematok versi Node atau `packageManager`. `apps/admin/package.json` mencantumkan `pnpm@12.18.0`; gunakan runtime yang memenuhi kebutuhan dependency terpasang.
- Instalasi workspace: `pnpm install` dari root.
- Build script dependency yang diizinkan pada workspace mencakup Prisma engines, Prisma, Argon2, dan `@scarf/scarf`.
- Penambahan dependency Expo harus melalui `pnpm --dir apps/mobile exec expo install <package>` agar kompatibel dengan SDK.

## Database dan environment

Compose hanya menjalankan PostgreSQL, bukan aplikasi API/admin/mobile:

```bash
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs postgres
docker compose -f infra/docker-compose.yml down
```

Image `postgres:17`, container `korea-lms-postgres`, database `korea_lms`. Port host `127.0.0.1:5433` dipetakan ke port container `5432`. Data berada pada named volume `postgres_data`; `down` tanpa `-v` mempertahankan volume.

API membaca `.env` dari direktori aplikasi ketika dijalankan dengan script workspace. Variabel yang digunakan source:

| Variabel | Kegunaan | Default |
| --- | --- | --- |
| `DATABASE_URL` | Koneksi Prisma runtime dan CLI | Wajib |
| `JWT_ACCESS_SECRET` | Signing/verifikasi access token | Wajib untuk auth |
| `PORT` | Port server | `3005` |
| `NODE_ENV` | Menonaktifkan Swagger jika `production` | Swagger aktif bila bukan `production` |

Contoh URL lokal dan file `.env` ada di [README](../README.md). Durasi token saat ini hardcoded di `auth.service.ts`, bukan environment. Belum ada environment base URL API yang dipakai oleh admin/mobile.

### Prisma

Jalankan dari root:

```bash
pnpm --dir apps/api exec prisma generate --config prisma7.config.ts
pnpm --dir apps/api exec prisma migrate dev --config prisma7.config.ts
pnpm --dir apps/api exec prisma migrate status --config prisma7.config.ts
pnpm --dir apps/api exec prisma studio --config prisma7.config.ts
```

Untuk perubahan schema, edit `apps/api/prisma/schema.prisma`, lalu buat migration bernama sesuai perubahan:

```bash
pnpm --dir apps/api exec prisma migrate dev --config prisma7.config.ts --name nama_perubahan
pnpm --dir apps/api exec prisma generate --config prisma7.config.ts
```

Review SQL migration dan dampak relasi sebelum dipakai. Generator yang aktif mengeluarkan client ke `apps/api/src/generated/prisma`, format `cjs`. Folder `apps/api/generated/prisma` juga ada pada checkout yang diperiksa, tetapi bukan output schema saat ini. Jangan memakai salinan itu sebagai sumber model.

Belum ada seed admin atau script bootstrap akun admin. Registrasi hanya membuat `STUDENT`; pengujian endpoint admin membutuhkan akun yang role-nya sudah diatur menjadi `ADMIN` pada database development, misalnya melalui Prisma Studio setelah registrasi.

## Menjalankan aplikasi

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:mobile
```

Ketiganya dijalankan pada terminal terpisah. Alternatif platform mobile:

```bash
pnpm --dir apps/mobile android
pnpm --dir apps/mobile ios
pnpm --dir apps/mobile web
```

Script platform menjalankan Expo development server, bukan build distribusi. Perangkat fisik nantinya membutuhkan alamat host API yang dapat dijangkau dari jaringan perangkat; `localhost` pada perangkat menunjuk perangkat itu sendiri. Origin browser yang diizinkan API saat ini hanya `http://localhost:3000`; Expo web pada origin lain belum tercakup.

## Pemeriksaan kode

Perintah berikut tersedia dari script/config repository, tetapi bukan jaminan semuanya sudah lulus pada baseline:

| Area | Perintah dari root |
| --- | --- |
| API build | `pnpm --dir apps/api build` |
| API lint | `pnpm --dir apps/api lint` |
| API unit test | `pnpm --dir apps/api test` |
| API e2e | `pnpm --dir apps/api test:e2e` |
| Admin lint | `pnpm --dir apps/admin lint` |
| Admin typecheck | `pnpm --dir apps/admin exec tsc --noEmit` |
| Admin build | `pnpm --dir apps/admin build` |
| Mobile lint | `pnpm --dir apps/mobile lint` |
| Mobile typecheck | `pnpm --dir apps/mobile exec tsc --noEmit` |

API memakai Vitest, bukan Jest. E2e mengimpor seluruh `AppModule`, sehingga konfigurasi environment dan dependency aplikasi perlu tersedia. Untuk perubahan mobile, panduan aplikasi mewajibkan lint dan typecheck. Expo lint dapat meminta setup ESLint pada checkout starter yang belum dikonfigurasi.

## Masalah yang diketahui

Temuan dari inspeksi source pada 15 November 2026; verifikasi ulang setelah kode berubah:

1. **Import DTO lesson belum ada.** `apps/api/src/modules/learning/admin-learning.controller.ts` menggunakan `CreateLessonDto` dan `UpdateLessonDto`, tetapi belum mengimpor keduanya dari `./dto/create-lesson.dto`. Ini merupakan potensi blocker kompilasi.
2. **Tes API masih template lama.** `src/app.controller.spec.ts` memanggil `getHello()` dan menyediakan `AppService`, padahal controller sekarang membutuhkan `PrismaService` dan hanya menyediakan health. E2e masih mengharapkan `/` mengembalikan `Hello World!` serta tidak menerapkan bootstrap prefix/pipe dari `main.ts`.
3. **Panduan generik ESM berbeda dari konfigurasi.** `apps/api/AGENTS.md` menyebut proyek ESM, tetapi `package.json`, `tsconfig.json`, dan generator Prisma menyatakan CommonJS; kebanyakan import source juga tanpa `.js`. Perubahan toolchain harus dievaluasi terpisah, bukan diterapkan otomatis karena template.
4. **CORS didaftarkan dua kali.** `main.ts` memanggil `enableCors` dengan konfigurasi sama dua kali; origin masih hardcoded untuk admin lokal.
5. **Target start production perlu diverifikasi.** Script `start:prod` menunjuk `dist/main`, sementara `rootDir: "."` dan source di `src` berpotensi menghasilkan layout output berbeda. Periksa output build bersih sebelum menentukan entry deployment; file `dist` lama bukan bukti build terbaru.
6. **Belum ada tes fitur LMS.** Tes yang ditemukan hanya unit/e2e scaffold; belum mencakup auth rotation, role admin, publikasi, atau aturan penghapusan.
7. **Konfigurasi ESLint mobile belum ada.** Manifest memiliki script `expo lint`, tetapi belum mencantumkan dependency ESLint atau config lint dalam aplikasi.

Dokumentasi ini mencatat temuan tersebut; tidak menyatakan perbaikannya sudah dilakukan.

## Alur mengembangkan fitur berikutnya

1. Baca `AGENTS.md` root dan panduan aplikasi yang terdampak.
2. Cocokkan kebutuhan dengan schema, controller, service, dan status implementasi di dokumen arsitektur.
3. Bila menambah kontrak backend: tentukan DTO, aturan akses, response, dan kebutuhan migration; ikuti pola modul yang ada.
4. Bila menghubungkan frontend: gunakan kontrak `/api/v1`, tangani refresh rotation dan error, lalu dokumentasikan konfigurasi base URL serta penyimpanan session yang benar-benar dipilih.
5. Jalankan pemeriksaan relevan, laporkan blocker baseline secara terpisah, dan perbarui dokumentasi.

Deployment CI/CD, hosting, distribusi mobile/EAS, dan konfigurasi production belum ditetapkan oleh repository. Script `nest deploy` yang tersedia di manifest tidak dengan sendirinya berarti deployment telah dikonfigurasi.
