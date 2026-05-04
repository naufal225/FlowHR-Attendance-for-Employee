# FlowHR Mobile Employee

FlowHR Mobile Employee adalah aplikasi mobile untuk role `employee` yang terhubung ke mobile API milik `FlowHR`.

Fitur utama yang saat ini terlihat dari repo:

- login/logout berbasis token Sanctum
- dashboard employee
- attendance check-in/check-out via QR
- validasi lokasi attendance
- attendance history
- leave page
- update profile dan password
- penyimpanan token aman di device

## Tech Stack

- Expo SDK 54
- React 19
- React Native 0.81
- TypeScript
- Expo Router
- Axios
- Zustand
- Expo Secure Store
- Expo Camera
- Expo Location
- Expo Image Picker

## Dependency Utama

- `expo`
- `react-native`
- `expo-router`
- `axios`
- `zustand`
- `expo-secure-store`
- `expo-camera`
- `expo-location`
- `expo-image-picker`
- `react-native-safe-area-context`
- `react-native-screens`

## Prasyarat

- Git
- Node.js 20+ dan npm
- Android Studio emulator atau device Android fisik
- Expo CLI runtime dari package local project
- backend `FlowHR` sudah aktif

## Clone dan Install

Clone repo:

```bash
git clone <repo-url>
cd "FlowHR Ukom Project"
```

Masuk ke folder mobile:

```bash
cd flowhr-mobile-employee
```

Install dependency:

```bash
npm install
```

## Konfigurasi Environment

Salin environment:

```bash
copy .env.example .env
```

Isi `EXPO_PUBLIC_API_BASE_URL`:

```env
EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP_BACKEND>:8000/api/mobile
```

Catatan penting:

- jangan pakai `localhost` bila Anda menjalankan aplikasi di device fisik
- gunakan IP LAN komputer yang menjalankan backend `FlowHR`
- backend harus bisa diakses device mobile pada jaringan yang sama

Contoh:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000/api/mobile
```

## Backend yang Harus Aktif

Aplikasi mobile ini bergantung pada `FlowHR`, bukan `FlowHR-reporting-app`.

Jalankan backend utama:

```bash
cd FlowHR
php artisan serve --host=0.0.0.0 --port=8000
```

Jika web FlowHR juga sedang dipakai untuk development frontend:

```bash
npm run dev
```

## Menjalankan Aplikasi Mobile

### Expo development server

```bash
npm run start
```

### Android emulator / device

```bash
npm run android
```

### Web preview

```bash
npm run web
```

## Endpoint Backend yang Dipakai

Endpoint utama yang dipanggil mobile app:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `PUT /profile`
- `PUT /profile/password`
- `GET /dashboard`
- `GET /employee/leave`
- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `GET /attendance/history`
- `GET /attendance/history/{attendanceId}`
- `GET /attendance/corrections`
- `POST /attendance/corrections`

Semua endpoint diakses relatif terhadap `EXPO_PUBLIC_API_BASE_URL`.

## Akun Demo

Jika backend `FlowHR` sudah di-seed:

- employee umum: `hendrik@gmail.com` / `password`
- akun multi-role yang tetap punya role employee: `akbar@gmail.com` / `password`

Untuk mobile, lebih aman memakai akun employee biasa.

## Alur Setup dari Clone Sampai Bisa Dipakai

1. Clone repo
2. Setup dan jalankan PostgreSQL
3. Setup `FlowHR`
4. Jalankan `php artisan migrate --seed` di `FlowHR`
5. Jalankan `php artisan serve --host=0.0.0.0 --port=8000` di `FlowHR`
6. Isi `EXPO_PUBLIC_API_BASE_URL` di mobile app ke IP LAN backend
7. Jalankan `npm install`
8. Jalankan `npm run start` atau `npm run android`
9. Login dengan user hasil seed

## Troubleshooting

### Tidak bisa connect ke API

Jika muncul pesan tidak bisa connect:

- pastikan backend aktif di `0.0.0.0:8000`
- pastikan device dan komputer ada di jaringan yang sama
- pastikan `EXPO_PUBLIC_API_BASE_URL` tidak masih placeholder
- pastikan firewall Windows tidak memblokir port `8000`

### Login gagal 401

Biasanya:

- email/password salah
- user tidak punya role employee
- database backend belum di-seed

### Kamera / lokasi tidak jalan

Pastikan permission kamera dan lokasi diberikan di device.
