Tolong refactor dan perbaiki implementasi MWS Hub secara menyeluruh, khususnya bagian Admin Access, No-Code Catalog Control, Access Groups, dan integrasi dengan Central DB.

Jangan sekadar patch error. Audit dulu architecture, API, service, model, dan frontend flow yang sudah ada.

PRINSIP UTAMA:
CENTRAL DB ADALAH SINGLE SOURCE OF TRUTH untuk identity dan master data. MWS Hub adalah consumer/orchestrator, bukan tempat untuk menduplikasi data Central.

1. MAD LAB / UNIT ID

Saat ini implementasi MAD Lab masih menentukan atau menambahkan unitId secara manual di admin-access.ts.

Ini harus dihilangkan.

Kalau employee/student dari Central sudah memiliki unitId, Hub harus menggunakan unitId tersebut langsung dari response Central API.

Jangan:
- hardcode unitId di admin-access.ts
- membuat mapping unit manual
- membuat array unit sendiri di Hub
- menentukan unit dengan logic duplicate
- membuat source of truth kedua

Flow yang benar:

Central DB
→ Central API
→ Employee/Student Identity
→ unitId dari Central
→ MWS Hub
→ authorization/access control

Audit terlebih dahulu response Central API yang sekarang. Jangan membuat struktur baru sebelum memastikan field apa saja yang sudah tersedia.

2. EMPLOYEE / STUDENT IDENTITY

Hub tidak perlu membuat identity model/format sendiri jika Central sudah menyediakan data identity yang lengkap.

Gunakan data dari Central, termasuk jika tersedia:
- employee/student ID
- email
- name
- unitId
- unit
- jobPositionId
- jobPosition
- jobLevelId
- jobLevel
- status dan identity-related fields lainnya

Mapping hanya dilakukan jika memang dibutuhkan oleh kontrak API atau UI. Jangan melakukan mapping hanya karena Hub membuat struktur data sendiri.

3. ACCESS GROUPS

Access Groups harus menggunakan master data dari Central.

Central sudah memiliki:
- Unit
- Job Position
- Job Level

Jadi Hub harus mengambil dan menggunakan data tersebut dari Central API.

Jangan membuat duplicate master data di Hub seperti:

const units = [...]
const jobPositions = [...]
const jobLevels = [...]

Gunakan ID/reference dari Central sebagai source of truth.

Jika Unit, Job Position, atau Job Level berubah di Central, Hub harus mendapatkan data terbaru tanpa perlu mengubah source code Hub.

4. NO-CODE CATALOG CONTROL (#7)

Requirement #7 yang dimaksud adalah:

"No-Code Catalog Control: A simple admin screen where MAD Labs / IT can add, edit, or hide app cards without touching code."

Implementasi ini harus benar-benar mengikuti konsep tersebut.

Admin/MAD Labs/IT harus bisa mengelola catalog aplikasi melalui UI tanpa mengubah source code.

Minimal harus bisa:
- add app
- edit app
- hide/show app
- mengatur nama aplikasi
- description
- icon
- URL/launch URL
- status/visibility
- category jika memang digunakan
- ordering jika diperlukan
- access/target audience sesuai authorization model

Jangan hardcode daftar aplikasi di frontend sebagai source of truth.

Jangan membuat:

const apps = [...]

sebagai daftar aplikasi utama yang harus diedit developer setiap kali ada perubahan.

Catalog aplikasi harus berasal dari backend/database sehingga perubahan dari admin UI langsung tercermin di launcher.

Flow yang diinginkan:

MAD Labs / IT
→ Admin Catalog
→ Create/Edit/Hide App
→ Backend/API
→ Catalog DB
→ MWS Hub Launcher

Jadi requirement "No-Code" benar-benar berarti admin dapat mengelola app cards tanpa menyentuh code.

5. PISAHKAN CATALOG DENGAN AUTHORIZATION

Jangan mencampur data catalog aplikasi dengan authorization logic.

Catalog menentukan:
- aplikasi apa yang tersedia
- nama
- description
- icon
- URL
- visibility
- metadata aplikasi

Authorization menentukan:
- siapa yang boleh melihat/membuka aplikasi
- berdasarkan identity dari Central
- berdasarkan Unit / Job Position / Job Level / role atau access rule yang memang diperlukan

Jadi secara konsep:

Central Identity + Master Data
        ↓
Authorization Rules
        ↓
User Access

Catalog
        ↓
App Metadata
        ↓
Launcher

Keduanya boleh berhubungan, tetapi jangan membuat duplicate identity/master data di Catalog.

6. ADMIN CATALOG UI

Review UI No-Code Catalog Control yang sekarang.

Kalau sekarang menggunakan popup/modal yang membuat flow sulit dipahami, ubah menjadi dedicated page/route yang jelas.

Contoh:

/admin/catalog
/admin/catalog/new
/admin/catalog/:id/edit

Halaman utama menampilkan daftar aplikasi dengan action yang jelas:
- Edit
- Hide/Show
- Delete jika memang diperlukan
- Create App

Create/Edit sebaiknya menggunakan dedicated page, bukan modal bertingkat yang membingungkan.

7. JANGAN BUAT DATA DUPLICATE

Audit seluruh code untuk mencari:
- hardcoded apps
- hardcoded unitId
- hardcoded units
- hardcoded job positions
- hardcoded job levels
- manual employee/student mapping
- duplicate identity structures
- manual access-group data

Kalau data tersebut sebenarnya sudah ada di Central atau database catalog, gunakan data existing tersebut.

Jangan membuat workaround atau source of truth baru hanya untuk membuat frontend bekerja.

8. TARGET ARCHITECTURE

Central:

Central DB
↓
Central API
↓
Employee/Student Identity
+ Unit
+ Job Position
+ Job Level
↓
MWS Hub Authorization

Catalog:

Catalog DB
↓
Catalog API
↓
MWS Hub Launcher

Authorization:

Central Identity
+
Central Master Data
+
Access Rules
↓
User App Access

Catalog dan Authorization harus memiliki responsibility yang jelas.

9. ACCEPTANCE CRITERIA

- unitId MAD Labs berasal dari Central, bukan hardcode admin-access.ts
- employee/student identity berasal dari Central
- Unit berasal dari Central
- Job Position berasal dari Central
- Job Level berasal dari Central
- tidak ada duplicate master-data array di Hub
- tidak ada hardcoded identity/master-data ID yang sebenarnya sudah tersedia di Central
- No-Code Catalog Control benar-benar dapat digunakan MAD Labs/IT tanpa mengubah source code
- admin dapat add app
- admin dapat edit app
- admin dapat hide/show app
- perubahan catalog tersimpan di backend/database
- launcher mengambil catalog dari API/database, bukan hardcoded frontend array
- Catalog metadata dipisahkan dari authorization logic
- authorization tetap menggunakan identity/master data dari Central
- Create/Edit Catalog menggunakan dedicated page/route jika flow modal saat ini membingungkan
- tidak membuat source of truth kedua untuk data Central
- tidak sekadar patch error; rapikan architecture dan data flow yang sudah ada

Setelah implementasi selesai, jelaskan:
1. file apa saja yang diubah
2. data apa yang sekarang berasal dari Central
3. bagaimana Catalog disimpan dan diambil
4. bagaimana authorization menentukan akses aplikasi
5. flow lengkap Central → Hub → Catalog → Launcher → Authorization
6. bagian hardcoded/duplicate apa saja yang berhasil dihilangkan.