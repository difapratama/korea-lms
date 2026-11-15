# Mengunggah Korea LMS ke GitHub

[Kembali ke README](../README.md)

Admin, API, dan mobile disimpan dalam **satu repository monorepo**. Deploy masing-masing aplikasi tetap bisa dilakukan secara terpisah.

## 1. Persiapan yang sudah tersedia

- `.gitignore` root mengecualikan dependency, environment privat, hasil build, cache, signing key, dan file database lokal.
- Prisma client hasil generate diabaikan; **schema dan SQL migration tetap masuk Git**.
- `apps/api/.env.example` menyediakan contoh konfigurasi tanpa secret aktif. Kredensial PostgreSQL di contoh dan Compose adalah nilai development lokal, bukan kredensial production.
- Source, aset, dokumentasi, manifest, dan lockfile pnpm disimpan di repository.
- File `.env.example` harus selalu berisi contoh/placeholder, bukan salinan secret `.env`.

Saat panduan dibuat, repository lokal belum memiliki remote Git. Nama akun/organisasi dan URL GitHub harus diisi sesuai repository milik Anda.

## 2. Tinjau file sebelum commit

Jalankan dari root `korea-lms`:

```bash
git status --short
git ls-files --others --exclude-standard
```

Pastikan daftar berisi source dan konfigurasi yang memang ingin dibagikan. `.gitignore` tidak mencegah secret yang ditulis langsung dalam source; periksa konfigurasi custom dan aset privat juga.

Verifikasi aturan ignore, termasuk untuk path yang belum ada:

```bash
git check-ignore --no-index apps/api/.env apps/admin/.env.local apps/mobile/.env apps/api/dist/main.js apps/admin/.next/cache/example apps/mobile/.expo/settings.json apps/api/src/generated/prisma/client.ts
```

Semua path tersebut seharusnya ditampilkan sebagai diabaikan. Sebaliknya, `.env.example`, `schema.prisma`, migration SQL, dan `pnpm-lock.yaml` harus terlihat dalam kandidat commit.

## 3. Stage dan periksa ulang

```bash
git add .
git diff --cached --stat
git diff --cached --name-only
git diff --cached --check
git diff --cached
```

Tinjau terutama `.env.example`, Docker Compose, konfigurasi layanan, dan source integrasi. Jangan gunakan `git add -f` untuk memasukkan file yang diabaikan.

Jika ada file yang tidak seharusnya di-stage, keluarkan dari index tanpa menghapus file lokal:

```bash
git rm --cached -- path/ke/file
```

Untuk folder gunakan `git rm -r --cached -- path/ke/folder`, lalu tambahkan aturan ignore yang tepat. Aturan `.gitignore` tidak otomatis mengeluarkan file yang sudah tracked.

## 4. Buat commit pertama

Periksa identitas Git:

```bash
git var GIT_AUTHOR_IDENT
```

Jika belum dikonfigurasi, atur identitas khusus repository ini; gunakan email GitHub atau alamat noreply GitHub Anda:

```bash
git config user.name "Nama Anda"
git config user.email "email-anda"
```

Lalu commit:

```bash
git commit -m "chore: initialize Korea LMS monorepo and documentation"
git branch -M main
```

Source memiliki beberapa blocker build/test yang tercatat di [development.md](development.md#masalah-yang-diketahui). Commit awal dapat menyimpan kondisi pekerjaan saat ini; jangan menyebutnya rilis siap production sebelum pemeriksaan aplikasi selesai.

## 5. Hubungkan dengan GitHub

Jika repository GitHub belum dibuat, buat repository bernama `korea-lms` melalui GitHub. Pilih visibilitas sesuai kebutuhan. Untuk alur paling sederhana, buat repository kosong **tanpa** inisialisasi README, `.gitignore`, atau license karena file lokal sudah tersedia.

Ganti `USERNAME` dengan akun atau organisasi Anda:

```bash
git remote add origin https://github.com/USERNAME/korea-lms.git
git remote -v
git ls-remote origin
```

Pastikan URL menuju repository yang benar. `git ls-remote origin` tanpa output dan tanpa error menunjukkan remote kosong. Jika muncul ref/commit, remote sudah berisi history: fetch dan periksa terlebih dahulu, jangan langsung menimpa dengan force push:

```bash
git fetch origin
git log --oneline --graph --decorate --all
```

Jika `origin` ternyata sudah ada, cek `git remote -v` sebelum mengubahnya. Untuk mengganti URL yang memang salah, gunakan `git remote set-url origin <URL-yang-benar>`.

HTTPS memerlukan metode autentikasi GitHub yang didukung, misalnya credential manager atau login GitHub CLI (`gh auth login`, lalu `gh auth setup-git` jika CLI tersedia). Jangan menaruh personal access token di URL remote atau file proyek. Jika SSH sudah dikonfigurasi, URL remote dapat memakai `git@github.com:USERNAME/korea-lms.git`.

## 6. Push pertama dan verifikasi

### Jika helper tidak tersedia atau password ditolak

Error `credential-manager-core is not a git command` berarti Git menunjuk credential helper yang tidak terpasang. Nonaktifkan helper tersebut khusus repository ini tanpa mengubah konfigurasi global:

```bash
git config --local --replace-all credential.helper ''
```

Nilai kosong lokal mereset daftar helper yang diwarisi dari konfigurasi global. Untuk push HTTPS tanpa credential manager, buat **fine-grained personal access token** di GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens. Pilih pemilik repository yang benar, batasi akses ke `korea-lms`, dan beri repository permission **Contents: Read and write** dengan masa berlaku yang sesuai.

Jalankan `git push -u origin main` kembali. Isi username GitHub, lalu tempel token pada prompt `Password`, bukan password akun. Terminal biasanya tidak menampilkan karakter saat token ditempel. Jangan kirim token ke chat, simpan dalam repository, atau masukkan ke URL remote. Dengan helper kosong ini, token tidak disimpan oleh Git credential helper sehingga autentikasi dapat diminta lagi pada push berikutnya.

Jika tetap ditolak, periksa pemilik repository, pilihan repository pada token, izin Contents, masa berlaku, serta persetujuan organisasi bila berlaku.

Untuk remote kosong yang sudah diperiksa:

```bash
git push -u origin main
git status
```

Buka GitHub dan cek struktur `apps/admin`, `apps/api`, `apps/mobile`, `docs`, dan `infra`. Pastikan `.env`, `node_modules`, `dist`, `.next`, `.expo`, serta generated Prisma client tidak tampil. Folder `packages/` belum muncul karena masih kosong; Git tidak menyimpan direktori kosong.

## 7. Update berikutnya

Sebelum memulai pekerjaan, pastikan working tree bersih lalu ambil pembaruan jika bekerja lintas perangkat/anggota:

```bash
git pull --ff-only
```

Setelah perubahan selesai dan pemeriksaan yang relevan dijalankan:

```bash
git status --short
git add path/ke/file-yang-diubah
git diff --cached
git diff --cached --check
git commit -m "feat: jelaskan perubahan"
git push
```

Ganti path dan pesan commit sesuai perubahan. Jika push ditolak karena remote lebih baru, fetch dan integrasikan perubahan terlebih dahulu; jangan gunakan `--force` sebagai jalan pintas.

Jika secret pernah masuk commit, menghapus file atau menambahkan `.gitignore` saja tidak menghapusnya dari history. Ganti/cabut secret tersebut dan bersihkan history sebelum membagikan repository.
