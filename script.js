/* ========================================
   A QUIET TANK — Script.js (revisi 1.md)
   Auth Firebase + fallback lokal, multi-fish,
   redeem M3Y/B41M, auto-regen 10 mnt, no pet death
   ======================================== */
import { getFirebase, isFirebaseConfigured, usernameToEmail } from './firebase-config.js';
import { translations, LANG_STORAGE_KEY, DEFAULT_LANG } from './locales.js';
import {
  RARITY_COLORS, DEFAULT_CATALOG, normalizeCatalogDoc,
  rollFishFromCatalog, subscribeCatalog,
} from './fish-catalog.js';

(() => {
  'use strict';

  /* ---------- KATALOG IKAN DINAMIS (fish_catalog) ----------
     Sumber utama: koleksi Firestore `fish_catalog` (realtime).
     FISH_DEFS di bawah adalah fallback lokal agar game tetap
     playable saat offline / katalog masih kosong. */
  const FISH_DEFS = DEFAULT_CATALOG.map((f) => ({ ...f }));
  // Katalog runtime: diganti isi fish_catalog saat tersedia.
  let fishCatalog = FISH_DEFS.map((f) => ({ ...f }));
  const REDEEM_CODES = { M3Y: 'cupang_glow', B41M: 'arwana' };
  const fishById = (id) =>
    fishCatalog.find((f) => f.id === id) ||
    FISH_DEFS.find((f) => f.id === id) || null;
  function applyRemoteCatalog(list) {
    if (Array.isArray(list) && list.length) {
      fishCatalog = list.map((f) => ({ ...normalizeCatalogDoc(f) }));
    }
  }

  /* ---------- COZY PRD v1.0: TRAITS ---------- */
  const TRAIT_IDS = ['playful', 'skittish', 'sleepy', 'glutton'];
  const randomTrait = () => TRAIT_IDS[Math.floor(Math.random() * TRAIT_IDS.length)];
  const makeFishEntry = (def, overrides = {}) => ({
    instanceId: overrides.instanceId || `fish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    id: def.id,
    name: def.name,
    nickname: overrides.nickname || def.name,
    rarity: def.rarity,
    trait: TRAIT_IDS.includes(overrides.trait) ? overrides.trait : randomTrait(),
    acquiredAt: overrides.acquiredAt || Date.now(),
  });
  const ensureFishEntry = (f) => {
    const def = fishById(f.id);
    if (!def) return null;
    return {
      instanceId: f.instanceId || `fish_${f.acquiredAt || Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      id: def.id,
      name: def.name,
      nickname: typeof f.nickname === 'string' && f.nickname.trim() ? f.nickname.trim().slice(0, 20) : def.name,
      rarity: f.rarity || def.rarity,
      trait: TRAIT_IDS.includes(f.trait) ? f.trait : randomTrait(),
      acquiredAt: f.acquiredAt || Date.now(),
    };
  };

  const RARITY_FALLBACK_LABEL = {
    Common: 'Common', Rare: 'Rare', Epic: 'Epic',
    Legendary: 'Legendary', Heaven: 'Heaven',
    Uncommon: 'Rare', Special: 'Legendary',
  };
  const rarityLabel = (rarity) =>
    t('rarity_' + String(rarity || '').toLowerCase()) !== ('rarity_' + String(rarity || '').toLowerCase())
      ? t('rarity_' + String(rarity || '').toLowerCase())
      : (RARITY_FALLBACK_LABEL[rarity] || rarity);
  const rarityColor = (rarity) => RARITY_COLORS[rarity] || '#8B7D6B';

  const TIME_PERIODS = {
    MORNING:   { start: 5, end: 11,   label: 'Morning',   bg: 'assets/background/morning.png' },
    NOON:      { start: 11, end: 15,  label: 'Noon',      bg: 'assets/background/noon.png' },
    AFTERNOON: { start: 15, end: 18.5,label: 'Afternoon', bg: 'assets/background/afternoon.png' },
    NIGHT:     { start: 18.5, end: 29,label: 'Night',     bg: 'assets/background/night.png' },
  };

  // Hunger: -1% per 3,6 mnt. Cleanliness: +1% per 10 mnt (revisi 1.md §2E).
  const BASE_DECAY_RATE = { hunger: 1 / (3.6 * 60 * 1000) };
  const REGEN_RATE = { cleanliness: 1 / (10 * 60 * 1000) };
  const CLEANLINESS_DIRTY_THRESHOLD = 40;
  const DIRTY_HUNGER_MULTIPLIER = 1.3;

  const FOOD_CONFIG = {
    maxStock: 5, feedAmount: 10, feedCleanlinessPenalty: 12,
    claimAmount: 1, claimCooldownHours: 4, feedCooldownMs: 1500,
  };

  /* ---------- I18N (PRD_MULTI_LANGUAGE.md) ---------- */
  let currentLang = DEFAULT_LANG;
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && translations[saved]) currentLang = saved;
  } catch {}
  const t = (key) => translations[currentLang]?.[key] ?? translations[DEFAULT_LANG]?.[key] ?? key;
  const traitLabel = (traitId) => {
    if (traitId === 'playful') return t('trait_playful');
    if (traitId === 'skittish') return t('trait_skittish');
    if (traitId === 'sleepy') return t('trait_sleepy');
    if (traitId === 'glutton') return t('trait_glutton');
    return traitId;
  };
  const formatWIB = (ts) => {
    try {
      return new Intl.DateTimeFormat(currentLang === 'ja' ? 'ja-JP' : currentLang === 'en' ? 'en-GB' : 'id-ID', {
        timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(ts));
    } catch { return new Date(ts).toLocaleString(); }
  };
  const fishDisplayName = (id) => {
    if (id === 'cupang_glow') return t('fish_glow_betta');
    if (id === 'arwana') return t('fish_arowana');
    return fishById(id)?.name || id;
  };
  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      // Jangan timpa span dinamis claim-btn-text (diatur via updateClaimButton)
      if (el.id === 'claim-btn-text') return;
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    document.querySelectorAll('.lang-btn[data-lang]').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === currentLang);
      b.setAttribute('aria-pressed', String(b.dataset.lang === currentLang));
    });
    try { document.documentElement.lang = currentLang; } catch {}
  }
  function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
    applyStaticI18n();
    updateClaimButton();
    refreshAmbientButtons();
    applyWeatherUI();
    renderJournal();
    if (!els.photoOverlay?.hidden && els.photoCaption) {
      els.photoCaption.textContent = `${t('photo_caption')} — ${wibStamp()} WIB`;
    }
    if (els.drawerToggle && els.sideDrawer) {
      const open = els.sideDrawer.classList.contains('open');
      els.drawerToggle.title = open ? t('drawer_close') : t('drawer_open');
    }
  }

  /* ---------- STATE ---------- */
  const state = {
    uid: null, username: '', role: 'user',
    fishList: [], hunger: 100, cleanliness: 100,
    foodStock: 5, maxFoodStock: 5,
    claimedCodes: [],
    lastFeedTime: 0, lastClaimTime: 0,
    createdAt: 0, lastOnline: 0, screen: 'splash',
  };
  let fb = null;             // modul firebase (null = mode lokal)
  let unsubUser = null;      // listener realtime gift fish
  let saveTimer = null;

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const els = {};
  ['splash-screen','splash-play-btn','intro-screen','intro-video','replay-intro-btn',
   'welcome-screen','gacha-screen','aquarium-screen','gacha-result','gacha-btn','keep-fish-btn',
   'bg-layer','aquarium','dirt-overlay','fish-container','food-particles','hunger-bar','hunger-value',
   'cleanliness-bar','cleanliness-value','food-count','food-stock-fill','claim-food-btn','claim-btn-text',
    'claim-cooldown','feed-btn','drawer-toggle','side-drawer','settings-btn','settings-modal',
   'settings-backdrop','settings-close-btn','volume-slider','volume-val','settings-username',
   'save-username-btn','username-save-msg','redeem-code-input','redeem-code-btn','redeem-msg','logout-btn',
   'login-form','login-username','login-password','login-error','register-form','register-username',
   'register-password','register-confirm','register-error','switch-to-register','switch-to-login','bgm',
   'rain-glass-overlay','weather-badge','weather-icon','weather-text',
   'snap-btn','journal-btn','journal-modal','journal-backdrop','journal-close-btn','journal-list',
   'photo-overlay','photo-img','photo-caption','photo-save-btn','photo-back-btn'
  ].forEach(id => { els[camel(id)] = $(id); });
  function camel(id) { return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }

  /* ---------- UTIL ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 4000);
  }

  /* ---------- STORE: cloud vs lokal ---------- */
  const LOCAL_KEY = 'cozy-aquarium-save-v2';
  const LEGACY_KEY = 'cozy-aquarium-save';

  function migrateLegacy(raw) {
    if (raw.fish && !raw.fishList) {
      const f = fishById(raw.fish.id) || FISH_DEFS[0];
      raw.fishList = [{ id: f.id, name: f.name, rarity: f.rarity }];
      delete raw.fish;
    }
    return raw;
  }

  function readLocal() {
    try {
      let raw = localStorage.getItem(LOCAL_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const data = migrateLegacy(JSON.parse(raw));
      if (!data.username) return null;
      return data;
    } catch { return null; }
  }
  function writeLocal() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({
        username: state.username, role: state.role, fishList: state.fishList,
        hunger: state.hunger, cleanliness: state.cleanliness,
        foodStock: state.foodStock, maxFoodStock: state.maxFoodStock,
        claimedCodes: state.claimedCodes,
        lastFeedTime: state.lastFeedTime, lastClaimTime: state.lastClaimTime,
        createdAt: state.createdAt, lastOnline: Date.now(),
      }));
    } catch {}
  }

  async function persist() {
    state.lastOnline = Date.now();
    if (fb && state.uid) {
      try {
        await fb.updateDoc(fb.doc(fb.db, 'users', state.uid), {
          username: state.username, fishList: state.fishList,
          hunger: state.hunger, cleanliness: state.cleanliness,
          foodStock: state.foodStock, claimedCodes: state.claimedCodes,
          lastOnline: state.lastOnline,
        });
        return;
      } catch (e) { console.warn('Persist cloud gagal:', e); }
    }
    writeLocal();
  }
  function persistDebounced() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 800);
  }

  async function loadUserDoc(uid) {
    try {
      const snap = await fb.getDoc(fb.doc(fb.db, 'users', uid));
      return snap.exists() ? snap.data() : null;
    } catch (e) { console.warn('Load user gagal:', e); return null; }
  }

  function applyDeltaDecay(saved) {
    const now = Date.now();
    const delta = Math.max(0, now - (saved.lastOnline || saved.lastPlayed || now));
    const mult = (saved.cleanliness ?? 100) < CLEANLINESS_DIRTY_THRESHOLD ? DIRTY_HUNGER_MULTIPLIER : 1;
    return {
      ...saved,
      hunger: clamp((saved.hunger ?? 100) - delta * BASE_DECAY_RATE.hunger * mult, 0, 100),
      cleanliness: clamp((saved.cleanliness ?? 100) + delta * REGEN_RATE.cleanliness, 0, 100),
    };
  }

  function applySaveToState(saved) {
    const r = applyDeltaDecay(saved);
    state.username = saved.username || '';
    state.role = saved.role || 'user';
    const rawList = Array.isArray(r.fishList) ? r.fishList : [];
    state.fishList = rawList.map(ensureFishEntry).filter(Boolean);
    state.hunger = r.hunger; state.cleanliness = r.cleanliness;
    state.foodStock = saved.foodStock ?? FOOD_CONFIG.maxStock;
    state.maxFoodStock = saved.maxFoodStock ?? FOOD_CONFIG.maxStock;
    state.claimedCodes = Array.isArray(saved.claimedCodes) ? saved.claimedCodes : [];
    state.lastFeedTime = saved.lastFeedTime || 0;
    state.lastClaimTime = saved.lastClaimTime || 0;
    state.createdAt = saved.createdAt || Date.now();
    state.lastOnline = Date.now();
  }

  /* ---------- VISITOR COUNTER (stats/global) ---------- */
  async function bumpVisitor() {
    if (fb) {
      try { await fb.updateDoc(fb.doc(fb.db, 'stats', 'global'), { visitorCount: fb.increment(1) }); }
      catch { try { await fb.setDoc(fb.doc(fb.db, 'stats', 'global'), { visitorCount: 1 }, { merge: true }); } catch {} }
    } else {
      try { localStorage.setItem('cozy-aquarium-visits', String((parseInt(localStorage.getItem('cozy-aquarium-visits') || '0', 10) || 0) + 1)); } catch {}
    }
  }

  /* ---------- NAVIGASI LAYAR ---------- */
  function setScreen(name) {
    state.screen = name;
    [['splash-screen','splash'],['intro-screen','intro'],['welcome-screen','welcome'],
     ['gacha-screen','gacha'],['aquarium-screen','aquarium']].forEach(([id, key]) => {
      const el = $(id); if (el) el.setAttribute('aria-hidden', String(key !== name));
    });
    if (els.weatherBadge) els.weatherBadge.hidden = name !== 'aquarium';
  }
  function showWelcome() { setScreen('welcome'); }
  function showGacha() {
    setScreen('gacha');
    if (els.gachaResult) els.gachaResult.innerHTML = '<div class="gacha-egg"><img src="assets/ui/egg.png" alt="Fish Egg" class="gacha-egg-img"></div>';
    if (els.gachaBtn) els.gachaBtn.hidden = false;
    if (els.keepFishBtn) els.keepFishBtn.hidden = true;
  }
  function showAquarium() {
    setScreen('aquarium');
    renderFishList(); updateStatusBars();
    updateBackground(); startSwimLoop(); startDecayInterval(); startClaimTimer(); playBGM();
    initTapInteraction();
    refreshWeather();
    maybeStartAmbient();
  }

  /* ---------- STATUS BAR + DIRT ---------- */
  function updateDirtOverlay() {
    const ov = els.dirtOverlay || $('dirt-overlay');
    if (!ov) return;
    ov.style.opacity = clamp(((100 - state.cleanliness) / 100) * 0.65, 0, 0.65).toFixed(3);
  }
  function updateStatusBars() {
    const h = Math.round(state.hunger), c = Math.round(state.cleanliness);
    if (els.hungerBar) els.hungerBar.style.width = h + '%';
    if (els.hungerValue) els.hungerValue.textContent = h + '%';
    if (els.cleanlinessBar) els.cleanlinessBar.style.width = c + '%';
    if (els.cleanlinessValue) els.cleanlinessValue.textContent = c + '%';
    if (els.foodCount) els.foodCount.textContent = `${state.foodStock} / ${state.maxFoodStock}`;
    if (els.foodStockFill) els.foodStockFill.style.width = (state.foodStock / state.maxFoodStock) * 100 + '%';
    if (els.feedBtn) els.feedBtn.disabled = state.foodStock <= 0;
    updateDirtOverlay();
  }

  /* ---------- MULTI-FISH RENDER + SWIM ---------- */
  let swimmers = [], swimFrame = null;
  const PADDING = 8;

  function preload() {
    FISH_DEFS.forEach(f => { const a = new Image(); a.src = f.src; const b = new Image(); b.src = f.originalSrc; });
    Object.values(TIME_PERIODS).forEach(p => { const i = new Image(); i.src = p.bg; });
  }

  function renderFishList() {
    const box = els.fishContainer;
    if (!box) return;
    stopSwimLoop(); box.innerHTML = ''; swimmers = [];
    state.fishList.forEach((f) => {
      const def = fishById(f.id); if (!def) return;
      const wrap = document.createElement('div');
      wrap.className = 'fish-wrap'; wrap.dataset.fishId = def.id;
      wrap.dataset.instanceId = f.instanceId || '';
      wrap.dataset.rarity = f.rarity || def.rarity || 'Common';
      // Heaven: aura keemasan (efek visual tingkat tertinggi).
      if ((f.rarity || def.rarity) === 'Heaven') wrap.classList.add('heaven-aura');
      const img = document.createElement('img');
      img.className = 'fish-sprite'; img.alt = f.nickname || fishDisplayName(def.id); img.src = def.src;
      img.style.setProperty('--fish-scale', def.scale || 1);
      img.onerror = () => { if (!img.src.includes(encodeURI(def.originalSrc))) img.src = def.originalSrc; };
      wrap.appendChild(img);
      // Tap langsung pada ikan (PRD A.2)
      wrap.addEventListener('pointerdown', (e) => { e.stopPropagation(); onFishTap(wrap, f, e); });
      box.appendChild(wrap);
      const baseSpeed = 0.008 + Math.random() * 0.008;
      const fScale = def.scale || 1;
      swimmers.push({
        el: wrap, img, entry: f, trait: f.trait || 'playful',
        dir: Math.random() < 0.5 ? 1 : -1,
        x: PADDING + Math.random() * 60, y: PADDING + Math.random() * 30,
        tx: 0, ty: 0,
        speed: f.trait === 'playful' ? baseSpeed * 1.35 : baseSpeed,
        baseSpeed: f.trait === 'playful' ? baseSpeed * 1.35 : baseSpeed,
        pause: Math.random() * 120, dashUntil: 0, boostUntil: 0,
        padX: 70 * fScale + 30, padY: 40 * fScale + 10,
      });
    });
    // sebar posisi awal setelah layout
    requestAnimationFrame(() => {
      const r = box.getBoundingClientRect();
      swimmers.forEach(s => {
        s.x = PADDING + Math.random() * Math.max(10, r.width - 120);
        s.y = PADDING + Math.random() * Math.max(10, r.height - 60);
        pickTarget(s, r);
      });
    });
  }

  function pickTarget(s, rect, prefer = null) {
    // Clearance mengikuti ukuran sprite agar ikan besar (arwana) tidak
    // menabrak / terpotong tepi kaca.
    const padX = s.padX || 100, padY = s.padY || 50;
    const maxX = Math.max(10, rect.width - padX), maxY = Math.max(10, rect.height - padY);
    if (prefer) {
      s.tx = clamp(prefer.x, PADDING, PADDING + maxX);
      s.ty = clamp(prefer.y, PADDING, PADDING + maxY);
    } else if (s.trait === 'playful') {
      // Lincah: sering mendekati permukaan
      s.tx = PADDING + Math.random() * maxX;
      s.ty = PADDING + Math.random() * maxY * 0.45;
    } else if (s.trait === 'skittish') {
      // Penakut: bawah / tengah
      s.tx = PADDING + Math.random() * maxX;
      s.ty = PADDING + maxY * 0.45 + Math.random() * maxY * 0.55;
    } else {
      s.tx = PADDING + Math.random() * maxX;
      s.ty = PADDING + Math.random() * maxY;
    }
    s.dir = s.tx > s.x ? 1 : -1;
  }

  /* ---------- TAP INTERACTION (PRD A.2) ---------- */
  let tapWired = false;
  function initTapInteraction() {
    if (tapWired || !els.aquarium) return;
    tapWired = true;
    els.aquarium.addEventListener('pointerdown', (e) => {
      if (state.screen !== 'aquarium' || document.body.classList.contains('photo-mode')) return;
      if (e.target.closest('.fish-wrap')) return; // ditangani onFishTap
      onGlassTap(e);
    });
  }
  function containerPoint(e) {
    const box = els.fishContainer, aq = els.aquarium;
    const br = box.getBoundingClientRect(), ar = aq.getBoundingClientRect();
    const cx = (e.clientX - ar.left) / Math.max(1, ar.width);
    const cy = (e.clientY - ar.top) / Math.max(1, ar.height);
    // petakan ke koordinat fish-container (area kaca dalam)
    const scaleX = ar.width / Math.max(1, br.width), scaleY = ar.height / Math.max(1, br.height);
    return {
      x: clamp((e.clientX - br.left), 0, br.width - 40),
      y: clamp((e.clientY - br.top), 0, br.height - 30),
      ax: e.clientX - ar.left, ay: e.clientY - ar.top, scaleX, scaleY, boxRect: br, aqRect: ar, cx, cy,
    };
  }
  function onFishTap(wrap, entry, e) {
    if (document.body.classList.contains('photo-mode')) return;
    wrap.classList.remove('fish-excited');
    void wrap.offsetWidth;
    wrap.classList.add('fish-excited');
    setTimeout(() => wrap.classList.remove('fish-excited'), 650);
    // gelembung hati / bintang
    const box = els.fishContainer;
    const s = swimmers.find(sw => sw.el === wrap);
    const bx = s ? s.x + 30 : 40, by = s ? s.y - 6 : 20;
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('div');
      b.className = 'bubble-heart';
      b.textContent = Math.random() < 0.6 ? '💗' : '⭐';
      b.style.left = (bx + (Math.random() * 30 - 15)) + 'px';
      b.style.top = (by + (Math.random() * 10 - 5)) + 'px';
      b.style.animationDelay = (i * 0.12) + 's';
      box.appendChild(b);
      setTimeout(() => b.remove(), 1700);
    }
    // label nickname di atas kepala ikan
    wrap.querySelectorAll('.fish-nick').forEach(n => n.remove());
    const nick = document.createElement('div');
    nick.className = 'fish-nick';
    nick.textContent = entry.nickname || entry.name;
    wrap.appendChild(nick);
    setTimeout(() => nick.remove(), 1850);
  }
  function onGlassTap(e) {
    const pt = containerPoint(e);
    spawnRipple(e);
    const box = els.fishContainer;
    const rect = box.getBoundingClientRect();
    swimmers.forEach(s => {
      if (s.trait === 'playful') {
        // mendekati lokasi ketukan
        pickTarget(s, rect, { x: pt.x, y: pt.y });
        s.pause = 0;
      } else if (s.trait === 'skittish') {
        // terkejut: dash menjauh
        const dx = s.x - pt.x, dy = s.y - pt.y;
        const d = Math.hypot(dx, dy) || 1;
        const fleeDist = 130;
        pickTarget(s, rect, {
          x: s.x + (dx / d) * fleeDist,
          y: s.y + (dy / d) * fleeDist * 0.6,
        });
        s.pause = 0;
        s.dashUntil = performance.now() + 900;
      }
    });
  }
  function spawnRipple(e) {
    const aq = els.aquarium;
    if (!aq) return;
    const ar = aq.getBoundingClientRect();
    const r = document.createElement('div');
    r.className = 'tap-ripple';
    r.style.left = (e.clientX - ar.left) + 'px';
    r.style.top = (e.clientY - ar.top) + 'px';
    aq.appendChild(r);
    setTimeout(() => r.remove(), 850);
  }

  function swimLoop() {
    const box = els.fishContainer;
    if (!box || !swimmers.length) { swimFrame = null; return; }
    const rect = box.getBoundingClientRect();
    const now = performance.now();
    swimmers.forEach(s => {
      if (s.pause > 0) { s.pause--; return; }
      const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
      if (d < 5) {
        // Tukang Tidur: sering idle lebih lama
        const idleChance = s.trait === 'sleepy' ? 0.55 : 0.3;
        const idleLen = s.trait === 'sleepy' ? 140 + Math.random() * 200 : 60 + Math.random() * 120;
        if (Math.random() < idleChance) s.pause = idleLen;
        pickTarget(s, rect);
      } else {
        const dashing = now < (s.dashUntil || 0);
        const boosted = now < (s.boostUntil || 0);
        const k = (dashing ? 3.2 : 1) * (boosted ? 2.2 : 1);
        s.x += dx * s.speed * k; s.y += dy * s.speed * k;
        s.dir = dx > 0 ? 1 : -1;
      }
      s.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
      s.img.style.transform = s.dir === -1 ? 'scaleX(-1)' : '';
    });
    swimFrame = requestAnimationFrame(swimLoop);
  }
  function startSwimLoop() { if (!swimFrame) swimFrame = requestAnimationFrame(swimLoop); }
  function stopSwimLoop() { if (swimFrame) cancelAnimationFrame(swimFrame); swimFrame = null; }

  /* ---------- WIB BACKGROUND ---------- */
  function getWIB(date = new Date()) {
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000 + 7 * 3600000);
  }
  function currentPeriod() {
    const w = getWIB(), h = w.getHours() + w.getMinutes() / 60;
    if (h >= 5 && h < 11) return TIME_PERIODS.MORNING;
    if (h >= 11 && h < 15) return TIME_PERIODS.NOON;
    if (h >= 15 && h < 18.5) return TIME_PERIODS.AFTERNOON;
    return TIME_PERIODS.NIGHT;
  }
  function updateBackground() {
    if (els.bgLayer) els.bgLayer.style.backgroundImage = `url('${currentPeriod().bg}')`;
  }
  setInterval(updateBackground, 60000);

  /* ---------- BGM ---------- */
  const AUDIO_KEY = 'aquarium_audio_settings';
  const getAudio = () => {
    try {
      const p = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}');
      return { volume: typeof p.volume === 'number' ? p.volume : 0.18, isMuted: !!p.isMuted };
    } catch { return { volume: 0.18, isMuted: false }; }
  };
  const saveAudio = (s) => { try { localStorage.setItem(AUDIO_KEY, JSON.stringify(s)); } catch {} };
  function playBGM() {
    const bgm = els.bgm; if (!bgm) return;
    const a = getAudio();
    if (a.isMuted || a.volume <= 0) { if (!bgm.paused) bgm.pause(); return; }
    bgm.volume = clamp(a.volume, 0, 1);
    if (bgm.paused) bgm.play().catch(() => {});
  }

  /* ---------- DECAY + CLAIM ---------- */
  let decayTimer = null, claimTimer = null;
  function tickDecay(deltaMs = 1000) {
    const mult = state.cleanliness < CLEANLINESS_DIRTY_THRESHOLD ? DIRTY_HUNGER_MULTIPLIER : 1;
    state.hunger = clamp(state.hunger - BASE_DECAY_RATE.hunger * deltaMs * mult, 0, 100);
    state.cleanliness = clamp(state.cleanliness + REGEN_RATE.cleanliness * deltaMs, 0, 100);
    updateStatusBars(); updateClaimButton(); persistDebounced();
  }
  function startDecayInterval() { stopDecayInterval(); decayTimer = setInterval(() => tickDecay(1000), 1000); }
  function stopDecayInterval() { if (decayTimer) clearInterval(decayTimer); decayTimer = null; }

  function updateClaimButton() {
    if (!els.claimFoodBtn) return;
    const cd = FOOD_CONFIG.claimCooldownHours * 3600 * 1000;
    const since = Date.now() - state.lastClaimTime;
    const full = state.foodStock >= state.maxFoodStock;
    if (full) {
      els.claimFoodBtn.disabled = true; els.claimBtnText.textContent = t('btn_full'); els.claimCooldown.hidden = true;
    } else if (since >= cd) {
      els.claimFoodBtn.disabled = false; els.claimBtnText.textContent = t('btn_claim'); els.claimCooldown.hidden = true;
    } else {
      els.claimFoodBtn.disabled = true; els.claimBtnText.textContent = t('btn_claim');
      const rem = cd - since, h = Math.floor(rem / 3600000), m = Math.floor(rem % 3600000 / 60000), s = Math.floor(rem % 60000 / 1000);
      els.claimCooldown.textContent = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
      els.claimCooldown.hidden = false;
    }
  }
  function startClaimTimer() { stopClaimTimer(); updateClaimButton(); claimTimer = setInterval(updateClaimButton, 1000); }
  function stopClaimTimer() { if (claimTimer) clearInterval(claimTimer); claimTimer = null; }

  /* ---------- FEED ---------- */
  function spawnFood() {
    const box = els.foodParticles; if (!box) return;
    const w = box.offsetWidth || 300;
    for (let i = 0; i < 3; i++) setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'food-particle';
      p.style.left = (w * 0.15 + Math.random() * w * 0.7) + 'px';
      p.style.top = '0px';
      box.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }, i * 180);
  }
  function feedFish() {
    if (Date.now() - state.lastFeedTime < FOOD_CONFIG.feedCooldownMs || state.foodStock <= 0) return;
    state.foodStock = Math.max(0, state.foodStock - 1);
    state.hunger = clamp(state.hunger + FOOD_CONFIG.feedAmount, 0, 100);
    state.cleanliness = clamp(state.cleanliness - FOOD_CONFIG.feedCleanlinessPenalty, 0, 100);
    state.lastFeedTime = Date.now();
    spawnFood(); updateStatusBars(); persistDebounced();
    // Tukang Makan: bergerak cepat ke arah pakan
    try {
      const box = els.fishContainer;
      const rect = box.getBoundingClientRect();
      const fx = PADDING + rect.width * (0.2 + Math.random() * 0.6);
      const fy = PADDING + rect.height * 0.25;
      swimmers.forEach(s => {
        if (s.trait === 'glutton') {
          pickTarget(s, rect, { x: fx + (Math.random() * 40 - 20), y: fy });
          s.pause = 0;
          s.boostUntil = performance.now() + 2500;
        }
      });
    } catch {}
    if (els.feedBtn) { els.feedBtn.disabled = true; setTimeout(() => { els.feedBtn.disabled = state.foodStock <= 0; }, FOOD_CONFIG.feedCooldownMs); }
  }
  function claimFood() {
    const cd = FOOD_CONFIG.claimCooldownHours * 3600 * 1000;
    if (Date.now() - state.lastClaimTime < cd || state.foodStock >= state.maxFoodStock) return;
    state.foodStock = Math.min(state.maxFoodStock, state.foodStock + FOOD_CONFIG.claimAmount);
    state.lastClaimTime = Date.now();
    updateStatusBars(); updateClaimButton(); persistDebounced();
  }

  /* ---------- REDEEM (Settings) ---------- */
  function redeemMsg(text, ok) {
    const el = els.redeemMsg; if (!el) return;
    el.textContent = text; el.hidden = false;
    el.style.color = ok ? '#4D8B84' : '#D97770';
    clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 3500);
  }
  async function handleRedeem() {
    const input = els.redeemCodeInput;
    const code = (input?.value || '').trim().toUpperCase();
    if (!code) { redeemMsg(t('redeem_empty'), false); return; }
    if (state.claimedCodes.includes(code)) { redeemMsg(t('redeem_claimed'), false); return; }
    const fishId = REDEEM_CODES[code];
    if (!fishId) { redeemMsg(t('redeem_invalid'), false); return; }
    if (state.fishList.some(f => f.id === fishId)) { redeemMsg(t('redeem_owned'), false); return; }
    const def = fishById(fishId);
    state.fishList.push(makeFishEntry(def));
    state.claimedCodes.push(code);
    await persist();
    if (state.screen === 'aquarium') renderFishList();
    if (input) input.value = '';
    redeemMsg(`${fishDisplayName(def.id)} ${t('redeem_success')}`, true);
  }
  async function addFishById(fishId) {
    const def = fishById(fishId); if (!def) return false;
    if (state.fishList.some(f => f.id === fishId)) return false;
    state.fishList.push(makeFishEntry(def));
    await persist();
    if (state.screen === 'aquarium') renderFishList();
    return true;
  }

  /* ---------- AUTH ---------- */
  function switchAuth(which) {
    const login = els.loginForm, reg = els.registerForm;
    if (!login || !reg) return;
    const showLogin = which === 'login';
    login.setAttribute('aria-hidden', String(!showLogin));
    login.style.display = showLogin ? '' : 'none';
    reg.setAttribute('aria-hidden', String(showLogin));
    reg.style.display = showLogin ? 'none' : '';
  }

  async function afterAuth(uid, username, isNew) {
    state.uid = uid; state.username = username;
    if (fb) {
      let docData = await loadUserDoc(uid);
      if (!docData) {
        docData = {
          username, role: 'user', fishList: [], hunger: 100, cleanliness: 100,
          foodStock: FOOD_CONFIG.maxStock, claimedCodes: [],
          createdAt: Date.now(), lastOnline: Date.now(),
        };
        try { await fb.setDoc(fb.doc(fb.db, 'users', uid), docData); } catch (e) { console.warn(e); }
      }
      state.role = docData.role || 'user';
      if (docData.role === 'admin') { window.location.href = 'admin.html'; return; }
      applySaveToState({ ...docData, username });
      subscribeUser(uid);
      await persist();
    } else {
      const local = readLocal();
      if (local && local.username.toLowerCase() === username.toLowerCase()) {
        state.uid = null; applySaveToState(local);
      } else if (isNew) {
        Object.assign(state, {
          uid: null, role: 'user', fishList: [], hunger: 100, cleanliness: 100,
          foodStock: 5, maxFoodStock: 5, claimedCodes: [],
          lastFeedTime: 0, lastClaimTime: 0, createdAt: Date.now(), lastOnline: Date.now(),
        });
        writeLocal();
      } else {
        return t('err_user_not_found');
      }
    }
    playBGM();
    if (state.fishList.length === 0) showGacha(); else showAquarium();
    return null;
  }

  function subscribeUser(uid) {
    if (!fb || !uid) return;
    if (unsubUser) unsubUser();
    try {
      unsubUser = fb.onSnapshot(fb.doc(fb.db, 'users', uid), (snap) => {
        if (!snap.exists() || state.screen !== 'aquarium') return;
        const d = snap.data();
        const ids = (d.fishList || []).map(f => `${f.instanceId || f.id}`).join(',');
        const cur = state.fishList.map(f => `${f.instanceId || f.id}`).join(',');
        if (ids !== cur) {
          state.fishList = (d.fishList || []).map(ensureFishEntry).filter(Boolean);
          renderFishList();
          renderJournal();
        }
      });
    } catch {}
  }

  /* ---------- SPLASH + INTRO ---------- */
  function showSplash(onPlay) {
    const splash = $('splash-screen'), btn = $('splash-play-btn');
    if (!splash) { onPlay?.(); return; }
    setScreen('splash');
    splash.classList.remove('fade-out');
    splash.setAttribute('aria-hidden', 'false');

    if (btn) {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPlay?.();
      };
    }
  }

  function playIntro(onComplete) {
    const video = els.introVideo, screen = $('intro-screen'), splash = $('splash-screen');
    if (!video || !screen) { onComplete?.(); return; }

    const bgm = els.bgm;
    if (bgm && !bgm.paused) bgm.pause();

    setScreen('intro');
    screen.classList.remove('fade-out');
    screen.setAttribute('aria-hidden', 'false');

    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.setAttribute('aria-hidden', 'true');
        splash.classList.remove('fade-out');
      }, 350);
    }

    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { localStorage.setItem('cozy_tank_intro_seen', 'true'); } catch {}
      try { video.pause(); } catch {}
      screen.classList.add('fade-out');
      setTimeout(() => {
        screen.setAttribute('aria-hidden', 'true');
        screen.classList.remove('fade-out');
        onComplete?.();
      }, 400);
    };

    video.onended = finish;

    // Putar video langsung di dalam user gesture loop
    const p = video.play();
    if (p !== undefined) {
      p.catch((err) => {
        console.warn('Autoplay unmuted blocked, mencoba muted:', err);
        video.muted = true;
        video.play().catch((err2) => {
          console.warn('Playback video gagal total:', err2);
          finish();
        });
      });
    }
  }

  /* ---------- COZY B: CUACA JAKARTA + AMBIENT ---------- */
  const AMBIENT_KEY = 'aquarium_ambient_on';
  let isRainingJakarta = false;
  const getAmbientPref = () => {
    try { return localStorage.getItem(AMBIENT_KEY) !== 'off'; } catch { return true; }
  };
  const setAmbientPref = (on) => { try { localStorage.setItem(AMBIENT_KEY, on ? 'on' : 'off'); } catch {} };
  const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]);

  async function refreshWeather() {
    let raining = false;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.83&current=precipitation,rain,weather_code&timezone=Asia%2FJakarta',
        { signal: ctrl.signal }
      );
      clearTimeout(to);
      const j = await res.json();
      const cur = j?.current || {};
      raining = (cur.rain || 0) > 0 || (cur.precipitation || 0) > 0 || RAIN_CODES.has(cur.weather_code);
    } catch {
      // Fallback simulasi: anggap hujan jika jam WIB sore rawan hujan (14-16) dgn probabilitas ringan
      try {
        const h = getWIB().getHours();
        raining = (h === 14 || h === 15) && (Date.now() % 2 === 0);
      } catch { raining = false; }
    }
    isRainingJakarta = raining;
    applyWeatherUI();
    maybeStartAmbient();
  }
  function applyWeatherUI() {
    const ov = els.rainGlassOverlay;
    if (ov) ov.hidden = !isRainingJakarta;
    document.body.classList.toggle('is-raining', !!isRainingJakarta);
    if (els.weatherBadge) {
      els.weatherBadge.hidden = state.screen !== 'aquarium';
      if (els.weatherIcon) els.weatherIcon.textContent = isRainingJakarta ? '🌧️' : '🌤️';
      if (els.weatherText) els.weatherText.textContent = isRainingJakarta ? t('weather_rain') : t('weather_clear');
    }
  }
  setInterval(() => { if (state.screen === 'aquarium') refreshWeather(); }, 10 * 60 * 1000);

  // Ambient rain + water: sintesis WebAudio tanpa aset eksternal
  let ambientCtx = null, ambientNodes = null;
  function stopAmbient() {
    try { ambientNodes?.gain?.gain?.linearRampToValueAtTime(0.0001, ambientCtx.currentTime + 0.6); } catch {}
    const nodes = ambientNodes, ctx = ambientCtx;
    setTimeout(() => { try { nodes?.src?.stop(); } catch {} try { nodes?.src?.disconnect(); } catch {} }, 700);
    ambientNodes = null;
  }
  function maybeStartAmbient() {
    if (state.screen !== 'aquarium' || !getAmbientPref() || !isRainingJakarta) { stopAmbient(); return; }
    startAmbient();
  }
  function startAmbient() {
    try {
      if (ambientNodes) return;
      ambientCtx = ambientCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (ambientCtx.state === 'suspended') ambientCtx.resume().catch(() => {});
      const len = ambientCtx.sampleRate * 2;
      const buf = ambientCtx.createBuffer(1, len, ambientCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ambientCtx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = ambientCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.4;
      const hp = ambientCtx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 300;
      const gain = ambientCtx.createGain();
      gain.gain.value = 0.0;
      gain.gain.linearRampToValueAtTime(0.05, ambientCtx.currentTime + 2.5);
      src.connect(lp); lp.connect(hp); hp.connect(gain); gain.connect(ambientCtx.destination);
      src.start();
      ambientNodes = { src, gain };
    } catch {}
  }
  function refreshAmbientButtons() {
    const on = getAmbientPref();
    document.querySelectorAll('.ambient-btn').forEach(b => {
      const active = (b.dataset.ambient === 'on') === on;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
      b.textContent = b.dataset.ambient === 'on' ? t('ambient_on') : t('ambient_off');
    });
  }

  /* ---------- COZY C: POLAROID PHOTO MODE ---------- */
  let lastPhotoURL = null;
  function wibStamp(ts = Date.now()) {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(ts));
    } catch { return new Date(ts).toLocaleString(); }
  }
  function loadImg(src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }
  function coverDraw(ctx, img, dx, dy, dw, dh) {
    // Replika CSS background-size: cover + position center
    const ir = img.naturalWidth / Math.max(1, img.naturalHeight);
    const dr = dw / Math.max(1, dh);
    let sw, sh, sx, sy;
    if (ir > dr) { sh = img.naturalHeight; sw = sh * dr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
    else { sw = img.naturalWidth; sh = sw / Math.max(0.001, dr); sx = 0; sy = (img.naturalHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  // Foto tank saja (tanpa caption). Ukuran & posisi ikan diukur dari
  // bounding rect asli di layar sehingga proporsinya 1:1 dengan game.
  async function renderTankCanvas() {
    const aq = els.aquarium;
    const aqRect = aq ? aq.getBoundingClientRect() : { width: 400, height: 300, left: 0, top: 0 };
    const W = 900;
    const PH = Math.max(300, Math.round(W * (aqRect.height / Math.max(1, aqRect.width))));
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = PH;
    const ctx = cv.getContext('2d');
    const k = W / Math.max(1, aqRect.width);
    // background waktu Jakarta (cover, seperti CSS)
    const bg = await loadImg(currentPeriod().bg);
    if (bg) coverDraw(ctx, bg, 0, 0, W, PH);
    else { ctx.fillStyle = '#A9D8D2'; ctx.fillRect(0, 0, W, PH); }
    // bingkai tank (cover, seperti CSS)
    const tank = await loadImg('assets/aquarium/aquarium.png');
    if (tank) coverDraw(ctx, tank, 0, 0, W, PH);
    // ikan: ukuran & posisi persis seperti di layar
    for (const s of swimmers) {
      try {
        const im = s.img;
        if (!im.complete || !im.naturalWidth) continue;
        const r = im.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const fw = r.width * k, fh = r.height * k;
        const cx = (r.left + r.width / 2 - aqRect.left) * k;
        const cy = (r.top + r.height / 2 - aqRect.top) * k;
        ctx.save();
        ctx.translate(cx, cy);
        if (s.dir === -1) ctx.scale(-1, 1);
        ctx.drawImage(im, -fw / 2, -fh / 2, fw, fh);
        ctx.restore();
      } catch {}
    }
    // tint keruh: samakan rect + opacity asli dirt-overlay
    try {
      const ov = els.dirtOverlay;
      if (ov) {
        const alpha = parseFloat(getComputedStyle(ov).opacity) || 0;
        if (alpha > 0.01) {
          const r = ov.getBoundingClientRect();
          ctx.fillStyle = `rgba(110,70,30,${alpha.toFixed(3)})`;
          ctx.fillRect((r.left - aqRect.left) * k, (r.top - aqRect.top) * k, r.width * k, r.height * k);
        }
      }
    } catch {}
    return cv;
  }
  // Komposisi akhir polaroid: foto tank + strip caption (hanya untuk file PNG)
  function composePolaroid(tankCv) {
    const CAP = 150;
    const cv = document.createElement('canvas');
    cv.width = tankCv.width; cv.height = tankCv.height + CAP;
    const ctx = cv.getContext('2d');
    ctx.drawImage(tankCv, 0, 0);
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, tankCv.height, cv.width, CAP);
    ctx.fillStyle = '#4A4036';
    ctx.textAlign = 'center';
    ctx.font = '600 34px Nunito, sans-serif';
    ctx.fillText(t('photo_caption'), cv.width / 2, tankCv.height + 62);
    ctx.font = '700 28px Nunito, sans-serif';
    ctx.fillStyle = '#8B7D6B';
    ctx.fillText(wibStamp() + ' WIB', cv.width / 2, tankCv.height + 104);
    return cv;
  }
  // Nama lama dipertahankan untuk kompatibilitas (delegasi ke renderTankCanvas)
  async function renderPolaroidCanvas() { return renderTankCanvas(); }
  async function openPhotoMode() {
    if (state.screen !== 'aquarium') return;
    document.body.classList.add('photo-mode');
    if (els.photoOverlay) { els.photoOverlay.hidden = false; els.photoOverlay.setAttribute('aria-hidden', 'false'); }
    if (els.photoCaption) els.photoCaption.textContent = `${t('photo_caption')} — ${wibStamp()} WIB`;
    try {
      // Preview: foto tank saja (caption hanya tampil sekali via HTML di bawahnya)
      const tankCv = await renderTankCanvas();
      const url = tankCv.toDataURL('image/png');
      if (lastPhotoURL && lastPhotoURL.startsWith('blob:')) URL.revokeObjectURL(lastPhotoURL);
      lastPhotoURL = url;
      if (els.photoImg) els.photoImg.src = url;
      els.photoOverlay._tankCanvas = tankCv;
      els.photoOverlay._canvas = tankCv;
    } catch {}
  }
  function closePhotoMode() {
    document.body.classList.remove('photo-mode');
    if (els.photoOverlay) { els.photoOverlay.hidden = true; els.photoOverlay.setAttribute('aria-hidden', 'true'); }
  }
  async function savePhoto() {
    try {
      const tankCv = els.photoOverlay._tankCanvas || els.photoOverlay._canvas || await renderTankCanvas();
      const cv = composePolaroid(tankCv);
      cv.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `quiet-tank-polaroid-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    } catch {}
  }

  /* ---------- COZY D: FISH JOURNAL + NICKNAME ---------- */
  function openJournal() {
    renderJournal();
    els.journalModal?.setAttribute('aria-hidden', 'false');
  }
  function closeJournal() { els.journalModal?.setAttribute('aria-hidden', 'true'); }
  function renderJournal() {
    const list = els.journalList;
    if (!list) return;
    list.innerHTML = '';
    if (!state.fishList.length) {
      const p = document.createElement('p');
      p.className = 'journal-empty';
      p.textContent = t('journal_empty');
      list.appendChild(p);
      return;
    }
    state.fishList.forEach((f) => {
      const def = fishById(f.id);
      if (!def) return;
      const card = document.createElement('div');
      card.className = 'journal-card';
      const img = document.createElement('img');
      img.className = 'journal-sprite';
      img.alt = f.nickname || def.name;
      img.src = def.src;
      img.onerror = () => { img.src = def.originalSrc; };
      const info = document.createElement('div');
      info.className = 'journal-info';
      const row = document.createElement('div');
      row.className = 'journal-name-row';
      const nm = document.createElement('span');
      nm.className = 'journal-name';
      nm.textContent = f.nickname || def.name;
      const edit = document.createElement('button');
      edit.className = 'journal-edit-btn';
      edit.type = 'button';
      edit.textContent = '✏️';
      edit.setAttribute('aria-label', 'Edit nickname');
      edit.addEventListener('click', () => {
        row.innerHTML = '';
        const inp = document.createElement('input');
        inp.className = 'journal-nick-input';
        inp.maxLength = 20;
        inp.value = f.nickname || '';
        inp.placeholder = t('journal_nickname_ph');
        row.appendChild(inp);
        inp.focus();
        inp.select();
        const commit = async () => {
          const v = inp.value.trim().slice(0, 20);
          if (v) {
            f.nickname = v;
            await persist();
            renderFishList();
          }
          renderJournal();
        };
        inp.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') commit();
          if (ev.key === 'Escape') renderJournal();
          ev.stopPropagation();
        });
        inp.addEventListener('blur', commit);
      });
      row.appendChild(nm);
      row.appendChild(edit);
      const meta = document.createElement('div');
      meta.className = 'journal-meta';
      meta.innerHTML = '';
      const metaName = document.createElement('span');
      metaName.textContent = fishDisplayName(f.id);
      const metaDot = document.createTextNode(' • ');
      const metaRarity = document.createElement('span');
      metaRarity.textContent = '◆ ' + rarityLabel(f.rarity);
      metaRarity.style.color = rarityColor(f.rarity);
      metaRarity.style.fontWeight = '800';
      meta.append(metaName, metaDot, metaRarity);
      const trait = document.createElement('span');
      trait.className = 'journal-trait';
      trait.textContent = `✨ ${traitLabel(f.trait)}`;
      const got = document.createElement('div');
      got.className = 'journal-meta';
      got.textContent = `${t('journal_got')}: ${formatWIB(f.acquiredAt)}`;
      info.appendChild(row);
      info.appendChild(meta);
      info.appendChild(trait);
      info.appendChild(got);
      card.appendChild(img);
      card.appendChild(info);
      list.appendChild(card);
    });
  }
  async function saveNickname(instanceId, nickname) {
    const f = state.fishList.find(x => x.instanceId === instanceId);
    if (!f) return false;
    f.nickname = nickname.trim().slice(0, 20) || f.name;
    await persist();
    renderFishList();
    renderJournal();
    return true;
  }

  /* ---------- SETTINGS ---------- */
  function initSettings() {
    const modal = els.settingsModal;
    const open = () => {
      if (els.settingsUsername) els.settingsUsername.value = state.username || '';
      const a = getAudio();
      if (els.volumeSlider) els.volumeSlider.value = a.isMuted ? 0 : Math.round(a.volume * 100);
      if (els.volumeVal) els.volumeVal.textContent = `${els.volumeSlider?.value || 0}%`;
      if (els.usernameSaveMsg) els.usernameSaveMsg.hidden = true;
      modal?.setAttribute('aria-hidden', 'false');
    };
    const close = () => modal?.setAttribute('aria-hidden', 'true');
    els.settingsBtn?.addEventListener('click', (e) => { e.stopPropagation(); open(); });
    els.settingsCloseBtn?.addEventListener('click', close);
    els.settingsBackdrop?.addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); closeJournal(); closePhotoMode(); }
    });

    els.volumeSlider?.addEventListener('input', () => {
      const val = parseInt(els.volumeSlider.value, 10);
      const muted = val === 0;
      saveAudio({ volume: muted ? 0.18 : val / 100, isMuted: muted });
      if (els.volumeVal) els.volumeVal.textContent = `${val}%`;
      const bgm = els.bgm; if (!bgm) return;
      if (muted) { bgm.volume = 0; if (!bgm.paused) bgm.pause(); }
      else { bgm.volume = val / 100; if (bgm.paused && (state.screen === 'aquarium' || state.screen === 'gacha')) bgm.play().catch(() => {}); }
    });

    els.saveUsernameBtn?.addEventListener('click', async () => {
      const v = els.settingsUsername?.value.trim();
      if (!v) return;
      state.username = v; await persist();
      if (els.usernameSaveMsg) {
        els.usernameSaveMsg.textContent = t('username_updated');
        els.usernameSaveMsg.hidden = false;
        setTimeout(() => { els.usernameSaveMsg.hidden = true; }, 2500);
      }
    });

    document.querySelectorAll('.lang-btn[data-lang]').forEach((b) => {
      b.addEventListener('click', () => setLanguage(b.dataset.lang));
    });

    els.redeemCodeBtn?.addEventListener('click', handleRedeem);
    els.redeemCodeInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleRedeem(); } });

    els.replayIntroBtn?.addEventListener('click', () => { close(); playIntro(() => showAquarium()); });

    document.querySelectorAll('.ambient-btn').forEach((b) => {
      b.addEventListener('click', () => {
        setAmbientPref(b.dataset.ambient === 'on');
        refreshAmbientButtons();
        maybeStartAmbient();
      });
    });
    refreshAmbientButtons();

    els.logoutBtn?.addEventListener('click', async () => {
      try { if (fb) { const { signOut } = await import('./firebase-config.js'); void signOut; await fbSignOut(); } } catch {}
      if (unsubUser) { unsubUser(); unsubUser = null; }
      stopDecayInterval(); stopClaimTimer(); stopSwimLoop(); stopAmbient(); closePhotoMode();
      // Stop BGM on logout
      const bgm = els.bgm;
      if (bgm && !bgm.paused) { bgm.pause(); bgm.currentTime = 0; }
      Object.assign(state, {
        uid: null, username: '', role: 'user', fishList: [], hunger: 100, cleanliness: 100,
        foodStock: 5, claimedCodes: [], lastFeedTime: 0, lastClaimTime: 0,
      });
      close();
      switchAuth('login');
      // Clear form fields
      if (els.loginUsername) els.loginUsername.value = '';
      if (els.loginPassword) els.loginPassword.value = '';
      if (els.registerUsername) els.registerUsername.value = '';
      if (els.registerPassword) els.registerPassword.value = '';
      if (els.registerConfirm) els.registerConfirm.value = '';
      showWelcome();
    });
  }
  async function fbSignOut() {
    try {
      const authMod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      if (fb?.auth) await authMod.signOut(fb.auth);
    } catch {}
  }

  /* ---------- DRAWER ---------- */
  function initDrawer() {
    const tg = els.drawerToggle, d = els.sideDrawer;
    if (!tg || !d) return;
    tg.title = d.classList.contains('open') ? t('drawer_close') : t('drawer_open');
    tg.addEventListener('click', () => {
      const open = d.classList.toggle('open');
      d.classList.toggle('closed', !open);
      tg.setAttribute('aria-expanded', String(open));
      tg.title = open ? t('drawer_close') : t('drawer_open');
    });
    if (!d.classList.contains('open')) d.classList.add('open');
  }

  /* ---------- INIT ---------- */
  async function init() {
    preload();
    fb = await getFirebase();
    // Katalog dinamis: pakai fish_catalog Firestore saat tersedia.
    if (fb) subscribeCatalog(fb, (list) => { applyRemoteCatalog(list); });
    await bumpVisitor();
    initSettings(); initDrawer();

    // Auth switch
    els.switchToRegister?.addEventListener('click', () => switchAuth('register'));
    els.switchToLogin?.addEventListener('click', () => switchAuth('login'));
    switchAuth('login');

    // Prefill lokal agar user lama tinggal Continue (login)
    const local = !isFirebaseConfigured ? readLocal() : null;
    if (local && els.loginUsername) els.loginUsername.value = local.username;

    els.loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = els.loginUsername?.value.trim(), p = els.loginPassword?.value;
      if (!u || !p) return;
      try {
        if (fb) {
          const cred = await fb.signInWithEmailAndPassword(fb.auth, usernameToEmail(u), p);
          const err = await afterAuth(cred.user.uid, u, false);
          if (err) showError(els.loginError, err);
        } else {
          const err = await afterAuth(null, u, false);
          if (err) showError(els.loginError, err);
        }
      } catch (err) {
        showError(els.loginError, t('err_login'));
      }
    });

    els.registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = els.registerUsername?.value.trim(), p = els.registerPassword?.value, c = els.registerConfirm?.value;
      if (!u || !p) return;
      if (p.length < 6) { showError(els.registerError, t('err_register_short')); return; }
      if (p !== c) { showError(els.registerError, t('err_register_mismatch')); return; }
      try {
        if (fb) {
          const cred = await fb.createUserWithEmailAndPassword(fb.auth, usernameToEmail(u), p);
          await afterAuth(cred.user.uid, u, true);
        } else {
          const existing = readLocal();
          if (existing && existing.username.toLowerCase() === u.toLowerCase()) {
            showError(els.registerError, t('err_register_local_taken'));
            return;
          }
          await afterAuth(null, u, true);
        }
      } catch (err) {
        const msg = String(err?.code || '').includes('email-already') ? t('err_register_taken') : t('err_register_fail');
        showError(els.registerError, msg);
      }
    });

    // Gacha: undi dari fish_catalog sesuai bobot rarity
    // (Common 50%, Rare 30%, Epic 13%, Legendary 6%, Heaven 1%).
    let pendingFish = null;
    els.gachaBtn?.addEventListener('click', () => {
      pendingFish = rollFishFromCatalog(fishCatalog) || fishCatalog[0] || FISH_DEFS[0];
      if (!pendingFish) return;
      const displayName = fishDisplayName(pendingFish.id);
      const rColor = rarityColor(pendingFish.rarity);
      const rLabel = rarityLabel(pendingFish.rarity);
      const heavenClass = pendingFish.rarity === 'Heaven' ? ' gacha-heaven' : '';
      els.gachaResult.innerHTML =
        `<div class="gacha-reveal${heavenClass}" style="display:flex;flex-direction:column;align-items:center;gap:8px">` +
        `<img class="gacha-fish" src="${pendingFish.src}" alt="${displayName}" onerror="this.onerror=null;this.src='${pendingFish.originalSrc}'">` +
        `<div class="gacha-fish-name">${displayName}</div>` +
        `<div class="gacha-fish-rarity" style="color:${rColor}">◆ ${rLabel}</div></div>`;
      els.gachaBtn.hidden = true; els.keepFishBtn.hidden = false;
    });
    els.keepFishBtn?.addEventListener('click', async () => {
      if (pendingFish) {
        state.fishList.push(makeFishEntry(pendingFish));
        pendingFish = null;
        await persist();
      }
      playBGM(); showAquarium();
    });

    els.feedBtn?.addEventListener('click', feedFish);
    els.claimFoodBtn?.addEventListener('click', claimFood);
    els.snapBtn?.addEventListener('click', openPhotoMode);
    els.journalBtn?.addEventListener('click', openJournal);
    els.journalCloseBtn?.addEventListener('click', closeJournal);
    els.journalBackdrop?.addEventListener('click', closeJournal);
    els.photoBackBtn?.addEventListener('click', closePhotoMode);
    els.photoSaveBtn?.addEventListener('click', savePhoto);

    // Audio awal
    const a0 = getAudio();
    if (els.bgm) els.bgm.volume = a0.isMuted ? 0 : clamp(a0.volume, 0, 1);

    // i18n awal: terapkan bahasa tersimpan sebelum splash
    applyStaticI18n();
    updateClaimButton();

    // Alur: splash (klik tombol mulai) -> intro video -> welcome (login/register)
    showSplash(() => {
      playIntro(() => showWelcome());
    });

    // Visibility: hemat timer + terapkan decay saat kembali
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) { await persist(); stopDecayInterval(); stopClaimTimer(); stopSwimLoop(); }
      else if (state.screen === 'aquarium') {
        if (fb && state.uid) { const d = await loadUserDoc(state.uid); if (d) applySaveToState({ ...d, username: state.username }); }
        else { const l = readLocal(); if (l) applySaveToState(l); }
        updateStatusBars(); startDecayInterval(); startClaimTimer(); startSwimLoop();
      }
    });
    window.addEventListener('beforeunload', () => { persist(); });

    document.addEventListener('visibilitychange', () => {
      const bgm = els.bgm; if (!bgm) return;
      if (document.hidden) { if (!bgm.paused) bgm.pause(); stopAmbient(); }
      else if (state.screen === 'aquarium') { playBGM(); maybeStartAmbient(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
