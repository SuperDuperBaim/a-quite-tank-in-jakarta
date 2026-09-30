# Design Specification: A Quiet Tank In Jakarta

Dokumen ini berisi spesifikasi visual dan panduan desain UI berdasarkan gaya ilustrasi watercolor/Ghibli-inspired *aquascape*.

---

## 1. Tipografi (Typography)

Teks "MULAI" pada gambar menggunakan gaya font *rounded hand-drawn / display font* dengan tekstur lembut untuk menyatu dengan estetika *watercolor*.

* **Font Family Suggestions:**
  * **Google Fonts (Gratis):** 
    * `Fredoka` (SemiBold / Bold)
    * `Sniglet`
    * `Mali` (Bold)
    * `Quicksand` (Bold)
  * **Karakter Font:** *Rounded edges*, *friendly*, *playful*, sedikit gaya komik/buku cerita anak.

* **Spesifikasi Teks "MULAI":**
  * **Text Transform:** UPPERCASE
  * **Letter Spacing:** `0.05em` hingga `0.1em` (agak renggang)
  * **Font Weight:** Bold / Extra Bold (700-800)

---

## 2. Skema Warna (Color Palette)

Warna teks menggunakan kombinasi gradasi hangat natural dengan *outline* bernuansa kayu/tanah agar memiliki kontras tinggi terhadap latar akuarium yang dominan hijau-biru.

### Teks "MULAI"
| Elemen | Warna / Code | Deskripsi |
| :--- | :--- | :--- |
| **Fill / Isian Utama** | `#FFF5D6` hingga `#FFE3A8` | Creamy warm yellow / Off-white dengan gradasi lembut |
| **Inner Glow / Shadow** | `#E5B869` | Warm Ochre / Muted Gold |
| **Stroke / Outline** | `#5A3A22` | Dark Earth Brown (ketebalan 3px - 5px) |
| **Drop Shadow** | `rgba(0, 0, 0, 0.25)` | Soft shadow bawah untuk efek kedalaman |

### Tombol Kayu (Wooden Banner Base)
| Elemen | Warna / Code | Deskripsi |
| :--- | :--- | :--- |
| **Base Wood Light** | `#B89368` | Natural Wood Light |
| **Base Wood Dark** | `#6E4D2B` | Aged Bark Brown |
| **Moss & Leaves Accent** | `#88A755` & `#4D7C38` | Sage & Forest Green |
| **Flower Highlights** | `#FFA384` | Soft Coral Pink |

---

## 3. Gaya Visual & Komponen UI (Button Specs)

* **Bentuk Tombol:**
  * Papan kayu alami (*rustic wooden plank*) dengan pinggiran tidak simetris (organik).
  * Dihiasi tanaman merambat (*vines*), lumut akuatik (*moss*), dan bunga kecil khas gaya Studio Ghibli.
* **Efek Pencahayaan:**
  * *Sunrays / Caustics* dari permukaan air memberikan efek kilauan (*sparkle/glow*) di sekitar area tengah tombol.
* **Saran Implementasi CSS (Untuk Web / App):**

```css
.btn-ghibli {
  font-family: 'Fredoka', cursive, sans-serif;
  font-weight: 700;
  font-size: 28px;
  color: #FFF5D6;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: url('path-to-wooden-button-bg.png') no-repeat center center;
  background-size: contain;
  padding: 16px 48px;
  border: none;
  text-shadow: 2px 2px 0px #5A3A22, -1px -1px 0px #5A3A22, 1px -1px 0px #5A3A22, -1px 1px 0px #5A3A22;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.btn-ghibli:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}
```