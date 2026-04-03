# FlowHR Mobile Employee

MVP aplikasi mobile FlowHR (role: employee) berbasis Expo + React Native untuk login dan dashboard absensi.

## Stack

- Expo + React Native + TypeScript
- Expo Router
- Axios
- Zustand
- Expo Secure Store

## Setup

1. Install dependency:

```bash
npm install
```

2. Salin file env:

```bash
cp .env.example .env
```

3. Isi `EXPO_PUBLIC_API_BASE_URL` dengan URL backend mobile API:

```env
EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP_BACKEND>:8000/api/mobile
```

4. Jalankan backend Laravel (di folder `FlowHR`):

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

5. Jalankan aplikasi mobile:

```bash
npm run start
```

## Endpoint yang dipakai

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /dashboard`

Semua endpoint diakses melalui base URL `EXPO_PUBLIC_API_BASE_URL`.

## Kredensial seed contoh

- Email: `abc@def.co.id`
- Password: `password`

Pastikan data seed backend sudah tersedia.
