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

// --- Account deletion ---
// Removes the user's Firestore document, then deletes their Firebase auth account.
// Firebase requires a RECENT login to delete an account; if it's been too long it
// throws "auth/requires-recent-login". The caller catches that and re-authenticates.
export async function deleteUserDataDoc(uid) {
  await deleteDoc(doc(db, "users", uid));
}

export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");
  // Delete Firestore data first so nothing is orphaned if auth deletion succeeds.
  await deleteUserDataDoc(user.uid);
  await deleteUser(user);
}

// Re-authenticate before a sensitive action (used when delete needs a fresh login).
export async function reauthenticate(passwordIfEmail) {
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
