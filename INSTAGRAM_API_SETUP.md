# Panduan Setup Instagram API

Panduan lengkap untuk mendapatkan Instagram API Access Token untuk website portfolio Anda.

## Metode 1: Instagram Basic Display API (Recommended)

### Langkah 1: Buat Facebook App

1. Buka [Facebook Developers](https://developers.facebook.com/)
2. Login dengan akun Facebook Anda
3. Klik **"My Apps"** di pojok kanan atas
4. Klik **"Create App"**
5. Pilih tipe app: **"Consumer"** atau **"Business"**
6. Isi informasi:
   - **App Display Name**: Nama aplikasi Anda (contoh: "Nelshen Portfolio")
   - **App Contact Email**: Email Anda
   - Klik **"Create App"**

### Langkah 2: Setup Instagram Basic Display

1. Di dashboard app Anda, cari **"Instagram Basic Display"**
2. Klik **"Set Up"** atau **"Add Product"**
3. Pilih **"Instagram Basic Display"** → Klik **"Set Up"**

### Langkah 3: Konfigurasi OAuth Redirect URIs

1. Di sidebar, klik **"Basic Display"** → **"Settings"**
2. Scroll ke bagian **"OAuth Redirect URIs"**
3. Tambahkan URI:
   - Untuk development: `http://localhost:8000/`
   - Untuk production: `https://yourusername.github.io/` (sesuaikan dengan domain GitHub Pages Anda)
4. Klik **"Save Changes"**

### Langkah 4: Tambahkan Test Users (Opsional untuk Testing)

1. Di **"Basic Display"** → **"User Token Generator"**
2. Klik **"Add or Remove Instagram Testers"**
3. Tambahkan Instagram account Anda sebagai tester
4. Accept invitation di Instagram app Anda

### Langkah 5: Generate Access Token

1. Masih di **"User Token Generator"**
2. Klik **"Generate Token"**
3. Pilih Instagram account yang ingin digunakan
4. Authorize permissions yang diminta
5. Copy **Access Token** yang muncul
6. Copy juga **User ID** yang terlihat

### Langkah 6: Konfigurasi di config.json

Buka `config.json` dan update:

```json
{
  "profile": {
    "useInstagramAPI": true,
    "instagramAPI": {
      "accessToken": "PASTE_ACCESS_TOKEN_DISINI",
      "userId": "PASTE_USER_ID_DISINI",
      "username": "your_instagram_username"
    }
  }
}
```

**Catatan:**

- Ganti `your_instagram_username` dengan username Instagram Anda (tanpa @)
- Access Token biasanya berlaku 60 hari
- Untuk token yang lebih lama, gunakan Long-Lived Token (lihat di bawah)

---

## Metode 2: Long-Lived Token (Token Lebih Lama)

Access Token default hanya berlaku 60 hari. Untuk token yang lebih lama (60 hari + bisa di-refresh):

### Langkah 1: Exchange Short-Lived Token ke Long-Lived Token

1. Buka browser dan akses URL ini (ganti dengan token Anda):

```
https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=YOUR_SHORT_LIVED_TOKEN
```

**Cara mendapatkan App Secret:**

- Di Facebook Developers dashboard
- Klik **"Settings"** → **"Basic"**
- Copy **"App Secret"** (klik "Show" untuk melihat)

2. Copy response yang muncul, cari `access_token` dan `expires_in`
3. Gunakan token baru ini di `config.json`

### Langkah 2: Refresh Token (Sebelum Expire)

Sebelum token expire, refresh dengan URL:

```
https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=YOUR_LONG_LIVED_TOKEN
```

---

## Metode 3: Instagram Graph API (Untuk Business/Creator Account)

Jika Anda punya Instagram Business atau Creator account:

### Langkah 1: Connect Instagram Account ke Facebook Page

1. Buat Facebook Page (jika belum punya)
2. Di Facebook Page Settings → **"Instagram"**
3. Connect Instagram Business/Creator account Anda

### Langkah 2: Setup Instagram Graph API

1. Di Facebook Developers dashboard
2. Tambahkan produk **"Instagram Graph API"**
3. Di **"Tools"** → **"Graph API Explorer"**
4. Pilih app dan page Anda
5. Generate token dengan permissions: `instagram_basic`, `pages_read_engagement`
6. Copy token dan user ID

---

## Troubleshooting

### Error: "Invalid OAuth access token"

- Token mungkin sudah expire
- Generate token baru atau refresh token

### Error: "User not found"

- Pastikan User ID benar
- Pastikan Instagram account sudah di-connect dengan Facebook app

### Error: CORS di Browser

- Instagram API tidak bisa diakses langsung dari browser (CORS)
- Untuk static site seperti GitHub Pages, pertimbangkan:
  - Menggunakan proxy server
  - Menggunakan serverless function (Vercel, Netlify Functions)
  - Atau update manual di config.json

### Token Expired

- Access Token memiliki masa berlaku
- Setup reminder untuk refresh token sebelum expire
- Atau gunakan metode update manual di config.json

---

## Alternatif: Update Manual (Tanpa API)

Jika setup API terlalu kompleks, Anda bisa update manual:

1. Set `useInstagramAPI: false` di config.json
2. Update manual:
   - `photo`: URL foto profil Instagram Anda
   - `bio`: Copy bio dari Instagram
   - `instagram`: Username Instagram Anda

**Cara mendapatkan URL foto profil Instagram:**

1. Buka Instagram di browser
2. Buka profil Anda
3. Klik kanan pada foto profil → "Copy image address"
4. Paste URL tersebut di `config.json` → `profile.photo`

---

## Keamanan

⚠️ **PENTING:**

- Jangan commit access token ke repository public GitHub
- Gunakan GitHub Secrets atau environment variables
- Untuk GitHub Pages, pertimbangkan menggunakan serverless function sebagai proxy
- Atau simpan token di tempat yang aman dan update manual

---

## Referensi

- [Instagram Basic Display API Docs](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Facebook Developers](https://developers.facebook.com/)
- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)

---

## Quick Start (TL;DR)

1. Buat app di [Facebook Developers](https://developers.facebook.com/)
2. Tambahkan produk "Instagram Basic Display"
3. Generate token di "User Token Generator"
4. Copy token dan user ID
5. Paste di `config.json`
6. Set `useInstagramAPI: true`

Selesai! 🎉
