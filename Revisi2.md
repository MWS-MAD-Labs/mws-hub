Bug Fix: app.mws.web.id Returns Cloudflare 502 Bad Gateway

Context

Setelah deploy ke staging, semua container di Komodo:

frontend --- RUNNING

backend --- RUNNING

db --- RUNNING

Namun saat mengakses:

https://app.mws.web.id/auth/google/start

Cloudflare mengembalikan:

502 Bad Gateway

Cloudflare menunjukkan:

Browser: Working

Cloudflare: Working

Host: Error

Evidence

Log frontend menunjukkan:

127.0.0.1 - - [01/Sep/2026:01:00:58 +0000] "GET / HTTP/1.1" 444 0 "-" "Wget" "-"

Frontend healthcheck saat ini menggunakan:

healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://127.0.0.1/ >/dev/null"]

HTTP 444 mengindikasikan Nginx menutup request secara sengaja.
Investigasi harus fokus pada konfigurasi Nginx, server_name, default
server, host validation, routing, dan healthcheck.

Docker Network

Current architecture:

Cloudflare
    ↓
Reverse Proxy / Komodo
    ↓
frontend
    ↓
backend
    ↓
db

Network configuration:

frontend → internal + mws-unified

backend → internal

db → internal

Frontend exposes port 80.

Backend exposes port 4001 internally.

Task

Investigate and fix the root cause of the 502 Bad Gateway.

1. Investigate Nginx

Periksa seluruh konfigurasi Nginx/frontend, terutama:

server_name

default server

return 444

host validation

routing /auth/*

proxy configuration

upstream backend

port yang digunakan frontend/backend

Cari tahu kenapa request healthcheck:

GET / HTTP/1.1
Host: 127.0.0.1

mendapat:

444

2. Fix Frontend Healthcheck

Pastikan healthcheck frontend:

tidak mendapatkan HTTP 444

menghasilkan HTTP 200

tetap valid di dalam Docker container

tidak bergantung pada Cloudflare atau external DNS

Jika diperlukan, gunakan endpoint healthcheck yang memang sesuai dengan
konfigurasi Nginx.

3. Verify Authentication Routing

Pastikan request berikut berjalan dengan benar:

https://app.mws.web.id/
https://app.mws.web.id/auth/google/start

Pastikan alurnya:

Cloudflare
    ↓
reverse proxy
    ↓
frontend
    ↓
backend:4001

dan /auth/* tidak salah diarahkan atau diblokir oleh Nginx.

4. Verify Docker Networking

Pastikan:

frontend dapat mengakses backend melalui internal

reverse proxy dapat mengakses frontend melalui mws-unified

tidak ada routing yang mencoba mengakses backend:4001 dari network
yang tidak memiliki backend

tidak ada port mismatch

5. Preserve Existing Functionality

Jangan:

menghapus Google OAuth/SSO yang masih digunakan

mengubah credential production

mengubah Cloudflare configuration tanpa alasan

menghapus Docker network yang sudah digunakan

melakukan perubahan besar yang tidak diperlukan

Gunakan minimal and targeted fix.

Validation

Setelah melakukan perubahan:

Docker

Pastikan semua service:

frontend   RUNNING / HEALTHY
backend    RUNNING / HEALTHY
db         RUNNING / HEALTHY

Healthcheck

Pastikan frontend healthcheck menghasilkan:

HTTP 200

bukan:

HTTP 444

Application

Verifikasi:

https://app.mws.web.id/
https://app.mws.web.id/auth/google/start

tidak lagi menghasilkan Cloudflare 502.

Tests

Jalankan test/build yang relevan dan pastikan tidak ada regression.

Important

Jangan langsung mengubah Docker Compose hanya berdasarkan asumsi.

Identifikasi root cause terlebih dahulu berdasarkan:

Nginx configuration

Frontend logs

Docker healthcheck

Docker networks

Reverse proxy routing

Backend connectivity

Kemudian lakukan fix paling minimal dan jelaskan root cause serta
perubahan yang dilakukan.