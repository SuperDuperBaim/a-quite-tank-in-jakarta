# MASTER_PROJECT_DOCUMENT.md — A Quite Tank (Cozy Aquarium)

**Nama Game:** A Quite Tank (Cozy Aquarium)
**Developer:** Ananda Ibrahim
**Platform:** Web Browser (Responsive Mobile & Desktop)
**Tech Stack Utama:** Vanilla HTML, CSS, JavaScript, dan Firebase (Authentication & Firestore)
**Development Style:** Vibe Coding (OpenCode IDE & Gemini Pro Artwork)

---

## 1. Overview & Prinsip Anti AI-Slop

Game ini adalah **2D Cozy Web Game** santai tentang merawat akuarium yang tenang di peramban. 

### Aturan Anti AI-Slop (Scope & Visual):
* **Fokus Utama:** Akuarium dan ikan adalah elemen visual paling dominan di layar.
* **Tanpa Fitur Berlebihan:** Jangan menambahkan *shop*, *currency*, *inventory* kompleks, *leaderboard*, *breeding*, maupun *pet death*.
* **Desain Hangat & Minimalis:** Hindari *glassmorphism*, efek *neon*, gradasi berlebih, atau *dashboard cards* bertingkat.

---

## 2. Fitur Utama Pemain (Player Features)

### A. Alur Pemain (User Flow)
```text
WELCOME (Login / Register via Firebase Auth)
   │
   ├── User Baru ──> GACHA (Dapat Ikan Pertama) ──> AQUARIUM
   │
   └── User Lama ──> CONTINUE ─────────────────> AQUARIUM
```

### B. Multi-Fish System
* Pemain dapat memiliki **lebih dari 1 ikan** sekaligus di dalam satu akuarium.
* Seluruh ikan milik pemain disimpan dalam koleksi `fishList: []` dan berenang secara independen dengan animasi CSS/JS.

### C. Collapsible Drawer UI (Tombol Toggle)
* Bar Indikator (**Hunger**, **Cleanliness**), **Stok Makanan**, dan **Outfit/Kostum** berada di dalam panel yang dapat **dibuka-tutup (toggle)**.
* Saat panel ditutup, layar menjadi bersih (*clean view*) sehingga pemain fokus menikmati tampilan akuarium.

### D. Sistem Kode Redeem di Menu Settings
Di dalam modal **Settings**, terdapat kolom input untuk memasukkan kode redeem:
1. Kode **`M3Y`** -> Membuka & menambahkan **Ikan Cupang Glow**.
2. Kode **`B41M`** -> Membuka & menambahkan **Ikan Arwana**.
* Setiap kode hanya bisa diklaim 1 kali per akun pemain.

### E. Kebersihan Air Otomatis (Cokelat Keruh)
* **Tanpa Tombol Clean:** Air tidak dibersihkan dengan tombol manual.
* **Efek Feeding:** Setiap kali memberi makan (*Feed*), kebersihan air (*Cleanliness*) berkurang instan **-35%**.
* **Efek Visual Air Keruh:** Elemen `<div id="dirt-overlay">` berwarna cokelat keruh akan meningkat transparansinya (*opacity*) saat kebersihan menurun.
* **Auto-Regen:** Air pulih dan jernih kembali secara otomatis bertahap (+1% Cleanliness setiap 10 menit).

### F. Waktu Jakarta (UTC+7) & BGM Autoplay
* **Latar Waktu Jakarta:** Background akuarium menyesuaikan jam WIB (Pagi 05:00-10:59, Siang 11:00-14:59, Sore 15:00-18:29, Malam 18:30-04:59).
* **BGM Autoplay:** Musik latar langsung terputar otomatis begitu pemain mengeklik tombol **[ Start ]** atau **[ Continue ]** di halaman Welcome.

---

## 3. Integrasi Firebase & Skema Data

### A. Firebase Authentication
* Login / Register sederhana menggunakan Username dan Password.
* Pembedaan akun menggunakan `role: "user"` dan `role: "admin"`.

### B. Firestore Collections
1. **`users/{uid}`**:
   ```json
   {
     "username": "Ananda",
     "role": "user",
     "fishList": [
       { "id": "clownfish", "name": "Clownfish", "rarity": "Common" },
       { "id": "cupang_glow", "name": "Ikan Cupang Glow", "rarity": "Special" }
     ],
     "hunger": 80,
     "cleanliness": 70,
     "foodStock": 10,
     "claimedCodes": ["M3Y"],
     "createdAt": 1727500000000,
     "lastOnline": 1727500000000
   }
   ```
2. **`stats/global`**:
   ```json
   {
     "visitorCount": 1250
   }
   ```

---

## 4. Web Admin Dashboard & Anti AI-Slop Design Spec

Halaman Admin dibuat terpisah (`admin.html`) dan difokuskan khusus untuk pemantauan serta pengelolaan pemain oleh Admin.

### A. Aturan Akses Admin
* Menggunakan pengecekan peran (*role-based guard*) via Firebase Auth & Firestore.
* Jika akun yang masuk bukan `role: "admin"`, peramban akan langsung memindahkan pengguna kembali ke `index.html`.

### B. Fitur Utama Admin
1. **Daftar Pemain (Usernames Only):** Tampilan tabel sederhana yang hanya mencantumkan nama pengguna (**Username**), tanggal mendaftar, status aktivitas terakhir, dan jumlah ikan yang dimiliki.
2. **Visitor Counter:** Angka total berapa kali web telah dikunjungi secara global.
3. **Fitur Gift Fish (`[🎁 Gift]` Button):** Tombol di setiap baris pemain untuk mengirimkan ikan secara langsung. Admin memilih jenis ikan dari menu gantung (*dropdown*), lalu ikan tersebut otomatis ditambahkan ke `fishList` akun target secara *real-time*.

---

### C. Panduan Desain Anti AI-Slop untuk Admin Panel

#### 1. Tata Letak (Layout Structure)
Layout menggunakan **Top Bar + Single Panel Dashboard** (tanpa *sidebar* berumpuk atau *dashboard cards* berwarna-warni).

```text
+-------------------------------------------------------------------------+
| [LOGO] Cozy Aquarium — Admin Panel                 [Admin] [Logout]     |
+-------------------------------------------------------------------------+
| STATISTIK UTAMA                                                         |
| [ Total Kunjungan Web: 1,250 ]          [ Total Pemain Terdaftar: 42 ]  |
+-------------------------------------------------------------------------+
| DAFTAR PEMAIN (USERNAMES)                                [ Cari User ]  |
| +---------------------------------------------------------------------+ |
| | Username     | Tanggal Daftar | Terakhir Aktif | Ikan | Aksi        | |
| |--------------|----------------|----------------|------|-------------| |
| | ananda_h     | 27 Sept 2026   | 5 menit lalu   | 2    | [🎁 Gift]   | |
| | budi_santoso | 28 Sept 2026   | 1 jam lalu     | 1    | [🎁 Gift]   | |
| +---------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

#### 2. Skema Warna Admin (Clean & Warm Professional)
```css
:root {
  --bg-admin: #F6F1E7;       /* Krem Hangat */
  --card-bg: #FFFFFF;        /* Putih */
  --border: #E2DED5;         /* Garis Pembatas Halus */
  --text-main: #332D27;      /* Cokelat Gelap Utama */
  --text-muted: #7A7268;     /* Teks Sekunder */
  --primary: #6FAEAA;        /* Hijau Kebiruan Air */
  --primary-hover: #5A8F8B;
  --accent: #E9C46A;         /* Kuning Hangat */
  --danger: #D97770;         /* Merah Lembut */
}
```

#### 3. Komponen Modal Gift Fish
Saat tombol `[🎁 Gift]` pada baris pengguna diklik, muncul modal ringkas:
* **Target:** Username terkunci (*read-only*).
* **Pilih Ikan (Dropdown):**
  * Clownfish
  * Blue Tang
  * Goldfish
  * Betta
  * Guppy
  * Ikan Cupang Glow
  * Ikan Arwana
* **Tombol:** `[ Batal ]` & `[ Kirim Ikan Ke Pemain ]`.

---

## 5. Definition of Done (DOD)

Proyek ini dianggap selesai jika:
1. Pemain dapat mendaftar/login menggunakan akun Firebase.
2. Pemain baru mendapatkan 1 ikan pertama melalui gacha.
3. Fitur multi-ikan berjalan mulus (ikan berenang bersama di satu akuarium).
4. Panel indikator, stok makanan, dan outfit dapat dibuka-tutup dengan tombol Toggle.
5. Mengetik kode redeem `M3Y` atau `B41M` di menu Settings berhasil menambah ikan terkait.
6. Air akuarium berubah cokelat saat diberi makan dan jernih kembali secara otomatis.
7. Background akuarium berganti sesuai jam WIB (Jakarta).
8. Halaman `admin.html` aman dari akses non-admin, menampilkan total kunjungan web, memuat daftar username pemain, dan fungsi tombol Gift dapat mengirimkan ikan ke pemain secara *real-time*.