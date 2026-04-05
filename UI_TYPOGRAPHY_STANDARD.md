# UI Typography Standard (Mobile Employee)

Dokumen ini menjadi acuan tipografi untuk layar utama aplikasi mobile employee, khususnya `Beranda`, `History`, dan `Leave`.

## Tujuan
- Menurunkan ukuran teks secara moderat tanpa membuat layout terasa sempit.
- Menjaga hierarki visual: judul > nilai utama > body > label.
- Menjaga affordance elemen interaktif (terutama bottom navbar dan CTA).

## Design Tokens
Sumber token: `src/theme/typography.ts`

### Typography
- `titlePage`: judul halaman utama.
- `titleCard`: judul section/card.
- `metricXL`: angka/metric terbesar (jam utama).
- `metricL`: angka/metric besar (status/timer).
- `body`: isi paragraf/value regular.
- `caption`: teks pendukung.
- `labelCaps`: label uppercase kecil.
- `navLabel`: label bottom navbar.

### Spacing
- `s4`, `s6`, `s8`, `s12`, `s16`, `s20`.

## Aturan Umum
- `letterSpacing`:
  - Label uppercase: `0.6 - 1.0`.
  - Body/value normal: `0`.
  - Metric/judul besar: `-0.2 - -0.4` (maksimal).
- Vertical rhythm:
  - Dalam card: gap utama `8/12`.
  - Label ke value: `4/6`.
  - Antar section/card: `14/16`.
- Jangan kompres container:
  - Padding card tetap di rentang `14 - 18`.

## Standar Bottom Navbar
- Label wajib menggunakan `typography.navLabel`.
- Rekomendasi:
  - `fontSize: 11`
  - `lineHeight: 14`
  - `fontWeight: 700`
  - `letterSpacing: 0.6`
- Komponen wajib reusable: `src/components/bottom-navbar.tsx`.
- Ikon Dashboard wajib ikon rumah (`home` / `home-outline`) agar affordance konsisten.
- Tap target:
  - Tinggi item navbar minimal `44`.
  - Implementasi saat ini memakai `height: 64` (aman).

## Checklist Implementasi
- [ ] Semua halaman utama pakai token dari `src/theme/typography.ts`.
- [ ] Bottom navbar `navLabel` konsisten di `Dashboard`, `History`, `Leave`.
- [ ] Tidak ada ukuran hardcoded baru kecuali alasan khusus.
- [ ] Cek visual di lebar layar kecil/sedang.
