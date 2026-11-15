# Kontrak API

[Kembali ke README](../README.md) · [Arsitektur](architecture.md)

Ringkasan ini berasal dari controller, DTO, dan service saat dokumentasi dibuat; bukan hasil pengujian HTTP menyeluruh. Base URL lokal: `http://localhost:3005/api/v1`. Swagger: `http://localhost:3005/docs` pada non-production.

## Konvensi

- Body JSON; token dikirim melalui `Authorization: Bearer <accessToken>`.
- Parameter ID domain divalidasi dengan `ParseUUIDPipe`.
- Validasi global: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. Field body di luar DTO ditolak.
- Response langsung berupa object/array dari controller/service; tidak ada wrapper `{ data: ... }` global.
- POST umumnya memakai status default Nest 201. Login, refresh, logout secara eksplisit 200. GET/PATCH/DELETE memakai 200 pada alur berhasil yang ada.
- Error umum: 400 validasi/aturan penghapusan, 401 auth, 403 role/premium, 404 resource tidak ditemukan, 409 email/slug duplikat.

## Health

| Method | Path | Akses | Response |
| --- | --- | --- | --- |
| GET | `/health` | Publik | `{ "status": "ok", "application": "Korea LMS API" }` |
| GET | `/health/database` | Publik | Menjalankan `SELECT 1`; sukses `{ "status": "connected", "database": "postgresql" }` |

## Auth

| Method | Path | Akses | Body |
| --- | --- | --- | --- |
| POST | `/auth/register` | Publik | `name`, `email`, `password` |
| POST | `/auth/login` | Publik | `email`, `password` |
| POST | `/auth/refresh` | Refresh token | `refreshToken` |
| POST | `/auth/logout` | Refresh token | `refreshToken` |
| GET | `/auth/me` | Access token | — |

Validasi register: name string 2–100 karakter; email valid; password string 8–128 karakter. Login memvalidasi email dan tipe string password. Refresh/logout membutuhkan string `refreshToken` minimal 20 karakter, kemudian memverifikasi bentuk dan session dalam service.

Contoh register:

```json
{
  "name": "Siswa Contoh",
  "email": "siswa@example.com",
  "password": "contoh-password-lokal"
}
```

Register/login mengembalikan:

```json
{
  "message": "Login berhasil",
  "user": {
    "id": "<uuid>",
    "name": "Siswa Contoh",
    "email": "siswa@example.com",
    "role": "STUDENT"
  },
  "accessToken": "<jwt>",
  "refreshToken": "<session-uuid>.<secret>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

Message register adalah `Registrasi berhasil`. Refresh hanya mengembalikan empat field token, tanpa `message` atau `user`. Client perlu mengganti refresh token tersimpan dengan token baru setiap refresh berhasil, dan menghindari refresh paralel memakai token yang sama. Logout mengembalikan `{ "message": "Logout berhasil" }`; pengulangan logout terhadap session tercabut menghasilkan 401.

`GET /auth/me` mengembalikan `id`, `name`, `email`, `role`, `createdAt`; password hash tidak disertakan. Belum ada cookie auth atau endpoint membuat/mempromosikan admin.

## Materi publik

| Method | Path | Response |
| --- | --- | --- |
| GET | `/courses` | Array course `PUBLISHED`, terbaru dahulu; field `id`, `title`, `slug`, `description`, `thumbnail` |
| GET | `/courses/:id` | Object dengan field course publik yang sama; 404 bila tidak terbit/tidak ada |
| GET | `/courses/:courseId/modules` | Array module `id`, `title`, `position`, `lessons`; lesson hanya `id`, `title`, `type`, `position`, `isFree` |
| GET | `/lessons/:lessonId` | `id`, `title`, `type`, `content`, `mediaUrl`, `isFree` |

Semua endpoint di tabel ini tidak memakai auth guard. Course kurikulum harus `PUBLISHED`. Detail lesson memerlukan course terbit dan `isFree: true`; lesson non-gratis ditolak 403. Route detail menggunakan UUID, bukan slug. Belum ada pagination atau filter pencarian.

## Admin

Semua endpoint berikut memakai `JwtAuthGuard` dan `AdminGuard`. Selain access token valid, user harus memiliki role `ADMIN` di database.

### Course

| Method | Path | Perilaku |
| --- | --- | --- |
| GET | `/admin/courses` | Semua status; response menyertakan `_count.modules`; urutan createdAt descending |
| GET | `/admin/courses/:id` | Detail termasuk module diurutkan berdasarkan position |
| POST | `/admin/courses` | Membuat course; default status `DRAFT` |
| PATCH | `/admin/courses/:id` | Update sebagian field DTO |
| DELETE | `/admin/courses/:id` | Arsipkan; `{ "message": "Course berhasil diarsipkan" }` |

Payload create:

| Field | Wajib | Validasi |
| --- | --- | --- |
| `title` | Ya | String 3–150 karakter |
| `slug` | Ya | Maksimal 160; huruf kecil/angka dipisah `-`, contoh `bahasa-korea-dasar` |
| `description` | Tidak | String |
| `thumbnail` | Tidak | URL dengan TLD |
| `status` | Tidak | `DRAFT`, `PUBLISHED`, `ARCHIVED` |

PATCH memakai field sama, semuanya opsional. Slug harus unik; duplikat menghasilkan 409. Response create/update adalah record course Prisma.

### Module

| Method | Path | Perilaku |
| --- | --- | --- |
| POST | `/admin/courses/:courseId/modules` | Buat module dalam course |
| GET | `/admin/courses/:courseId/modules` | Array module termasuk lessons |
| PATCH | `/admin/modules/:moduleId` | Update title/position |
| DELETE | `/admin/modules/:moduleId` | Hapus jika tidak ada lesson; jika masih berisi lesson: 400 |

Create membutuhkan `title` string 3–150 karakter dan `position` integer ≥ 0. PATCH memakai keduanya secara opsional. Tidak ada field pemindahan course pada DTO. DELETE sukses mengembalikan `{ "message": "Module berhasil dihapus" }`.

### Lesson

| Method | Path | Perilaku |
| --- | --- | --- |
| POST | `/admin/modules/:moduleId/lessons` | Buat lesson dalam module |
| GET | `/admin/modules/:moduleId/lessons` | Array lesson lengkap |
| GET | `/admin/lessons/:lessonId` | Detail lengkap |
| PATCH | `/admin/lessons/:lessonId` | Update field DTO |
| DELETE | `/admin/lessons/:lessonId` | Hapus jika tidak ada progress; jika sudah ada progress: 400 |

Payload create:

| Field | Wajib | Validasi |
| --- | --- | --- |
| `title` | Ya | String 3–150 karakter |
| `type` | Ya | `TEXT`, `VIDEO`, `AUDIO`, `QUIZ` |
| `position` | Ya | Integer ≥ 0 |
| `isFree` | Ya | Boolean |
| `content` | Tidak | String; belum ada format konten terstruktur yang ditetapkan |
| `mediaUrl` | Tidak | URL dengan protokol; TLD tidak diwajibkan |

PATCH menggunakan field sama secara opsional; belum ada field pindah module. Tidak ada validasi khusus bahwa tipe VIDEO harus memiliki mediaUrl, maupun engine khusus untuk QUIZ. DELETE sukses mengembalikan `{ "message": "Lesson berhasil dihapus" }`.

Controller admin learning saat ini belum mengimpor `CreateLessonDto`/`UpdateLessonDto` yang dipakai pada signature method. Kontrak di atas menjelaskan source yang dimaksud; lihat blocker di [development](development.md#masalah-yang-diketahui).

## Contoh pemeriksaan lokal

```bash
curl http://localhost:3005/api/v1/health
curl http://localhost:3005/api/v1/courses
curl http://localhost:3005/api/v1/auth/me \
  -H 'Authorization: Bearer <accessToken>'
```

Integrasi frontend belum tersedia. Nama environment untuk base URL frontend, mekanisme penyimpanan token, dan strategi retry perlu ditetapkan saat implementasi, bukan dianggap sebagai konfigurasi yang sudah ada.
