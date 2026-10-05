// Firebase Configuration — A Quite Tank (revisi 1.md)
// Isi dengan config project Firebase Anda. Selama masih placeholder,
// game otomatis memakai mode lokal (localStorage) agar tetap playable.
export const firebaseConfig = {
  apiKey: "AIzaSyAYoe01Bi8HeRfNIl0ta8Q0qIh1UOJ2jak",
  authDomain: "a-quite-tank-in-jakarta.firebaseapp.com",
  projectId: "a-quite-tank-in-jakarta",
  storageBucket: "a-quite-tank-in-jakarta.firebasestorage.app",
  messagingSenderId: "918508289180",
  appId: "1:918508289180:web:dee799b5ed459951f78159",
  measurementId: "G-7CS9JXHWVJ"
};

export const isFirebaseConfigured =
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  !firebaseConfig.projectId.includes("YOUR_PROJECT");

let _mods = null;

async function loadModules() {
  if (_mods) return _mods;
  // Import full CDN URLs (Firebase v12.1.0)
  const appMod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
  const authMod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
  const fsMod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
  const analyticsMod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js').catch(() => null);

  // Pakai instance app yang sudah diinisialisasi oleh script CDN di index.html, atau buat baru jika belum
  const app = (appMod.getApps && appMod.getApps().length > 0)
    ? appMod.getApp()
    : (window.__firebaseApp || appMod.initializeApp(firebaseConfig));

  let analytics = window.__firebaseAnalytics || null;
  if (!analytics && analyticsMod?.getAnalytics) {
    try { analytics = analyticsMod.getAnalytics(app); } catch {}
  }

  _mods = {
    app,
    analytics,
    auth: authMod.getAuth(app),
    db: fsMod.getFirestore(app),
    createUserWithEmailAndPassword: authMod.createUserWithEmailAndPassword,
    signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
    signOut: authMod.signOut,
    onAuthStateChanged: authMod.onAuthStateChanged,
    doc: fsMod.doc,
    getDoc: fsMod.getDoc,
    setDoc: fsMod.setDoc,
    addDoc: fsMod.addDoc,
    updateDoc: fsMod.updateDoc,
    deleteDoc: fsMod.deleteDoc,
    serverTimestamp: fsMod.serverTimestamp,
    arrayUnion: fsMod.arrayUnion,
    increment: fsMod.increment,
    collection: fsMod.collection,
    getDocs: fsMod.getDocs,
    onSnapshot: fsMod.onSnapshot,
    query: fsMod.query,
    orderBy: fsMod.orderBy,
    writeBatch: fsMod.writeBatch,
  };
  return _mods;
}

export async function getFirebase() {
  if (!isFirebaseConfigured) return null;
  try {
    return await loadModules();
  } catch (e) {
    console.warn('Firebase init gagal, fallback lokal:', e);
    return null;
  }
}

// Username -> email sintetis agar Auth tetap email/password
// sementara pemain hanya mengetik Username + Password.
export function usernameToEmail(username) {
  return `${String(username).trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_')}@quiet-tank.local`;
}
