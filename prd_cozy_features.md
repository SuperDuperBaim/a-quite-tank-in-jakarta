# PRD_COZY_FEATURES.md — Fitur Interaksi, Atmosfer & Kenangan

**Nama Game:** A Quite Tank In Jakarta  
**Versi Dokumen:** 1.0 (Fitur Cozy Retention)  
**Platform:** Web Browser (Responsive Mobile & Desktop)  
**Target File:** `script.js`, `index.html`, `style.css`, `locales.js`  

---

## 1. Overview & Aturan Anti AI-Slop

Dokumen ini mengatur penambahan 4 fitur utama yang dirancang untuk meningkatkan keterikatan emosional pemain tanpa menambah kerumitan antarmuka (*clean UI*):

1. **Sifat Ikan & Reaksi Ketuk (*Fish Personality & Tap Interaction*)**
2. **Efek Cuaca Real-Time Jakarta & Ambient Sound**
3. **Mode Kamera Polaroid (*Aesthetic Photo Mode*)**
4. **Buku Catatan Ikan & Nama Panggilan (*Fish Journal & Nicknames*)**

---

## 2. Spesifikasi Fitur Detail

### A. Sifat Ikan & Reaksi Ketuk (*Fish Personality & Tap Interaction*)

#### 1. Sifat Ikan (Traits)
Setiap ikan yang didapatkan (via Gacha, Redeem Code, atau Gift Admin) secara otomatis diberikan 1 *trait* acak saat dibuat:
* **Lincah (*Playful*):** Berenang sedikit lebih cepat dan sering mendekati permukaan.
* **Penakut (*Skittish*):** Cenderung berenang di bagian bawah/tengah akuarium.
* **Tukang Tidur (*Sleepy*):** Sering berhenti berenang sejenak (*idle*).
* **Tukang Makan (*Glutton*):** Bergerak cepat saat pakan dilemparkan ke air.

#### 2. Reaksi Ketuk (Tap Mechanics)
* **Ketuk Langsung pada Ikan:**
  * Ikan mengepakkan sirip lincah, memutar badan, dan memunculkan gelembung partikel berbentuk hati/bintang kecil (`<div class="bubble-heart">`).
* **Ketuk Kaca Akuarium (Area Kosong):**
  * Terjadi efek riak air (*water ripple*) di titik ketukan.
  * Ikan bermata *Lincah* akan berenang menuju lokasi ketukan.
  * Ikan bermata *Penakut* akan terkejut (*quick dash*) dan berenang menjauh.

---

### B. Efek Cuaca Real-Time Jakarta & Ambient Sound

#### 1. Integrasi Cuaca Jakarta
* Sistem melakukan *fetch* status cuaca Jakarta (menggunakan API Cuaca publik gratis seperti OpenWeatherMap atau simulasi kondisikan berdasarkan jam/musim).
* **Efek Hujan/Gerimis (Rain Effect):**
  * Terdapat *overlay* halus tetesan air hujan yang menempel pada luar kaca akuarium (`#rain-glass-overlay`).
  * Pencahayaan latar akuarium sedikit diredupkan (skema warna *cozy rainy afternoon*).

#### 2. Audio Latar Ambient (Toggleable)
* Di menu Settings, terdapat kontrol tambahan **"Suara Ambient"** (On/Off).
* Saat hujan di Jakarta, game memutar audio latar hujan tipis dan gemericik air akuarium yang menenangkan (*ASMR water & rain*).

---

### C. Mode Kamera Polaroid (*Aesthetic Photo Mode*)

#### 1. Akses UI
* Ditempatkan sebagai tombol ikon kamera kecil **`[ 📷 Snap ]`** pada Floating/Drawer Menu.

#### 2. Alur Kerja Kamera
1. Saat tombol diklik, seluruh antarmuka/UI (tombol toggle, bar indikator, settings) disembunyikan seketika (*Clean Canvas View*).
2. Latar akuarium dan seluruh ikan dibingkai secara otomatis dengan **Frame Polaroid Vintage**.
3. Di bagian bawah frame Polaroid, tercantum teks elegan:
   `A Quite Tank In Jakarta — [Tanggal & Jam WIB]`
4. Muncul 2 tombol melayang ringkas:
   * **`[ 💾 Simpan Gambar ]`** (Mengunduh file `.png` hasil tangkapan layar).
   * **`[ ✖ Kembali ]`** (Menutup mode foto dan mengembalikan UI seperti semula).

---

### D. Buku Catatan Ikan & Nama Panggilan (*Fish Journal & Custom Nicknames*)

#### 1. Antarmuka Journal (`Fish Journal Modal`)
* Dapat diakses dari drawer menu. Menampilkan daftar kartu ringkas untuk seluruh ikan yang dimiliki di `fishList`.
* Setiap kartu berisi:
  * Ilustrasi/sprite ikan.
  * Jenis & Rarity ikan.
  * **Nama Panggilan (*Nickname*):** Dapat diubah langsung oleh pemain (default: sama dengan jenis ikan).
  * Sifat Ikan (*Trait*).
  * Tanggal Didapatkan (*Acquired Date* dalam format WIB).

#### 2. Interaksi Nickname
* Pemain dapat mengetuk ikon pensil di samping nama ikan untuk mengganti nama panggilan (misal: Ikan Arwana diberi nama *"Baim"*).
* Nama panggilan ini akan muncul di atas kepala ikan ketika ikan diketuk di dalam akuarium.

---

## 3. Pembaruan Skema Data Firestore (`users/{uid}`)

Struktur data array `fishList` pada Firestore diperbarui untuk menyimpan informasi sifat dan nama panggilan:

```json
{
  "username": "Ananda",
  "role": "user",
  "fishList": [
    {
      "instanceId": "fish_1727500000000_abc",
      "id": "arowana",
      "name": "Ikan Arwana",
      "nickname": "Baim",
      "rarity": "Special",
      "trait": "Lincah",
      "acquiredAt": 1727500000000
    },
    {
      "instanceId": "fish_1727500005000_xyz",
      "id": "cupang_glow",
      "name": "Cupang Glow",
      "nickname": "Glowy",
      "rarity": "Special",
      "trait": "Penakut",
      "acquiredAt": 1727500005000
    }
  ]
}
```

---

## 4. Definition of Done (DOD)

1. Ikan merespons ketukan pemain di kaca akuarium sesuai dengan *trait* masing-masing (*Lincah* mendekat, *Penakut* menjauh).
2. Cuaca Jakarta dapat mendeteksi kondisi/hujan dan menampilkan efek visual tetesan air hujan di kaca akuarium.
3. Tombol Polaroid Snap berhasil menyembunyikan UI, menambahkan bingkai Polaroid bertuliskan tanggal Jakarta, dan mengunduh foto `.png`.
4. Pemain dapat membuka *Fish Journal*, mengubah *nickname* ikan, dan nama tersebut tersimpan secara permanen di Firestore.