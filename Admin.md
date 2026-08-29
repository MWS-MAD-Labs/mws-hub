Rangkuman Lanjutan — Menuntaskan #7, #8, #9, #10

  Kondisi sekarang

  Sudah jalan dan teruji:
  - Database Hub sendiri (Postgres), 3 tabel: applications, app_reports, access_requests
  - 17 app ter-seed; MTSS + Daily Check-in sengaja kosong (bentuknya ada di komentar seed-applications.ts)
  - 4 endpoint CRUD di /admin/applications (GET/POST/PATCH/DELETE), sudah divalidasi
  - Katalog dan gate launch sudah baca dari DB
  - Gate admin: RequireAdmin (frontend) + adminAuthMiddleware → isMadLabsUser (unit MAD Labs)
  - Dashboard.tsx (49 baris) sudah ada, tapi baru memanggil dashboard-data
  
  Yang kurang: UI-nya saja untuk #7/#8, dan seluruh jalur #9/#10.

  ---

  Langkah 1 — Sambungkan Dashboard ke CRUD → tuntaskan #7 dan #8

  Backend: tidak ada pekerjaan. Semua endpoint sudah siap.

  Frontend:
  1. admin/api/adminApi.ts — tambah listApplications, createApplication, updateApplication, deleteApplication
  2. admin/pages/ApplicationsPage.tsx — tabel + tombol Add/Edit/Hide/Delete
  3. admin/components/ApplicationForm.tsx — form dengan field:

  ┌─────────────────────────────────────────────┬──────────────────────────────────────────────────────────────┐
  │                    Field                    │                           Catatan                            │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ name, description, audience, category, icon │ teks biasa                                                   │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ keywords                                    │ multi-input                                                  │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ href                                        │ boleh kosong                                                 │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ status                                      │ dropdown 4 nilai → ini yang menuntaskan #8                   │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ discoverable                                │ toggle "sembunyikan dari grid"                               │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ allowedSources                              │ multi-select 11 key → ini #3, jangan dikosongkan tanpa sadar │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ ssoAppId + ssoEntryUrl                      │ keduanya atau tidak sama sekali (backend menolak 400)        │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ sortOrder                                   │ angka                                                        │
  └─────────────────────────────────────────────┴──────────────────────────────────────────────────────────────┘

  4. Tambah route /admin/applications di App.tsx

  Uji tuntas: daftarkan MTSS + Daily Check-in lewat form, lalu klik launch. Kalau berhasil, #7 terbukti dan dua env <APP>_API_URL bisa dihapus.

  ---

  Langkah 2 — #9 Report Broken Tool

  Tabel app_reports sudah ada.

  - Backend: POST /apps/:id/report (user), GET /admin/reports + PATCH /admin/reports/:id (status)
  - Frontend: tombol kecil di AppCard → dialog isi pesan
  - Admin: daftar laporan + ubah status

  Catatan: reporter_email diambil dari sesi, jangan dari input — jangan percaya klien soal identitas.

  ---

  Langkah 3 — #10 Request Access

  Tabel access_requests sudah ada, dengan unique (application_id, requester_email, status) supaya klik dua kali tidak bikin dua permintaan.

  - Backend: POST /apps/:id/request-access, GET /admin/access-requests, PATCH /admin/access-requests/:id
  - Frontend: ganti mock toast di SupportHubPage.tsx:101 dengan panggilan asli

  Satu keputusan yang belum diambil: sekarang app yang tidak bisa diakses disembunyikan, jadi kartunya tidak pernah muncul dan tombol Request Access tidak terjangkau. Pilihannya:
  - (a) Sediakan halaman "app lain yang tersedia" khusus untuk minta akses
  - (b) Munculkan app terkunci di hasil search saja, tidak di grid

  Tanpa salah satunya, #10 tidak akan pernah terpakai meskipun kodenya jadi.

  ---

  Urutan yang disarankan

  1. Langkah 1 — hasil paling besar, backend sudah nol pekerjaan, langsung menutup #7 dan #8
  2. Langkah 3 — perlu keputusan (a)/(b) dulu
  3. Langkah 2 — paling mandiri, bisa kapan saja

  Setelah Langkah 1: 8 dari 10 requirement selesai.
