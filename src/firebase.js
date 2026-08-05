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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Auth helpers ---
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signUpWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

// --- Firestore per-user data ---
// Each user's SATGene data lives at users/{uid}. Security rules restrict access
// so a signed-in user can only read/write their own document.
export async function loadUserData(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveUserData(uid, data) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, data, { merge: true });
}
