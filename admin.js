/* ========================================
   A QUIET TANK — admin.js
   Panel admin (Indonesia saja): daftar pemain,
   Gift Fish (dinamis dari `fish_catalog`),
   CRUD Katalog Ikan Dinamis + 5 rarity.
   ======================================== */
import { getFirebase } from './firebase-config.js';
import {
  RARITIES, DEFAULT_CATALOG, CATALOG_COLLECTION,
  FISH_IMAGE_PATHS, fishImageLabel,
  normalizeCatalogDoc, subscribeCatalog,
} from './fish-catalog.js';

const $ = (id) => document.getElementById(id);
const TRAITS = ['playful', 'skittish', 'sleepy', 'glutton'];

let fb = null;
let players = [];
let giftUid = null;
let giftType = 'fish';
let editingFishId = null;
// ID yang benar-benar ada di Firestore (bukan fallback lokal).
let remoteIds = new Set();
// Katalog runtime: isi fish_catalog, fallback default lokal.
let catalog = DEFAULT_CATALOG.map((f) => ({ ...normalizeCatalogDoc(f) }));
const catalogById = (id) => catalog.find((f) => f.id === id) || null;

function fmtDate(ts) {
  if (!ts) return '–';
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtActive(ts) {
  if (!ts) return '–';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}
function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'gift-toast' + (err ? ' error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), err ? 5000 : 3000);
}

/* ---------- MODAL KONFIRMASI (styled, pengganti window.confirm) ---------- */
let confirmResolve = null;
function confirmAction({ title = 'Yakin?', message = '', okText = 'Ya' } = {}) {
  $('confirm-title').textContent = title;
  $('confirm-msg').textContent = message;
  $('confirm-ok').textContent = okText;
  $('confirm-modal').setAttribute('aria-hidden', 'false');
  return new Promise((resolve) => { confirmResolve = resolve; });
}
function closeConfirm(result) {
  $('confirm-modal').setAttribute('aria-hidden', 'true');
  if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
}
function firestoreErrHint(err) {
  const code = String(err?.code || '');
  if (code.includes('permission-denied')) return ' (akses ditolak — deploy firestore.rules dulu)';
  if (code.includes('unavailable') || code.includes('network')) return ' (jaringan bermasalah)';
  return code ? ` (${code})` : '';
}
function catalogMsg(msg, err = false) {
  const el = $('catalog-msg');
  if (!el) return;
  el.textContent = msg;
  el.hidden = !msg;
  el.style.color = err ? '#D97770' : '#4D8B84';
  clearTimeout(el._t);
  if (msg) el._t = setTimeout(() => { el.hidden = true; }, 3500);
}

/* ---------- DAFTAR PEMAIN ---------- */
function renderTable(filter = '') {
  const tb = $('admin-tbody');
  const q = filter.trim().toLowerCase();
  const rows = players.filter((p) => !q || (p.username || '').toLowerCase().includes(q));
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="6">Tidak ada pemain.</td></tr>'; return; }
  tb.innerHTML = '';
  rows.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="username-cell"></td>' +
      `<td>${fmtDate(p.createdAt)}</td>` +
      `<td>${fmtActive(p.lastOnline)}</td>` +
      `<td class="fish-count">${(p.fishList || []).length}</td>` +
      `<td class="fish-count">🪙 ${typeof p.coins === 'number' ? p.coins : 0}</td>` +
      '<td></td>';
    tr.children[0].textContent = p.username || '(tanpa nama)';
    const btn = document.createElement('button');
    btn.className = 'btn-admin action-btn';
    btn.textContent = '🎁 Gift';
    btn.title = 'Gift ikan / koin';
    btn.addEventListener('click', () => openGift(p.uid, p.username, 'fish'));
    tr.children[5].appendChild(btn);
    tb.appendChild(tr);
  });
}

/* ---------- GIFT (dinamis dari fish_catalog) ---------- */
function renderGiftOptions() {
  const sel = $('gift-fish');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  catalog.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.name} [${f.rarity}]`;
    sel.appendChild(opt);
  });
  if (catalogById(prev)) sel.value = prev;
}

function updateGiftUI() {
  const isCoin = giftType === 'coin';
  const fishWrap = $('gift-fish-wrap');
  const coinWrap = $('gift-coin-wrap');
  const typeSel = $('gift-type');
  const sendBtn = $('gift-send');
  const title = $('gift-title');
  if (fishWrap) fishWrap.hidden = isCoin;
  if (coinWrap) coinWrap.hidden = !isCoin;
  if (typeSel && typeSel.value !== giftType) typeSel.value = giftType;
  if (sendBtn) sendBtn.textContent = isCoin ? 'Kirim Koin Ke Pemain' : 'Kirim Ikan Ke Pemain';
  if (title) title.textContent = isCoin ? '🪙 Gift Coin' : '🎁 Gift Fish';
  if (isCoin && giftUid) {
    const p = players.find((x) => x.uid === giftUid);
    const cur = p && typeof p.coins === 'number' ? p.coins : 0;
    const info = $('gift-current-coins');
    if (info) info.textContent = `Koin ${p?.username || 'pemain'} saat ini: 🪙 ${cur}`;
  }
}

function openGift(uid, username, type = 'fish') {
  giftUid = uid;
  giftType = type === 'coin' ? 'coin' : 'fish';
  renderGiftOptions();
  $('gift-target').value = username;
  updateGiftUI();
  $('gift-modal').setAttribute('aria-hidden', 'false');
}
function closeGift() {
  giftUid = null;
  $('gift-modal').setAttribute('aria-hidden', 'true');
}

async function sendGiftCoin() {
  const amount = Math.floor(Number($('gift-coins')?.value) || 0);
  if (!giftUid) return;
  if (!amount || amount < 1) { toast('Jumlah koin minimal 1.', true); return; }
  if (amount > 9999) { toast('Maksimal 9999 koin sekali kirim.', true); return; }
  try {
    const ref = fb.doc(fb.db, 'users', giftUid);
    if (fb.increment) {
      await fb.updateDoc(ref, { coins: fb.increment(amount) });
    } else {
      const snap = await fb.getDoc(ref);
      const cur = snap.exists() && typeof snap.data().coins === 'number' ? snap.data().coins : 0;
      await fb.updateDoc(ref, { coins: cur + amount });
    }
    const p = players.find((x) => x.uid === giftUid);
    toast(`🪙 ${amount} koin terkirim ke ${p?.username || 'pemain'} (real-time).`);
    closeGift();
  } catch (err) {
    console.warn(err);
    toast(`Gagal mengirim koin${firestoreErrHint(err)}.`, true);
  }
}

async function sendGiftFish() {
  const fishId = $('gift-fish').value;
  const def = catalogById(fishId);
  if (!def) { toast('Ikan tidak ditemukan di katalog.', true); return; }
  const entry = {
    instanceId: `fish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    id: def.id, name: def.name, nickname: def.name, rarity: def.rarity,
    trait: TRAITS[Math.floor(Math.random() * TRAITS.length)], acquiredAt: Date.now(),
  };
  try {
    const ref = fb.doc(fb.db, 'users', giftUid);
    const snap = await fb.getDoc(ref);
    const cur = snap.exists() ? (snap.data().fishList || []) : [];
    if (cur.some((f) => f.id === fishId)) { toast('Pemain sudah punya ikan ini.', true); return; }
    await fb.updateDoc(ref, { fishList: [...cur, entry] });
    toast(`${def.name} terkirim (real-time).`);
    closeGift();
  } catch (err) {
    console.warn(err);
    toast(`Gagal mengirim ikan${firestoreErrHint(err)}.`, true);
  }
}

/* ---------- DROPDOWN GAMBAR + PREVIEW ---------- */
function populateImageOptions(selected = '') {
  const sel = $('cf-image');
  if (!sel) return;
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Pilih gambar —';
  sel.appendChild(placeholder);
  const paths = [...FISH_IMAGE_PATHS];
  // Path lama/kustom yang tak ada di daftar tetap bisa dipilih saat edit.
  if (selected && !paths.includes(selected)) paths.unshift(selected);
  paths.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = fishImageLabel(p) + (FISH_IMAGE_PATHS.includes(p) ? '' : ' (kustom)');
    sel.appendChild(opt);
  });
  sel.value = selected && paths.includes(selected) ? selected : '';
  updateImagePreview();
}

function updateImagePreview() {
  const sel = $('cf-image');
  const img = $('cf-preview');
  if (!sel || !img) return;
  if (!sel.value) { img.removeAttribute('src'); img.hidden = true; return; }
  img.hidden = false;
  img.src = sel.value;
  img.onerror = () => { img.removeAttribute('src'); img.hidden = true; };
}

function updateCatalogSource() {
  const el = $('catalog-source');
  const seedBtn = $('catalog-seed-btn');
  if (el) {
    el.textContent = remoteIds.size
      ? `Sumber: Firestore (${remoteIds.size} jenis ikan aktif)`
      : 'Sumber: default lokal (7 jenis ikan). Mengedit atau menghapus ikan akan otomatis menyimpan data ke Firestore.';
  }
  if (seedBtn) {
    seedBtn.style.display = remoteIds.size ? 'none' : 'inline-block';
  }
}

async function seedDefaultCatalog() {
  if (!fb) { toast('Firebase belum siap.', true); return; }
  const ok = await confirmAction({
    title: 'Simpan Default ke Firestore?',
    message: 'Simpan 7 jenis ikan bawaan ke koleksi Firestore "fish_catalog"? Anda kemudian bisa mengedit, menambah, dan menghapus ikan sesuka hati.',
    okText: 'Ya, Simpan',
  });
  if (!ok) return;
  try {
    const batch = fb.writeBatch ? fb.writeBatch(fb.db) : null;
    for (const f of DEFAULT_CATALOG) {
      const docRef = fb.doc(fb.db, CATALOG_COLLECTION, f.id);
      const data = {
        fishId: f.id,
        name: f.name,
        rarity: f.rarity,
        imagePath: f.imagePath,
        description: f.description || '',
        scale: f.scale || 1,
        createdAt: fb.serverTimestamp(),
      };
      if (batch) batch.set(docRef, data);
      else await fb.setDoc(docRef, data);
    }
    if (batch) await batch.commit();
    toast('Semua ikan default berhasil disimpan ke Firestore.');
  } catch (err) {
    console.warn(err);
    toast(`Gagal menyimpan default${firestoreErrHint(err)}.`, true);
  }
}

/* ---------- KATALOG IKAN DINAMIS ---------- */
function renderCatalog() {
  const tb = $('catalog-tbody');
  if (!tb) return;
  if (!catalog.length) {
    tb.innerHTML = '<tr><td colspan="6">Katalog kosong.</td></tr>';
    return;
  }
  tb.innerHTML = '';
  [...catalog]
    .sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.name.localeCompare(b.name))
    .forEach((f) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="username-cell"></td>' +
        '<td></td>' +
        `<td><span class="rarity-badge rarity-${f.rarity}">${f.rarity}</span></td>` +
        '<td class="fish-count"></td>' +
        '<td></td>';
      tr.children[0].textContent = f.id;
      tr.children[1].textContent = f.name;
      tr.children[3].textContent = f.imagePath;
      tr.children[3].className = 'path-cell';
      const edit = document.createElement('button');
      edit.className = 'btn-admin action-btn';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => startEditFish(f.id));
      const del = document.createElement('button');
      del.className = 'btn-admin btn-admin-secondary action-btn';
      del.textContent = 'Hapus';
      del.addEventListener('click', () => deleteFish(f.id, f.name));
      tr.children[4].append(edit, del);
      tb.appendChild(tr);
    });
}

function slugifyFishId(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

/* Mulai mode edit: isi form dari data katalog. Fish ID dikunci
   karena ia adalah ID dokumen Firestore. */
function startEditFish(fishId) {
  const f = catalogById(fishId);
  if (!f) return;
  editingFishId = f.id;
  $('cf-fishId').value = f.id;
  $('cf-fishId').disabled = true;
  $('cf-name').value = f.name;
  $('cf-rarity').value = f.rarity;
  populateImageOptions(f.imagePath);
  $('cf-scale').value = String(f.scale || 1);
  $('cf-desc').value = f.description || '';
  $('catalog-form-title').textContent = `Edit Ikan: ${f.name}`;
  $('catalog-submit-btn').textContent = 'Simpan Perubahan';
  $('catalog-cancel-btn').hidden = false;
  $('catalog-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  $('cf-name').focus({ preventScroll: true });
}

function cancelEditFish() {
  editingFishId = null;
  $('catalog-form').reset();
  $('cf-scale').value = '1';
  $('cf-fishId').disabled = false;
  populateImageOptions();
  $('catalog-form-title').textContent = 'Tambah Ikan Baru';
  $('catalog-submit-btn').textContent = 'Simpan ke Katalog';
  $('catalog-cancel-btn').hidden = true;
}

async function handleCatalogSubmit(e) {
  e.preventDefault();
  if (!fb) { catalogMsg('Firebase belum siap.', true); return; }
  const fishId = editingFishId || slugifyFishId($('cf-fishId').value);
  const name = $('cf-name').value.trim();
  const rarity = $('cf-rarity').value;
  const imagePath = $('cf-image').value.trim();
  const description = $('cf-desc').value.trim();
  const scale = Number($('cf-scale').value) || 1;
  if (!fishId) { catalogMsg('Isi Fish ID (huruf kecil, angka, underscore).', true); return; }
  if (!name) { catalogMsg('Isi nama ikan.', true); return; }
  if (!RARITIES.includes(rarity)) { catalogMsg('Pilih rarity yang valid.', true); return; }
  if (!imagePath) { catalogMsg('Pilih gambar ikan dari dropdown.', true); return; }

  try {
    if (remoteIds.size === 0) {
      // Jika sebelumnya masih fallback default lokal, simpan seluruh katalog default + perubahan ke Firestore
      const batch = fb.writeBatch ? fb.writeBatch(fb.db) : null;
      const baseList = [...DEFAULT_CATALOG];
      const existsInDefault = baseList.some((f) => f.id === fishId);
      if (!existsInDefault) {
        baseList.push({ id: fishId, name, rarity, imagePath, description, scale });
      }
      for (const item of baseList) {
        const isCurrent = item.id === fishId;
        const docRef = fb.doc(fb.db, CATALOG_COLLECTION, item.id);
        const data = isCurrent
          ? { fishId, name, rarity, imagePath, description, scale, createdAt: fb.serverTimestamp() }
          : {
              fishId: item.id,
              name: item.name,
              rarity: item.rarity,
              imagePath: item.imagePath,
              description: item.description || '',
              scale: item.scale || 1,
              createdAt: fb.serverTimestamp(),
            };
        if (batch) batch.set(docRef, data);
        else await fb.setDoc(docRef, data);
      }
      if (batch) await batch.commit();
      catalogMsg(`"${name}" [${rarity}] tersimpan ke Firestore.`);
    } else {
      if (editingFishId) {
        await fb.setDoc(fb.doc(fb.db, CATALOG_COLLECTION, fishId), {
          fishId, name, rarity, imagePath, description, scale,
        }, { merge: true });
        catalogMsg(`Perubahan "${name}" [${rarity}] tersimpan.`);
      } else {
        await fb.setDoc(fb.doc(fb.db, CATALOG_COLLECTION, fishId), {
          fishId, name, rarity, imagePath, description, scale, createdAt: fb.serverTimestamp(),
        });
        catalogMsg(`${name} [${rarity}] tersimpan ke fish_catalog.`);
      }
    }
    cancelEditFish();
  } catch (err) {
    console.warn(err);
    catalogMsg(`Gagal menyimpan${firestoreErrHint(err)}.`, true);
  }
}

async function deleteFish(fishId, name) {
  if (!fb || !fishId) return;

  const ok = await confirmAction({
    title: 'Hapus Ikan?',
    message: `Hapus "${name}" (${fishId}) dari fish_catalog? Ikan ini tak lagi muncul di gacha & gift.`,
    okText: 'Ya, Hapus',
  });
  if (!ok) return;

  try {
    if (remoteIds.size === 0 || !remoteIds.has(fishId)) {
      // Jika Firestore masih kosong / ikan default belum tersimpan:
      // Simpan semua ikan katalog default LAINNYA ke Firestore agar yang dipilih benar-benar terhapus.
      const batch = fb.writeBatch ? fb.writeBatch(fb.db) : null;
      const remaining = catalog.filter((f) => f.id !== fishId);
      for (const f of remaining) {
        const docRef = fb.doc(fb.db, CATALOG_COLLECTION, f.id);
        const data = {
          fishId: f.id,
          name: f.name,
          rarity: f.rarity,
          imagePath: f.imagePath,
          description: f.description || '',
          scale: f.scale || 1,
          createdAt: fb.serverTimestamp(),
        };
        if (batch) batch.set(docRef, data);
        else await fb.setDoc(docRef, data);
      }
      if (batch) await batch.commit();
      // Pastikan jika ada doc lama dengan ID ini terhapus
      try { await fb.deleteDoc(fb.doc(fb.db, CATALOG_COLLECTION, fishId)); } catch {}
    } else {
      await fb.deleteDoc(fb.doc(fb.db, CATALOG_COLLECTION, fishId));
    }
    if (editingFishId === fishId) cancelEditFish();
    catalogMsg(`"${name}" dihapus dari fish_catalog.`);
  } catch (err) {
    console.warn(err);
    toast(`Gagal menghapus${firestoreErrHint(err)}.`, true);
  }
}

/* ---------- INIT ---------- */
async function init() {
  $('admin-guard-msg').style.display = '';
  renderGiftOptions();
  updateCatalogSource();
  renderCatalog();
  fb = await getFirebase();
  if (!fb) {
    $('admin-guard-msg').innerHTML = '<p>Firebase belum dikonfigurasi. Isi <code>firebase-config.js</code> untuk memakai Admin Panel.</p>';
    return;
  }
  // Guard: harus login & role admin
  fb.onAuthStateChanged(fb.auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    try {
      const snap = await fb.getDoc(fb.doc(fb.db, 'users', user.uid));
      const data = snap.exists() ? snap.data() : null;
      if (!data || data.role !== 'admin') { window.location.href = 'index.html'; return; }
      $('admin-user').textContent = data.username || user.email;
      $('admin-guard-msg').style.display = 'none';
      $('admin-content').style.display = '';
      watchData();
      watchCatalog();
    } catch {
      window.location.href = 'index.html';
    }
  });

  $('admin-logout').addEventListener('click', async () => {
    try { await fb.signOut(fb.auth); } catch {}
    window.location.href = 'index.html';
  });
  $('admin-search').addEventListener('input', (e) => renderTable(e.target.value));
  $('gift-close').addEventListener('click', closeGift);
  $('gift-cancel').addEventListener('click', closeGift);
  $('gift-modal').addEventListener('click', (e) => { if (e.target.id === 'gift-modal') closeGift(); });
  $('confirm-ok').addEventListener('click', () => closeConfirm(true));
  $('confirm-cancel').addEventListener('click', () => closeConfirm(false));
  $('confirm-close').addEventListener('click', () => closeConfirm(false));
  $('confirm-modal').addEventListener('click', (e) => { if (e.target.id === 'confirm-modal') closeConfirm(false); });
  $('gift-type')?.addEventListener('change', (e) => {
    giftType = e.target.value === 'coin' ? 'coin' : 'fish';
    updateGiftUI();
  });
  document.querySelectorAll('#gift-coin-wrap [data-coin]').forEach((b) => {
    b.addEventListener('click', () => {
      const input = $('gift-coins');
      if (input) input.value = String(b.getAttribute('data-coin'));
    });
  });
  $('gift-send').addEventListener('click', async () => {
    if (!giftUid) return;
    if (giftType === 'coin') { await sendGiftCoin(); return; }
    await sendGiftFish();
  });
  $('catalog-form').addEventListener('submit', handleCatalogSubmit);
  $('catalog-cancel-btn').addEventListener('click', cancelEditFish);
  const seedBtn = $('catalog-seed-btn');
  if (seedBtn) seedBtn.addEventListener('click', seedDefaultCatalog);
  populateImageOptions();
  $('cf-image').addEventListener('change', updateImagePreview);
  $('cf-fishId').addEventListener('input', (e) => {
    const clean = slugifyFishId(e.target.value);
    if (clean !== e.target.value) e.target.value = clean;
  });
}

function watchData() {
  // Stats global
  fb.onSnapshot(fb.doc(fb.db, 'stats', 'global'), (s) => {
    $('stat-visits').textContent = s.exists() ? (s.data().visitorCount ?? 0).toLocaleString('id-ID') : '0';
  });
  // Daftar pemain (usernames only)
  fb.onSnapshot(fb.collection(fb.db, 'users'), (qs) => {
    players = [];
    qs.forEach((d) => {
      const v = d.data();
      if (v.role === 'admin') return;
      players.push({ uid: d.id, ...v });
    });
    $('stat-players').textContent = players.length;
    renderTable($('admin-search').value || '');
  });
}

function watchCatalog() {
  subscribeCatalog(fb, (list) => {
    remoteIds = new Set(list.map((f) => f.id));
    // Koleksi kosong -> tetap pakai fallback lokal agar gift bisa dipakai.
    if (list.length) catalog = list;
    else catalog = DEFAULT_CATALOG.map((f) => ({ ...normalizeCatalogDoc(f) }));
    updateCatalogSource();
    renderCatalog();
    renderGiftOptions();
  });
}

init();
