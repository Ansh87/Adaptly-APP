// Firebase client setup for SATGene.
// These values are NOT secrets — Firebase web config is meant to be public.
// Real security comes from Firestore Security Rules (see firestore.rules) and
// from enabling only the sign-in methods you want in the Firebase console.
//
// The values below are read from Vite environment variables so you don't hard-code
// them. In Netlify, add each VITE_FIREBASE_* variable (Site settings → Environment
// variables). For local dev, put them in a .env file (gitignored).

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// True only when the required config values are present. When they're not (no
// .env locally, or a Netlify deploy missing its environment variables), the app
// must NOT hard-crash on a blank screen — real sign-in just becomes unavailable,
// with a clear message, and Demo Student mode keeps working since it never
// touches Firebase at all.
export const firebaseReady = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

let app = null;
let authInstance = null;
let dbInstance = null;
let googleProvider = null;

if (firebaseReady) {
  try {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    // Never let a bad config crash the whole app — log it and keep everything
    // else (Demo mode, static pages) working.
    console.error("Firebase failed to initialize:", e);
    authInstance = null;
    dbInstance = null;
  }
}

export const auth = authInstance;
export const db = dbInstance;

// A consistent, catchable error for every auth helper below when Firebase isn't
// configured — Login.jsx already maps auth error codes to friendly messages, so
// this slots into that same path instead of throwing something unhandled.
function notConfiguredError() {
  const err = new Error("Sign-in isn't available: Firebase isn't configured for this environment.");
  err.code = "auth/not-configured";
  return Promise.reject(err);
}

// --- Auth helpers ---
export const loginWithGoogle = () => (auth ? signInWithPopup(auth, googleProvider) : notConfiguredError());
export const signUpWithEmail = (email, password) =>
  auth ? createUserWithEmailAndPassword(auth, email, password) : notConfiguredError();
export const loginWithEmail = (email, password) =>
  auth ? signInWithEmailAndPassword(auth, email, password) : notConfiguredError();
export const logout = () => (auth ? signOut(auth) : Promise.resolve());
// If there's no configured auth instance, immediately report "signed out" so the
// app renders the Login screen (with Demo Student available) instead of hanging
// on a loading spinner forever.
export const watchAuth = (cb) => {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
};
export const resetPassword = (email) => (auth ? sendPasswordResetEmail(auth, email) : notConfiguredError());

// Fresh Firebase ID token for the current signed-in user, or null if nobody is
// signed in (Demo Student mode included — demo never calls real Firebase auth,
// so auth.currentUser is always null there). Frontend calls to /api/plan and
// /api/tutor attach this as "Authorization: Bearer <token>" so those server
// functions can verify a real SATGene sign-in before spending a Gemini call.
export async function getIdToken() {
  if (!auth || !auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

// --- Firestore per-user data ---
// Each user's SATGene data lives at users/{uid}. Security rules restrict access
// so a signed-in user can only read/write their own document.
export async function loadUserData(uid) {
  if (!db) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveUserData(uid, data) {
  if (!db) return;
  const ref = doc(db, "users", uid);
  await setDoc(ref, data, { merge: true });
}

// --- Account deletion ---
// Removes the user's Firestore document, then deletes their Firebase auth account.
// Firebase requires a RECENT login to delete an account; if it's been too long it
// throws "auth/requires-recent-login". The caller catches that and re-authenticates.
export async function deleteUserDataDoc(uid) {
  if (!db) return;
  await deleteDoc(doc(db, "users", uid));
}

export async function deleteAccount() {
  if (!auth) throw Object.assign(new Error("Sign-in isn't available in this environment."), { code: "auth/not-configured" });
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");
  // Delete Firestore data first so nothing is orphaned if auth deletion succeeds.
  await deleteUserDataDoc(user.uid);
  await deleteUser(user);
}

// Re-authenticate before a sensitive action (used when delete needs a fresh login).
export async function reauthenticate(passwordIfEmail) {
  if (!auth) throw Object.assign(new Error("Sign-in isn't available in this environment."), { code: "auth/not-configured" });
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");
  const isGoogle = user.providerData.some((p) => p.providerId === "google.com");
  if (isGoogle) {
    await reauthenticateWithPopup(user, googleProvider);
  } else {
    if (!passwordIfEmail) throw new Error("Password required to confirm.");
    const cred = EmailAuthProvider.credential(user.email, passwordIfEmail);
    await reauthenticateWithCredential(user, cred);
  }
}
