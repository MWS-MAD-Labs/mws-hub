# Revisi Add Application

## Keputusan Form

1. **Icon wajib dipilih dari daftar icon umum.** Saat field diklik, tampilkan icon picker beserta nama atau tooltip-nya agar fungsi icon mudah dipahami. Upload SVG tidak diperlukan untuk versi pertama; bisa dipertimbangkan sebagai enhancement setelah validasi kebutuhan.
2. **Category wajib berupa dropdown** dari taxonomy yang sudah tersedia. Admin tidak mengetik category secara bebas.
3. **Audience wajib berupa dropdown atau multi-select** dari daftar role yang didukung, misalnya `Everyone`, `Teachers`, `Staff`, `Admin`, dan `Director`. Hindari input teks bebas agar penamaan konsisten.
4. **Description opsional**, tetapi disarankan diisi agar kartu aplikasi tetap informatif.
5. **Keywords opsional.** Simpan sebagai daftar kata atau tag. Placeholder: `Contoh: report, student, dashboard`.
6. **URL wajib** untuk aplikasi yang berstatus `Active` atau `Maintenance`. Validasi harus menolak URL kosong dan format URL yang tidak valid.
7. **Status hanya dua pilihan untuk versi ini:**
   - `Active`: kartu dapat dibuka.
   - `Maintenance`: kartu tetap terlihat, tetapi link dinonaktifkan dan menampilkan pesan singkat bahwa aplikasi sedang diperbaiki.

## Sort Order

`Sort order` adalah angka untuk menentukan urutan kartu aplikasi ketika ditampilkan. Angka yang lebih kecil tampil lebih awal. Field ini bukan prioritas akses dan bukan ranking aplikasi.

Untuk mengurangi kebingungan pada versi pertama, field ini dapat:

- diisi otomatis berdasarkan urutan pembuatan; atau
- diberi label yang lebih jelas: **Display order (optional)**.

Jika display order tidak diisi, aplikasi diletakkan setelah aplikasi yang sudah memiliki urutan.

## Allowed Source

Pertahankan field ini. Nilainya perlu divalidasi saat QA untuk memastikan aplikasi hanya dapat dibuka dari sumber atau environment yang memang diizinkan.

## SSO App ID

`SSO App ID` wajib untuk setiap aplikasi yang terhubung ke Hub. Admin tidak perlu menyalin konfigurasi environment ke form. Flow yang disarankan:

1. Admin mengisi **SSO App ID** yang unik, stabil, dan dibuat saat aplikasi didaftarkan, misalnya `local-daily-checkin-mtss`.
2. Hub menggunakan ID tersebut untuk membuat atau memvalidasi payload SSO ketika user membuka aplikasi.
3. Aplikasi tujuan memverifikasi payload menggunakan `HUB_SSO_PUBLIC_KEY` dan mengambil identitas user dari payload yang sudah tervalidasi.
4. Pengecekan identitas tambahan ke Central dilakukan oleh backend aplikasi tujuan melalui endpoint internal, menggunakan token server-side. Token tidak boleh dimasukkan ke frontend, markdown, Postman collection yang dibagikan, atau database yang dapat dibaca user.
5. Public key boleh dikonfigurasi di environment aplikasi tujuan. Private key hanya berada di backend Hub dan tidak pernah dikirim ke browser.

Konfigurasi lokal cukup didokumentasikan sebagai nama variable dan placeholder, bukan nilai credential asli:

```env
MWS_DATA_CENTER_API_URL=http://localhost:5173/api/internal
MWS_DATA_CENTER_API_TOKEN=<server-side-secret>
HUB_SSO_PUBLIC_KEY=<hub-public-key>
```

Credential yang sempat tertulis di dokumen ini perlu di-rotate atau dicabut karena sudah terekspos.

## Permintaan Fitur 7-10

7. **No-Code Catalog Control:** MAD Labs atau IT dapat menambah, mengubah, mengurutkan, dan menyembunyikan kartu aplikasi melalui halaman admin tanpa mengubah kode.
8. **App Status Toggles:** Admin dapat mengubah status menjadi `Active` atau `Maintenance`. Status `Maintenance` menonaktifkan link dan menampilkan alasan singkat. Badge `New` tidak menjadi status tersendiri; gunakan flag atau tanggal publikasi jika memang diperlukan.
9. **Report Broken Tool:** Setiap kartu aktif memiliki aksi **Report a problem**. Aksi ini mengirimkan `appId`, URL, user, waktu, dan deskripsi masalah ke backend atau kanal laporan MAD Labs.
10. **Request Access:** Kartu yang tidak dapat diakses memiliki aksi **Request access**. Request menyimpan `appId`, user, alasan, waktu, dan status review. Tombol tidak boleh hanya menampilkan toast mock.

## Acceptance Criteria

- Admin dapat menambah dan mengubah aplikasi tanpa redeploy frontend.
- Field wajib divalidasi: `name`, `icon`, `category`, `audience`, `url`, `allowed source`, dan `SSO App ID`.
- Aplikasi `Maintenance` terlihat tetapi tidak dapat dibuka.
- Aplikasi tersembunyi tidak muncul di katalog user.
- Icon, category, audience, dan status tampil konsisten di seluruh katalog.
- Tidak ada secret atau private key yang dikirim ke frontend.
- Report problem dan Request access menghasilkan record backend yang dapat ditindaklanjuti admin.
