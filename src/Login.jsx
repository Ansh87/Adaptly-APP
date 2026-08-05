import React, { useState } from "react";
import {
  loginWithGoogle,
  loginWithEmail,
  signUpWithEmail,
  resetPassword,
} from "./firebase";

// Shared look tokens (kept local so Login is self-contained)
const C = {
  ink: "#12203A",
  ink2: "#31445F",
  paper: "#F5F2EB",
  card: "#FFFFFF",
  line: "#E4DFD2",
  accent: "#2F6F5B",
  soft: "#EDE8DC",
};
const FONT_DISPLAY = '"Fraunces", "Georgia", serif';
const FONT_BODY = '"Inter", system-ui, -apple-system, sans-serif';

// Turn Firebase error codes into plain-English messages.
function friendlyError(code) {
  const map = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-not-found": "No account with that email. Try signing up.",
    "auth/wrong-password": "Incorrect password. Try again or reset it.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with that email. Try signing in.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the popup. Allow popups and retry.",
    "auth/unauthorized-domain": "This site's domain isn't authorized in Firebase yet.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

export default function Login() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const doGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setBusy(false);
    }
  };

  const doEmail = async () => {
    setError(null);
    setNotice(null);
    if (!email || !password) {
      setError("Enter both email and password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") await signUpWithEmail(email, password);
      else await loginWithEmail(email, password);
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email above first, then click reset.");
      return;
    }
    try {
      await resetPassword(email);
      setNotice("Password reset email sent. Check your inbox.");
    } catch (e) {
      setError(friendlyError(e.code));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FONT_BODY, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 34, letterSpacing: -0.5 }}>
            SATGene
          </div>
          <div style={{ fontSize: 14, color: C.ink2, marginTop: 6 }}>
            Sign in to save your practice tests and track your progress.
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24 }}>
          <button onClick={doGoogle} disabled={busy} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.ink }}>
            <GoogleIcon /> Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: C.ink2, fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: C.line }} />
            or
            <div style={{ flex: 1, height: 1, background: C.line }} />
          </div>

          <label style={lbl}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} placeholder="student@example.com" autoComplete="email" />

          <label style={lbl}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doEmail()} style={inp} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} />

          {error && <div style={{ ...msg, background: "#FBEAE8", color: "#B4443A", border: "1px solid #E3B7B3" }}>{error}</div>}
          {notice && <div style={{ ...msg, background: "#E7F1EC", color: C.accent, border: "1px solid #BFDDCF" }}>{notice}</div>}

          <button onClick={doEmail} disabled={busy} style={{ width: "100%", marginTop: 14, padding: "12px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontSize: 15, fontWeight: 700 }}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 13 }}>
            <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); setNotice(null); }} style={linkBtn}>
              {mode === "signup" ? "Have an account? Sign in" : "New here? Create account"}
            </button>
            {mode === "signin" && <button onClick={doReset} style={linkBtn}>Forgot password?</button>}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: C.ink2, marginTop: 16, lineHeight: 1.5 }}>
          Your data is tied to your account and synced across devices.
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.9 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16z" />
      <path fill="#FBBC05" d="M10.5 28.3c-.5-1.4-.7-2.8-.7-4.3s.3-2.9.7-4.3l-7.9-6.1C1 16.7 0 20.2 0 24s1 7.3 2.6 10.4l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.4-4.6 2.2-8.1 2.2-6.3 0-11.7-3.7-13.5-9.8l-7.9 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}

const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: C.ink2, marginBottom: 5, marginTop: 12 };
const inp = { width: "100%", padding: "11px 12px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 15, background: "#fff", color: C.ink, outline: "none", boxSizing: "border-box", fontFamily: FONT_BODY };
const msg = { marginTop: 12, padding: "9px 12px", borderRadius: 9, fontSize: 13 };
const linkBtn = { background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 };
