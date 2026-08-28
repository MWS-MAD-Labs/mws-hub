Bikin MVP sederhana untuk **Admin Dashboard access** di MWS Hub.

### Central DB Reference

Gunakan project/source **Central Database User** sebagai referensi untuk mengambil struktur dan data user/unit:

`~/Downloads/mws-central-database-user`

Jangan membuat struktur user/unit baru kalau data tersebut sudah tersedia di Central DB.

### Access Rule

User yang boleh melihat dan mengakses Admin Dashboard hanya user dari unit **MAD Labs**.

Gunakan `unitId` dari data user di Central sebagai source of truth:

`cmsh7trcj000a40lsm0w7tl4h`

### Flow

* Tetap gunakan **1 login / Google Workspace SSO** yang sudah ada.
* Setelah login, ambil data user beserta `unitId` dari Central.
* Jika `unitId === "cmsh7trcj000a40lsm0w7tl4h"`, tampilkan tombol **Admin Dashboard**.
* Jika bukan MAD Labs, tombol tersebut **jangan ditampilkan**.
* Tombol mengarah ke `/admin` atau `/admin/dashboard`.
* Buat halaman Admin Dashboard sederhana terlebih dahulu.
* Backend juga wajib melakukan authorization check berdasarkan `unitId`, supaya user non-MAD Labs tidak bisa bypass dengan membuka URL `/admin` secara langsung.
* Jangan membuat login kedua. Admin tetap menggunakan login yang sama.

### Scope

Untuk tahap ini cukup:

1. Login → ambil user dari Central.
2. Check `unitId`.
3. Conditional display tombol Admin Dashboard.
4. Protected admin route/backend.
5. Simple Admin Dashboard.

**Jangan dulu implement Catalog CRUD, App Status Toggle, Report Broken Tool, atau Request Access.**

Fokus pertama: pastikan **login → Central user → unitId → MAD Labs authorization → Admin Dashboard** berjalan end-to-end.
