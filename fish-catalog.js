/* ========================================
   A QUIET TANK — fish-catalog.js
   Katalog Ikan Dinamis + 5 Tingkatan Rarity.
   Dipakai bersama oleh script.js (gacha/tank)
   dan admin.js (CRUD + gift). Firestore:
   koleksi `fish_catalog`, dokumen berisi
   fishId, name, rarity, imagePath, description,
   createdAt (+ scale opsional untuk renderer).
   ======================================== */

export const RARITIES = ['Common', 'Rare', 'Epic', 'Legendary', 'Heaven'];

// Bobot gacha per rarity (persen): 50 / 30 / 13 / 6 / 1.
export const RARITY_WEIGHTS = {
  Common: 50,
  Rare: 30,
  Epic: 13,
  Legendary: 6,
  Heaven: 1,
};

export const RARITY_COLORS = {
  Common: '#536270',
  Rare: '#0284C7',
  Epic: '#9333EA',
  Legendary: '#EA580C',
  Heaven: '#D97706',
  // Warna legacy (save lama): Uncommon -> Rare, Special -> Legendary.
  Uncommon: '#0284C7',
  Special: '#EA580C',
};

export const CATALOG_COLLECTION = 'fish_catalog';

/* ---------- DAFTAR GAMBAR IKAN (assets/fish/) ----------
   Dipakai admin.js untuk mengisi dropdown "Gambar" + preview.
   Versi `_tight` (sprite) diutamakan di urutan atas. */
export const FISH_IMAGE_PATHS = [
  'assets/fish/1-common/manfish (common)_tight.png',
  'assets/fish/2-rare/koki (rare)_tight.png',
  'assets/fish/3-legend/arwarna (legend)_tight.png',
  'assets/fish/1-common/Neon Tetra (common).png',
  'assets/fish/1-common/corydoras (common).png',
  'assets/fish/2-rare/koki (rare).png',
  'assets/fish/4-heaven/cupang glow (heaven).png',
];

export const fishImageLabel = (path) => String(path || '').replace(/^.*\//, '');

/* ---------- KATALOG DEFAULT (fallback lokal) ----------
   Dipakai saat Firestore kosong / offline agar gacha
   tetap playable. Rarity mengikuti nama file aset:
   "cupang glow (heaven)" -> Heaven,
   "arwarna (legend)" -> Legendary. */
export const DEFAULT_CATALOG = [
  { id: 'clownfish',   fishId: 'clownfish',   name: 'Clownfish',        rarity: 'Common',    scale: 1,   imagePath: 'assets/fish/1-common/Neon Tetra (common).png',   description: 'Ikan kecil yang ramah dan aktif.' },
  { id: 'blue_tang',   fishId: 'blue_tang',   name: 'Blue Tang',        rarity: 'Common',    scale: 1,   imagePath: 'assets/fish/1-common/manfish (common)_tight.png', description: 'Ikan biru yang tenang.' },
  { id: 'goldfish',    fishId: 'goldfish',    name: 'Goldfish',         rarity: 'Rare',      scale: 1,   imagePath: 'assets/fish/2-rare/koki (rare)_tight.png',        description: 'Ikan mas hias yang anggun.' },
  { id: 'betta',       fishId: 'betta',       name: 'Betta',            rarity: 'Rare',      scale: 1,   imagePath: 'assets/fish/1-common/corydoras (common).png',     description: 'Petarung kecil yang pemberani.' },
  { id: 'guppy',       fishId: 'guppy',       name: 'Guppy',            rarity: 'Common',    scale: 1,   imagePath: 'assets/fish/1-common/Neon Tetra (common).png',   description: 'Ikan mungil yang lincah.' },
  { id: 'arwana',      fishId: 'arwana',      name: 'Ikan Arwana',      rarity: 'Legendary', scale: 2.3, imagePath: 'assets/fish/3-legend/arwarna (legend)_tight.png', description: 'Legendaris, gagah dan memukau.' },
  { id: 'cupang_glow', fishId: 'cupang_glow', name: 'Ikan Cupang Glow', rarity: 'Heaven',    scale: 1,   imagePath: 'assets/fish/4-heaven/cupang glow (heaven).png',  description: 'Surgawi, memancarkan aura keemasan.' },
];

export function isValidRarity(r) {
  return RARITIES.includes(r);
}

/* Normalisasi dokumen Firestore -> entri siap render.
   Bentuk renderer: { id, fishId, name, rarity, src,
   originalSrc, imagePath, description, scale }. */
export function normalizeCatalogDoc(data) {
  const fishId = String(data?.fishId || data?.id || '').trim();
  const imagePath = String(data?.imagePath || data?.src || '').trim();
  const scale = Number(data?.scale);
  return {
    id: fishId,
    fishId,
    name: String(data?.name || fishId || 'Unknown Fish'),
    rarity: isValidRarity(data?.rarity) ? data.rarity : 'Common',
    src: imagePath,
    originalSrc: imagePath,
    imagePath,
    description: String(data?.description || ''),
    scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
  };
}

export function normalizeCatalogList(docs) {
  return (docs || [])
    .map(normalizeCatalogDoc)
    .filter((f) => f.id && f.src);
}

/* ---------- ROLL RARITY BERBOBOT ----------
   Hanya tier yang punya ikan yang ikut diundi;
   bobot tier kosong didistribusikan ulang otomatis. */
export function rollRarity(catalog) {
  const counts = {};
  (catalog || []).forEach((f) => {
    if (isValidRarity(f.rarity)) counts[f.rarity] = (counts[f.rarity] || 0) + 1;
  });
  const tiers = RARITIES.filter((r) => counts[r] > 0);
  if (!tiers.length) return null;
  const total = tiers.reduce((s, r) => s + (RARITY_WEIGHTS[r] || 0), 0);
  let rand = Math.random() * total;
  for (const r of tiers) {
    rand -= (RARITY_WEIGHTS[r] || 0);
    if (rand <= 0) return r;
  }
  return tiers[tiers.length - 1];
}

/* Undi 1 ikan dari katalog sesuai bobot rarity. */
export function rollFishFromCatalog(catalog) {
  const list = (catalog || []).filter((f) => f.id && f.src);
  if (!list.length) return null;
  const rarity = rollRarity(list);
  const pool = rarity ? list.filter((f) => f.rarity === rarity) : list;
  const finalPool = pool.length ? pool : list;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

/* Langganan realtime koleksi fish_catalog.
   cb(list) dipanggil dengan daftar ternormalisasi
   (kosong jika koleksi belum ada isinya). */
export function subscribeCatalog(fb, cb) {
  if (!fb) return () => {};
  try {
    return fb.onSnapshot(
      fb.collection(fb.db, CATALOG_COLLECTION),
      (qs) => {
        const docs = [];
        qs.forEach((d) => docs.push({ id: d.id, ...d.data() }));
        cb(normalizeCatalogList(docs));
      },
      () => cb([]),
    );
  } catch {
    return () => {};
  }
}
