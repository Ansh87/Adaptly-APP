// Shared Firebase ID token verification for Netlify Functions (server-side
// only — the underscore prefix keeps Netlify from treating this file as its
// own function endpoint).
//
// Protects /api/plan and /api/tutor from anonymous/scripted use: both spend a
// Gemini call, so both must confirm the caller is a real, currently
// signed-in SATGene user before doing anything else.
//
// Required Netlify environment variables (Site settings → Environment
// variables), from a Firebase service account (Firebase console → Project
// settings → Service accounts → Generate new private key):
//   FIREBASE_ADMIN_PROJECT_ID
//   FIREBASE_ADMIN_CLIENT_EMAIL
//   FIREBASE_ADMIN_PRIVATE_KEY   (paste the key as-is; this file converts the
//                                 literal "\n" sequences Netlify stores it
//                                 with back into real newlines)
//
// Security notes:
//   - The UID this returns comes ONLY from a cryptographically verified ID
//     token. Nothing supplied directly by the browser (query params, body
//     fields, headers other than the token itself) is ever trusted as a UID.
//   - The raw token is never logged, only verification failure reasons.
//   - Service-account credentials never leave this server-side module.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminAppSingleton = null;

function adminApp() {
  if (adminAppSingleton) return adminAppSingleton;
  if (getApps().length) {
    adminAppSingleton = getApps()[0];
    return adminAppSingleton;
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are not configured (FIREBASE_ADMIN_PROJECT_ID / " +
      "FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY)."
    );
  }
  adminAppSingleton = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return adminAppSingleton;
}

// Returns { uid } for a valid, current SATGene sign-in, or null otherwise.
// Callers should respond 401 when this returns null. Never throws for a bad
// or missing token — only throws if the server itself isn't configured
// (missing env vars), which callers should treat as a 500.
export async function verifyRequestAuth(req) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const app = adminApp(); // throws if unconfigured — let the caller's try/catch handle it as 500
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    return { uid: decoded.uid };
  } catch (e) {
    console.error("[auth] ID token verification failed:", e?.code || e?.message || "unknown error");
    return null;
  }
}
