# PRD — A Quiet Tank

**Project:** A Quiet Tank  
**Type:** 2D Cozy Web Game  
**Platform:** Web Browser  
**Technology:** HTML, CSS, JavaScript  
**Author:** Ananda Ibrahim  
**Date:** 27 September 2026  
**Development Style:** Vibe Coding

---

## 1. Overview

A Quiet Tank adalah game web 2D sederhana tentang mendapatkan satu ikan melalui sistem gacha lalu merawat ikan tersebut di dalam akuarium.

Game dibuat dengan scope kecil agar ringan, mudah dikembangkan dengan vibe coding, dan tidak membutuhkan backend pada versi awal.

Fokus utama:

- Mendapatkan ikan.
- Merawat ikan.
- Melihat ikan hidup dan bergerak di akuarium.
- Menyimpan progress pemain secara lokal.
- Memberikan pengalaman cozy dan santai.

---

## 2. Core Gameplay

Alur utama pemain:

1. Pemain membuka website.
2. Pemain memasukkan username.
3. Jika pemain baru, pemain masuk ke halaman gacha.
4. Pemain melakukan gacha dan mendapatkan satu ikan.
5. Ikan tersebut menjadi ikan utama milik pemain.
6. Pemain masuk ke halaman akuarium.
7. Pemain merawat ikan dengan memberi makan dan menjaga kebersihan air.
8. Progress otomatis tersimpan.
9. Saat website dibuka kembali, pemain melanjutkan progress sebelumnya.

---

## 3. Target MVP

Versi pertama hanya perlu memiliki:

### Halaman

- Welcome / Login
- Gacha
- Aquarium

### Sistem

- Username lokal.
- Gacha ikan.
- Koleksi ikan sederhana.
- Ikan bergerak secara otomatis.
- Tombol Feed.
- Status hunger sederhana.
- Status cleanliness sederhana.
- LocalStorage untuk menyimpan progress.

Tidak diperlukan akun online pada MVP.

---

## 4. Login / Identitas Pemain

Pada halaman awal terdapat:

- Judul game.
- Input username.
- Tombol `Start`.

Jika username belum tersimpan:

- Simpan username ke LocalStorage.
- Buat data pemain baru.
- Arahkan ke halaman gacha.

Jika username sudah tersimpan:

- Lewati gacha.
- Langsung membuka aquarium.

Tujuan login pada MVP hanya untuk mengenali save data pemain, bukan authentication sungguhan.

---

## 5. Sistem Gacha

Pemain baru mendapatkan kesempatan gacha pertama.

Contoh pool ikan:

1. Clownfish
2. Blue Tang
3. Goldfish
4. Betta
5. Guppy

Setiap ikan mempunyai:

- ID.
- Nama.
- Sprite / visual.
- Deskripsi pendek.
- Rarity sederhana.

Contoh rarity:

- Common
- Uncommon
- Rare

Untuk MVP, rarity hanya bersifat visual/informasi dan tidak perlu sistem ekonomi atau monetisasi.

### Gacha Result

Setelah tombol gacha ditekan:

1. Animasi sederhana.
2. Sistem memilih satu ikan secara random.
3. Ikan ditampilkan dengan nama.
4. Pemain menekan `Keep Fish`.
5. Ikan disimpan ke data pemain.
6. Pemain masuk ke aquarium.

---

## 6. Aquarium

Aquarium adalah halaman utama game.

Elemen utama:

- Background aquarium.
- Air.
- Tanaman air.
- Batu/dekorasi sederhana.
- Ikan pemain.
- Bubble sederhana.
- UI status.
- Tombol Feed.
- Tombol Clean.

Ikan bergerak perlahan secara otomatis.

Gerakan tidak perlu menggunakan physics kompleks.

Ikan cukup:

- Bergerak kiri/kanan.
- Sesekali mengubah arah.
- Bergerak sedikit naik/turun.
- Memiliki animasi idle sederhana.

---

## 7. Sistem Perawatan

### Hunger

Ikan memiliki nilai hunger.

Contoh:

`100 = kenyang`

Seiring waktu:

`100 → 0`

Jika pemain menekan `Feed`:

- Hunger bertambah.
- Tombol memiliki cooldown singkat.
- Tidak boleh spam tanpa batas.

### Cleanliness

Akuarium memiliki nilai cleanliness.

Contoh:

`100 = sangat bersih`

Seiring waktu:

`100 → 0`

Jika pemain menekan `Clean`:

- Cleanliness meningkat.
- Ada animasi feedback sederhana.

Untuk MVP, kedua sistem cukup menggunakan angka dan visual bar.

Tidak perlu:

- Penyakit.
- Kematian permanen.
- Obat.
- Sistem breeding.
- Genetik.

Game harus terasa santai, bukan menghukum pemain.

---

## 8. Progress Saving

Gunakan browser `localStorage`.

Data minimal:

```js
{
  username: "Ananda",
  fish: {
    id: "clownfish",
    name: "Clownfish",
    rarity: "Common"
  },
  hunger: 80,
  cleanliness: 90,
  createdAt: "...",
  lastPlayed: "..."
}
```

Saat website dibuka kembali:

- Baca data LocalStorage.
- Jika data ditemukan, lanjutkan permainan.
- Jika tidak ditemukan, tampilkan halaman awal.

Tidak perlu database untuk MVP.

---

## 9. Visual Direction

Visual harus memiliki nuansa:

- Cozy.
- Warm.
- Soft.
- Hand-painted feel.
- Pastel.
- Natural.
- Nostalgic.
- Calm.

Referensi suasana boleh terinspirasi oleh nuansa film animasi Jepang yang hangat dan natural, tetapi jangan menyalin karakter, artwork, atau aset dari karya tertentu.

Prioritas visual:

**Cozy > Detail > Complexity**

Game harus tetap sederhana.

---

## 10. Audio

Audio tidak wajib pada MVP.

Jika ditambahkan:

- Ambient aquarium.
- Air bubbles.
- Soft click.
- Feed sound.
- Clean sound.

Tidak perlu music system kompleks.

---

## 11. Technical Structure

Struktur awal:

```text
cozy-aquarium/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── fish/
    ├── aquarium/
    └── ui/
```

Gunakan vanilla:

- HTML
- CSS
- JavaScript

Jangan menggunakan framework pada MVP.

---

## 12. Responsive Design

Game harus bisa dimainkan pada:

- Desktop.
- Laptop.
- Mobile browser.

Layout aquarium harus tetap menjadi fokus utama.

Pada mobile:

- Aquarium tetap terlihat besar.
- Kontrol mudah disentuh.
- Tidak terlalu banyak UI.

---

## 13. MVP UI Flow

```text
WELCOME
   |
   v
USERNAME
   |
   +---- New Player ----> GACHA
   |                       |
   |                       v
   |                  GET FISH
   |                       |
   |                       v
   +---- Existing ------ AQUARIUM
                           |
                           v
                    FEED / CLEAN
                           |
                           v
                       SAVE DATA
```

---

## 14. Out of Scope

Jangan membuat fitur berikut pada MVP:

- Multiplayer.
- Online account.
- Backend.
- Database.
- Payment.
- Ads.
- Chat.
- Trading.
- Breeding.
- Fishing.
- Quest system.
- Complex inventory.
- Pet death.
- Multiple aquarium rooms.
- Complex shop.
- Procedural world.
- Admin dashboard.

Fitur tersebut hanya boleh dipertimbangkan setelah MVP terasa playable.

---

## 15. Definition of Done

MVP dianggap selesai jika:

- Pemain dapat memasukkan username.
- Pemain baru dapat melakukan gacha.
- Pemain mendapatkan satu ikan random.
- Ikan tampil di aquarium.
- Ikan dapat bergerak.
- Pemain dapat memberi makan.
- Pemain dapat membersihkan aquarium.
- Hunger dan cleanliness berubah.
- Progress tersimpan di LocalStorage.
- Saat website dibuka kembali, progress tidak hilang.
- Tampilan responsive.
- Tidak ada framework yang tidak diperlukan.
- Tidak ada fitur tambahan yang memperbesar scope tanpa alasan.

---

## 16. Prinsip Development

**Keep it small.**

Jika sebuah fitur tidak diperlukan agar core gameplay terasa menyenangkan, jangan masukkan ke MVP.

Prioritas:

1. Gameplay berjalan.
2. Save data bekerja.
3. Visual cozy.
4. Interaksi terasa menyenangkan.
5. Baru menambah fitur.

Jangan membuat architecture berlebihan untuk game kecil ini.
