# Roblox Music Bulk Uploader + Copyright Pre-Check

Starter project: upload banyak musik sekaligus ke Roblox, dengan pre-check
potensi copyright sebelum di-upload.

## ⚠️ Yang perlu dipahami dulu

1. **Pre-check copyright bukan jaminan.** Ini cuma perkiraan awal pakai
   AudD.io. Roblox tetap punya sistem moderasi audio sendiri yang final
   menentukan lolos/tidaknya sebuah file.
2. **Kamu butuh API key sendiri** — API key TIDAK disertakan di project ini
   karena bersifat rahasia dan biayanya jadi tanggung jawabmu sendiri.

## Setup

1. Install Node.js (versi 18+) kalau belum ada.
2. Di folder project, jalankan:
   ```
   npm install
   ```
3. Copy `.env.example` jadi `.env`, lalu isi:
   - `ROBLOX_API_KEY` — buat di https://create.roblox.com/dashboard/credentials
     (pilih scope **Assets - Write**)
   - `ROBLOX_CREATOR_TYPE` dan `ROBLOX_CREATOR_ID` — User ID atau Group ID
     Roblox-mu
   - `AUDD_API_TOKEN` — daftar gratis di https://dashboard.audd.io/
4. Jalankan servernya:
   ```
   npm start
   ```
5. Buka `http://localhost:3000` di browser.

## Alur pakai

1. Pilih beberapa file musik (mp3/wav) lewat form di web.
2. Klik "Cek & Tampilkan" — tiap file dicek ke AudD, hasil ditandai
   ⚠️ (terdeteksi cocok lagu berhak cipta) atau ✅ (tidak terdeteksi).
3. Klik "Upload ke Roblox" pada file yang mau kamu lanjutkan.
4. Roblox akan memproses (moderasi) asset di background — status akhirnya
   bisa dicek lewat endpoint `/api/upload-status/:operationId` (operationId
   didapat dari response upload).

## Catatan teknis

- File yang di-upload sementara disimpan di folder `uploads/` di server —
  ini contoh sederhana, untuk produksi sebaiknya dibersihkan otomatis
  setelah proses selesai.
- Endpoint Roblox Open Cloud Assets API bisa berubah — cek dokumentasi
  resmi sebelum deploy serius:
  https://create.roblox.com/docs/cloud/reference/Asset
- AudD free tier ada batas jumlah request per hari — kalau butuh cek
  banyak file rutin, pertimbangkan tier berbayar atau alternatif
  (ACRCloud).

## Pengembangan lanjutan yang bisa ditambahkan

- Rate limiting biar tidak kena limit API Roblox saat upload banyak file
- Antrian (queue) upload otomatis satu-satu tanpa perlu klik manual
- Riwayat upload (simpan ke database) + status approved/rejected
- Autentikasi login biar tool ini tidak bisa dipakai orang lain
