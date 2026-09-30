# DESIGN.md — A Quiet Tank

**Project:** A Quiet Tank  
**Visual Direction:** Cozy 2D Aquarium  
**Date:** 27 September 2026

---

## 1. Design Goal

Game harus terasa seperti tempat kecil yang nyaman untuk dikunjungi.

Bukan game yang penuh tombol.

Bukan dashboard.

Bukan UI aplikasi.

Pemain harus melihat aquarium terlebih dahulu, kemudian UI.

### Design principle

> The aquarium is the interface.

UI hanya membantu pemain memahami dan merawat ikan.

---

## 2. Visual Mood

Gunakan visual dengan karakter:

- Warm
- Soft
- Calm
- Cozy
- Pastel
- Natural
- Slightly nostalgic
- Hand-painted feeling

Referensi hanya untuk suasana dan color mood, bukan menyalin artwork dari film atau studio tertentu.

Hindari:

- Neon.
- Saturasi ekstrem.
- Gradient berlebihan.
- Glassmorphism.
- Cyberpunk.
- UI futuristik.
- 3D realistic aquarium.
- Efek glow berlebihan.

---

## 3. Color Direction

Palet utama:

### Background

Warm cream / off-white.

Contoh:

```text
#F6F1E7
```

### Aquarium Water

Soft blue-green.

Contoh:

```text
#A9D8D2
```

### Deep Water

Muted teal.

Contoh:

```text
#6FAEAA
```

### Plant

Muted green.

Contoh:

```text
#789B72
```

### Accent

Warm yellow.

Contoh:

```text
#E9C46A
```

### Text

Soft dark brown.

Contoh:

```text
#4A4036
```

Warna tidak harus mengikuti hex secara kaku. Yang penting keseluruhan terasa lembut dan tidak terlalu terang.

---

## 4. Typography

Gunakan font yang:

- Rounded.
- Friendly.
- Mudah dibaca.
- Tidak terlalu playful.

Judul:

- Sedikit lebih besar.
- Rounded.
- Tidak terlalu bold.

Body:

- Simple.
- Bersih.
- Nyaman dibaca.

Hindari:

- Font horror.
- Font pixel ekstrem untuk semua teks.
- Font dekoratif yang sulit dibaca.
- Terlalu banyak jenis font.

Maksimal 2 font family.

---

## 5. Layout

Gunakan satu layout utama.

```text
┌───────────────────────────────┐
│        COZY AQUARIUM          │
│                               │
│      ┌─────────────────┐      │
│      │                 │      │
│      │     🐟          │      │
│      │        🌿       │      │
│      │   🪨            │      │
│      │                 │      │
│      └─────────────────┘      │
│                               │
│  Hunger      ███████░░        │
│  Clean       ████████░        │
│                               │
│       [ Feed ] [ Clean ]      │
└───────────────────────────────┘
```

Aquarium harus mengambil sebagian besar area layar.

---

## 6. Aquarium Visual

Aquarium harus terlihat seperti ilustrasi 2D.

Layer visual:

1. Background.
2. Water.
3. Back plants.
4. Rocks.
5. Fish.
6. Bubbles.
7. Front plants.
8. Subtle water effects.

Jangan menggunakan terlalu banyak dekorasi.

Negative space penting.

---

## 7. Fish Design

Ikan adalah karakter utama.

Untuk MVP tersedia 5 desain:

- Clownfish.
- Blue Tang.
- Goldfish.
- Betta.
- Guppy.

Setiap ikan harus memiliki siluet yang mudah dibedakan.

Tidak perlu detail tinggi.

Lebih baik:

- Siluet jelas.
- Warna menarik.
- Animasi sederhana.

Daripada:

- Detail texture yang berat.
- Sprite besar.
- Animasi kompleks.

---

## 8. Fish Animation

Animasi ikan:

### Idle

Ikan bergerak pelan.

### Swimming

Ikan bergerak horizontal.

### Direction Change

Saat ikan berbalik:

- Flip horizontal.
- Jangan teleport.

### Vertical Movement

Tambahkan sedikit gerakan naik-turun.

Gerakan harus lambat.

Tujuannya membuat aquarium terasa hidup, bukan arcade.

---

## 9. UI Style

UI harus minimal.

Gunakan:

- Rounded corners.
- Soft shadow.
- Thin border.
- Banyak ruang kosong.

Button:

```text
[ Feed ]
[ Clean ]
```

Button jangan terlalu besar.

Hover:

- Sedikit naik.
- Shadow sedikit bertambah.

Click:

- Sedikit scale down.
- Feedback cepat.

Hindari:

- Button dengan gradient.
- Glow.
- 3D button.
- Excessive animation.

---

## 10. Status Bar

Hunger dan cleanliness menggunakan progress bar sederhana.

Contoh:

```text
Hunger
████████░░  80%

Cleanliness
█████████░  90%
```

Gunakan label teks agar mudah dipahami.

Jangan menggunakan ikon sebagai satu-satunya penjelasan.

---

## 11. Gacha Screen

Gacha screen tetap menggunakan visual yang sama.

Jangan membuatnya seperti casino/gacha game modern.

Layout:

```text
        Your First Fish

          ┌───────┐
          │       │
          │  🐟   │
          │       │
          └───────┘

       [ Discover Fish ]
```

Saat mendapatkan ikan:

- Fade in.
- Sedikit scale animation.
- Nama ikan muncul.
- Rarity muncul kecil.

Tidak perlu:

- Flashing lights.
- Confetti berlebihan.
- Spin wheel kompleks.
- Loot-box UI.
- Dramatic screen shake.

---

## 12. Welcome Screen

Simple.

```text
       COZY AQUARIUM

   A little place for your fish.

        [ Your Name ]

          [ Start ]
```

Tidak perlu banyak menu.

Jika pemain sudah memiliki save:

```text
       Welcome back, Ananda.

        [ Continue ]
```

---

## 13. Motion

Motion harus lambat dan natural.

Gunakan:

- Fade.
- Float.
- Gentle movement.
- Small scale.

Hindari:

- Shake berlebihan.
- Fast transition.
- Banyak object bergerak sekaligus.

Target feeling:

> pelan, hangat, santai.

---

## 14. Responsive Design

### Desktop

Aquarium berada di tengah.

UI berada di sekitar aquarium.

### Mobile

Aquarium memenuhi area utama.

Status dan tombol berada di bawah aquarium.

Jangan membuat user harus zoom.

Touch target minimal nyaman untuk disentuh.

---

## 15. Asset Rules

Asset harus:

- Ringan.
- 2D.
- Konsisten style.
- Tidak terlalu besar.

Jika belum ada asset final:

Gunakan placeholder sederhana.

Jangan menghabiskan waktu membuat asset kompleks sebelum gameplay selesai.

---

## 16. Anti AI-Slop Rules

Ini adalah aturan penting.

Jangan:

- Menambahkan fitur yang tidak ada di PRD.
- Membuat dashboard penuh.
- Menambahkan 10+ tombol.
- Menggunakan gradient pada hampir semua elemen.
- Menggunakan glassmorphism.
- Menggunakan neon.
- Menambahkan badge di mana-mana.
- Membuat UI terlalu kompleks.
- Menambahkan animasi hanya agar terlihat keren.
- Mengubah game menjadi aplikasi management dashboard.

Jika ragu:

**Pilih desain yang lebih sederhana.**

---

## 17. Visual Hierarchy

Urutan perhatian pemain:

1. Fish.
2. Aquarium.
3. Status ikan.
4. Interaction button.
5. Secondary information.

Jangan membuat logo atau tombol lebih menarik daripada ikan.

---

## 18. Accessibility

Pastikan:

- Text mudah dibaca.
- Contrast cukup.
- Button memiliki label jelas.
- Jangan bergantung hanya pada warna untuk status.
- Layout tetap usable di layar kecil.

---

## 19. Performance

Game harus ringan.

Prioritas:

- Vanilla JavaScript.
- CSS animation jika cukup.
- Asset kecil.
- Tidak menggunakan library besar tanpa alasan.
- Tidak menjalankan animation loop berat.

Jangan menggunakan canvas/game engine untuk sesuatu yang bisa dilakukan dengan HTML/CSS sederhana pada MVP.

---

## 20. Final Design Rule

Jika hasil implementasi terlihat seperti:

> "website dashboard yang kebetulan punya aquarium"

maka desainnya salah.

Target akhirnya harus terasa seperti:

> "akuarium kecil yang bisa dikunjungi dan dirawat lewat browser."

Simple, cozy, warm, dan hidup.
