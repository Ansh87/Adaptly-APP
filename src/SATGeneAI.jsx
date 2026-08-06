import React, { useState, useMemo, useEffect } from "react";
import Login from "./Login.jsx";
import { watchAuth, logout, loadUserData, saveUserData, deleteAccount, reauthenticate } from "./firebase";

/**
 * SATGene — Digital SAT Practice, Analytics & Study Planner
 * -----------------------------------------------------------------
 * DESIGN NOTE ON "PULLING TESTS FROM VENDORS":
 * You cannot legally copy questions from Bluebook, Khan Academy,
 * College Board Question Bank, UWorld, Kaplan, or Princeton Review.
 * None expose a public content API, and their questions are
 * copyrighted (College Board treats test-prep use as commercial).
 * So SATGene does NOT reinvent the test. It is the HUB + TRACKER
 * + ANALYTICS + AI PLANNER layer. The student LAUNCHES the real
 * official test (Bluebook is the actual SAT engine), then logs
 * results here for analysis. The one place we can add our own
 * questions later is an ORIGINAL, reviewed question bank (Phase 2).
 *
 * Data persistence uses in-memory React state only (artifact sandbox
 * blocks localStorage). Swap to your Node/SQLite backend on Railway.
 */

// ---------- Official + vendor practice catalog (links only, no copied content) ----------
const PROVIDERS = [
  {
    id: "bluebook",
    name: "College Board — Bluebook",
    tier: "official",
    cost: "Free",
    tests: "6+ full-length adaptive",
    realism: 100,
    note: "The actual test-day app. The single most realistic practice you can do. Scored automatically; results feed My Practice + Khan review.",
    url: "https://bluebook.collegeboard.org/students/download-bluebook",
    best: "Every student, always. Do these first.",
  },
  {
    id: "mypractice",
    name: "College Board — My Practice",
    tier: "official",
    cost: "Free",
    tests: "Score reports + Tailored Practice",
    realism: 100,
    note: "Where Bluebook scores land. Tailored Practice pulls real questions from the official Student Question Bank based on your results.",
    url: "https://mypractice.collegeboard.org",
    best: "Reviewing what you missed after each Bluebook test.",
  },
  {
    id: "sqb",
    name: "Student Question Bank",
    tier: "official",
    cost: "Free",
    tests: "Thousands of real questions",
    realism: 98,
    note: "Filter thousands of official questions by section, domain, skill, and difficulty. Best targeted drilling anywhere.",
    url: "https://satsuite.collegeboard.org/digital/digital-practice-preparation/student-question-bank",
    best: "Drilling a specific weak skill.",
  },
  {
    id: "khan",
    name: "Khan Academy — Official SAT Prep",
    tier: "official",
    cost: "Free",
    tests: "Lessons + per-question walkthroughs",
    realism: 90,
    note: "Built with College Board. NOTE: Khan no longer hosts full-length tests — those moved to Bluebook. Khan now gives lessons, hints, and a walkthrough of every question on your Bluebook test.",
    url: "https://www.khanacademy.org/digital-sat",
    best: "Learning the concept behind a missed question.",
  },
  {
    id: "schoolhouse",
    name: "Schoolhouse.world Bootcamps",
    tier: "official",
    cost: "Free",
    tests: "Live 4-week small-group tutoring",
    realism: 85,
    note: "Official College Board partner. Free live peer tutoring from students who recently scored high.",
    url: "https://schoolhouse.world/tutoring/sat-bootcamps",
    best: "Students who want live human help for free.",
  },
  {
    id: "paper",
    name: "Official Paper Practice (PDF)",
    tier: "official",
    cost: "Free",
    tests: "Linear PDF forms",
    realism: 70,
    note: "Non-adaptive PDF versions. Good for offline/accommodations practice, but not the adaptive digital experience.",
    url: "https://satsuite.collegeboard.org/practice/practice-tests/paper",
    best: "Offline practice or paper accommodations.",
  },
  {
    id: "uworld",
    name: "UWorld",
    tier: "paid",
    cost: "~$99+/subscription",
    tests: "1,650+ Q-bank + full-length",
    realism: 88,
    note: "Widely rated the best paid QBank for realism and explanation depth. Interface mirrors the digital SAT. Self-directed (no live classes).",
    url: "https://collegeprep.uworld.com/sat/",
    best: "Self-driven students who exhausted official practice.",
  },
  {
    id: "princeton",
    name: "The Princeton Review",
    tier: "paid",
    cost: "Free test + paid courses",
    tests: "Free adaptive test + course tests",
    realism: 80,
    note: "Free full-length adaptive practice test with Desmos + annotation tools. Paid tiers add live classes. Difficulty can run slightly high.",
    url: "https://www.princetonreview.com/college/free-digitalsat-practice-test",
    best: "A free second opinion + students who want live classes.",
  },
  {
    id: "kaplan",
    name: "Kaplan",
    tier: "paid",
    cost: "~$200+ courses",
    tests: "4 full-length + 500+ Q-bank",
    realism: 80,
    note: "Strong video lessons and structured courses. 4 full-length digital tests. Better as a guided course than a standalone QBank.",
    url: "https://www.kaptest.com/sat",
    best: "Students who want structure and video instruction.",
  },
  {
    id: "magoosh",
    name: "Magoosh",
    tier: "paid",
    cost: "~$130",
    tests: "Q-bank + video lessons",
    realism: 78,
    note: "Budget-friendly with lots of resources and good tracking. Great value for self-study.",
    url: "https://magoosh.com/sat/",
    best: "Budget-conscious self-studiers.",
  },
];

// ---------- Real Digital SAT structure (from College Board) ----------
const SAT_STRUCTURE = {
  totalMinutes: 134,
  modules: [
    { name: "Reading & Writing — Module 1", q: 27, min: 32, adaptive: "medium" },
    { name: "Reading & Writing — Module 2", q: 27, min: 32, adaptive: "adaptive" },
    { name: "Break", q: 0, min: 10, adaptive: "break" },
    { name: "Math — Module 1", q: 22, min: 35, adaptive: "medium" },
    { name: "Math — Module 2", q: 22, min: 35, adaptive: "adaptive" },
  ],
};

const SKILLS = {
  "Reading & Writing": [
    "Information and Ideas",
    "Craft and Structure",
    "Expression of Ideas",
    "Standard English Conventions",
  ],
  Math: [
    "Algebra",
    "Advanced Math",
    "Problem-Solving and Data Analysis",
    "Geometry and Trigonometry",
  ],
};

// ---------- Design tokens ----------
const C = {
  ink: "#12203A",
  ink2: "#31445F",
  paper: "#F5F2EB",
  card: "#FFFFFF",
  line: "#E4DFD2",
  accent: "#2F6F5B", // deep pine — "growth"
  accent2: "#C6862F", // amber
  official: "#2F6F5B",
  paid: "#8A5A9B",
  soft: "#EDE8DC",
};

const FONT_DISPLAY = '"Fraunces", "Georgia", serif';
const FONT_BODY = '"Inter", system-ui, -apple-system, sans-serif';

// ---------- Default seed data for brand-new accounts ----------
// Once a user signs in, their real data loads from Firestore. These defaults only
// show for a fresh account with no saved document yet.
const DEFAULT_PROFILE = { name: "", fullName: "", gradYear: "", school: "", timezone: "" };
// Goal now separates official SAT from practice, with independent targets and dates.
// legacyCurrent preserves the old single "current score" WITHOUT treating it as an
// official SAT result (its source can't be verified — see spec section 7).
const DEFAULT_GOAL = {
  satTarget: 1550,
  practiceTarget: 1500,
  nextSatDate: "",
  nextPracticeDate: "",
  legacyCurrent: null,
};
// Attempts now carry a testType: "SAT" (official) or "Practice".
const DEFAULT_ATTEMPTS = [];
// Mistakes now carry a testType as well.
const DEFAULT_MISTAKES = [];
// Saved study plans (history). Never auto-overwritten.
const DEFAULT_PLANS = [];

// Migrate an older saved document to the new shape. Pure function, no side effects.
function migrateUserData(data) {
  if (!data) return null;
  const out = { ...data };

  // Goal migration: map old { current, target, testDate } into the new fields
  // without asserting the old current was an official SAT.
  const g = data.goal || {};
  out.goal = {
    satTarget: g.satTarget ?? g.target ?? DEFAULT_GOAL.satTarget,
    practiceTarget: g.practiceTarget ?? DEFAULT_GOAL.practiceTarget,
    nextSatDate: g.nextSatDate ?? "",
    nextPracticeDate: g.nextPracticeDate ?? g.testDate ?? "",
    legacyCurrent: g.legacyCurrent ?? g.current ?? null,
  };

  // Attempts: anything without a testType predates the field and was, by design,
  // a practice-test tracker — so it becomes "Practice".
  out.attempts = Array.isArray(data.attempts)
    ? data.attempts.map((a) => ({ ...a, testType: a.testType || "Practice" }))
    : [];

  // Mistakes: same default.
  out.mistakes = Array.isArray(data.mistakes)
    ? data.mistakes.map((m) => ({ ...m, testType: m.testType || "Practice" }))
    : [];

  out.plans = Array.isArray(data.plans) ? data.plans : [];
  return out;
}

// ---- Score helpers (single source of truth for header + planners) ----
const totalOf = (a) => (Number(a.rw) || 0) + (Number(a.math) || 0);
const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

function latestOfType(attempts, type) {
  return attempts.filter((a) => a.testType === type).sort(byDateDesc)[0] || null;
}
// Header "Latest Score" priority: most recent official SAT, else most recent practice.
function headerLatest(attempts) {
  const sat = latestOfType(attempts, "SAT");
  if (sat) return { attempt: sat, source: "Official SAT" };
  const prac = latestOfType(attempts, "Practice");
  if (prac) return { attempt: prac, source: "Practice Score" };
  return { attempt: null, source: null };
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

// ---- Superscore: highest section scores across OFFICIAL SAT records only. ----
// Requires >= 2 official SAT records. On a tie for a section's best score, use the
// most recent official test date. Practice tests are never included. Returns null
// when fewer than 2 official SAT records exist.
function computeSuperscore(attempts) {
  const sats = attempts.filter((a) => a.testType === "SAT");
  if (sats.length < 2) return null;

  const pickBest = (field) => {
    let best = null;
    for (const a of sats) {
      const v = Number(a[field]) || 0;
      if (
        best === null ||
        v > best.value ||
        (v === best.value && new Date(a.date) > new Date(best.date)) // tie → most recent
      ) {
        best = { value: v, date: a.date };
      }
    }
    return best;
  };

  const rw = pickBest("rw");
  const math = pickBest("math");
  return { rw: rw.value, rwDate: rw.date, math: math.value, mathDate: math.date, total: rw.value + math.value };
}

// ================================================================
export default function SATGeneAI() {
  const [authState, setAuthState] = useState("loading"); // loading | out | in
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = watchAuth((u) => {
      setUser(u);
      setAuthState(u ? "in" : "out");
    });
    return unsub;
  }, []);

  if (authState === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, color: C.ink2 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 30 }}>SATGene</div>
          <div style={{ marginTop: 10, fontSize: 14 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (authState === "out") return <Login />;

  return <AppShell user={user} />;
}

function AppShell({ user }) {
  const [tab, setTab] = useState("hub");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [attempts, setAttempts] = useState(DEFAULT_ATTEMPTS);
  const [mistakes, setMistakes] = useState(DEFAULT_MISTAKES);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncState, setSyncState] = useState("idle"); // idle | saving | saved | error

  // Load this user's data from Firestore once on sign-in, migrating older shapes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await loadUserData(user.uid);
        if (cancelled) return;
        const data = migrateUserData(raw);
        if (data) {
          if (data.profile) setProfile({ ...DEFAULT_PROFILE, ...data.profile });
          if (data.goal) setGoal({ ...DEFAULT_GOAL, ...data.goal });
          if (Array.isArray(data.attempts)) setAttempts(data.attempts);
          if (Array.isArray(data.mistakes)) setMistakes(data.mistakes);
          if (Array.isArray(data.plans)) setPlans(data.plans);
        }
        // If no data doc exists yet, the defaults stay and get saved on first change.
      } catch (e) {
        console.error("Load failed:", e);
      } finally {
        if (!cancelled) setDataLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user.uid]);

  // Save to Firestore whenever data changes (after the initial load completes).
  useEffect(() => {
    if (!dataLoaded) return;
    setSyncState("saving");
    const t = setTimeout(async () => {
      try {
        await saveUserData(user.uid, { profile, goal, attempts, mistakes, plans });
        setSyncState("saved");
      } catch (e) {
        console.error("Save failed:", e);
        setSyncState("error");
      }
    }, 600); // debounce so rapid edits don't spam writes
    return () => clearTimeout(t);
  }, [profile, goal, attempts, mistakes, plans, dataLoaded, user.uid]);

  // Resolve the display name: student-entered name first, then Google name, else "Student".
  const displayName =
    (profile.name && profile.name.trim()) ||
    (user.displayName && user.displayName.trim()) ||
    "Student";

  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: FONT_BODY, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        .sg-tab { transition: all .15s ease; }
        .sg-tab:hover { color: ${C.ink}; }
        .sg-card { transition: transform .15s ease, box-shadow .15s ease; }
        .sg-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(18,32,58,.10); }
        input, select, textarea { font-family: inherit; }
        a { color: ${C.accent}; }
        .sg-focus:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; border-radius: 6px; }
        @media (max-width: 560px){ .sg-name-text { display: none; } }
        @media (prefers-reduced-motion: reduce){ .sg-card, .sg-tab { transition: none; } }
      `}</style>

      <Header attempts={attempts} goal={goal} user={user} syncState={syncState} displayName={displayName} setTab={setTab} />

      <Nav tab={tab} setTab={setTab} />

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 40px" }}>
        {tab === "hub" && <Hub />}
        {tab === "tracker" && <Tracker attempts={attempts} setAttempts={setAttempts} />}
        {tab === "mistakes" && <Mistakes mistakes={mistakes} setMistakes={setMistakes} attempts={attempts} />}
        {tab === "analytics" && <Analytics attempts={attempts} mistakes={mistakes} goal={goal} />}
        {tab === "planner" && (
          <Planner
            attempts={attempts} mistakes={mistakes} goal={goal} setGoal={setGoal}
            plans={plans} setPlans={setPlans} setTab={setTab}
          />
        )}
        {tab === "sim" && <Simulator />}
        {tab === "more" && (
          <MorePage
            user={user} displayName={displayName} syncState={syncState}
            profile={profile} setProfile={setProfile}
            goal={goal} setGoal={setGoal}
            attempts={attempts} mistakes={mistakes} plans={plans}
            setAttempts={setAttempts} setMistakes={setMistakes} setPlans={setPlans}
          />
        )}
      </main>

      <footer style={{ borderTop: `1px solid ${C.line}`, padding: "16px 20px", textAlign: "center", fontSize: 12.5, color: C.ink2 }}>
        © 2026 SATGene
      </footer>
    </div>
  );
}

// ---------- Header ----------
function Header({ goal, attempts, user, syncState, displayName, setTab }) {
  const { latest, source } = useMemo(() => {
    const r = headerLatest(attempts);
    return { latest: r.attempt, source: r.source };
  }, [attempts]);

  const superscore = useMemo(() => computeSuperscore(attempts), [attempts]);

  const days = daysUntil(goal.nextSatDate);
  const daysValue = days == null ? "Not scheduled" : days > 0 ? days : days === 0 ? "Today" : "Passed";
  const daysAccent = days != null && days <= 30 && days >= 0 ? C.accent2 : C.accent;

  const latestScore = latest ? totalOf(latest) : null;
  const target = goal.satTarget;

  // Gap: prefer superscore when available, else latest score.
  const gapBasisScore = superscore ? superscore.total : latestScore;
  const gapBasisLabel = superscore ? "Based on superscore" : latestScore != null ? "Based on latest score" : null;
  let gapValue, gapAccent;
  if (gapBasisScore == null) {
    gapValue = "—"; gapAccent = C.ink2;
  } else if (gapBasisScore >= target) {
    gapValue = "Target reached"; gapAccent = C.accent;
  } else {
    gapValue = `${target - gapBasisScore} pts`; gapAccent = C.ink2;
  }

  const fmtShort = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return d; } };

  return (
    <header style={{ borderBottom: `1px solid ${C.line}`, background: C.card }}>
      {/* account bar — light, no pill */}
      <div style={{ background: C.card }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "10px 20px 4px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
          <SaveStatus syncState={syncState} />
          <span style={{ width: 1, height: 18, background: C.line }} aria-hidden="true" />
          <AccountArea user={user} displayName={displayName} setTab={setTab} />
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 20px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 30, letterSpacing: -0.5, lineHeight: 1 }}>
            SATGene
          </div>
          <div style={{ fontSize: 13, color: C.ink2, marginTop: 6 }}>
            Digital SAT practice hub · analytics · study planner
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Stat label="Days to SAT Test" value={daysValue} accent={daysAccent} small={days == null} />
          <Stat label="Latest Score" value={latestScore == null ? "No score" : latestScore} sub={source} small={latestScore == null} />
          <SuperscoreStat superscore={superscore} fmtShort={fmtShort} />
          <Stat label="Target" value={target} />
          <Stat label="Gap" value={gapValue} accent={gapAccent} sub={gapBasisLabel} small={gapValue === "Target reached"} />
        </div>
      </div>
    </header>
  );
}

// Superscore header card (wider, two-line detail)
function SuperscoreStat({ superscore, fmtShort }) {
  if (!superscore) {
    return (
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 14px", minWidth: 120, background: C.paper }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.ink2 }}>Superscore</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, color: C.ink2, lineHeight: 1.15, marginTop: 3 }}>Not available</div>
        <div style={{ fontSize: 10.5, color: C.ink2, marginTop: 2 }}>Requires 2 SAT tests</div>
      </div>
    );
  }
  return (
    <div style={{ border: `1px solid ${C.accent}`, borderRadius: 12, padding: "8px 14px", minWidth: 150, background: C.paper }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.accent, fontWeight: 700 }}>Superscore</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.ink, lineHeight: 1.1 }}>{superscore.total}</div>
      <div style={{ fontSize: 10.5, color: C.ink2, marginTop: 2 }}>R&W {superscore.rw} · {fmtShort(superscore.rwDate)}</div>
      <div style={{ fontSize: 10.5, color: C.ink2 }}>Math {superscore.math} · {fmtShort(superscore.mathDate)}</div>
    </div>
  );
}

// Transient save status: shows Saving…, then ✓ Saved which auto-hides after ~2.5s.
function SaveStatus({ syncState }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (syncState === "saving" || syncState === "error") { setVisible(true); return; }
    if (syncState === "saved") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(t);
    }
  }, [syncState]);

  if (!visible) return <span style={{ minWidth: 1 }} aria-hidden="true" />;
  const isError = syncState === "error";
  const label = isError ? "Save failed" : syncState === "saving" ? "Saving…" : "Saved";
  return (
    <span aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: isError ? "#B4443A" : C.ink2, fontWeight: 500, fontSize: 12 }}>
      {syncState === "saved" && <CheckDot />}
      {syncState === "saving" && <Spinner />}
      {label}
    </span>
  );
}

// Account area: name (→ Profile) + avatar (→ compact popup). No pill.
function AccountArea({ user, displayName, setTab }) {
  const firstName = firstNameFrom(displayName);
  const initials = initialsFrom(displayName);
  const photo = user?.photoURL || null;
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const firstItemRef = React.useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    // move focus into the popup for keyboard users
    setTimeout(() => firstItemRef.current?.focus(), 0);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <button
        onClick={() => setTab("more")}
        className="sg-focus"
        style={{ background: "none", border: "none", padding: "2px 4px", fontSize: 13.5, fontWeight: 600, color: C.ink, cursor: "pointer" }}
        title="Open your profile"
      >
        <span className="sg-name-text">{firstName}</span>
      </button>

      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="sg-focus"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: "50%", lineHeight: 0 }}
        >
          <Avatar photo={photo} initials={initials} size={32} />
        </button>

        {open && (
          <div role="menu" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 232, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 10px 34px rgba(18,32,58,.16)", overflow: "hidden", zIndex: 60 }}>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
              <div style={{ fontSize: 12.5, color: C.ink2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
            </div>
            <div style={{ height: 1, background: C.soft }} />
            <div style={{ padding: 6 }}>
              <button
                ref={firstItemRef}
                role="menuitem"
                onClick={() => { setOpen(false); logout(); }}
                className="sg-focus"
                style={{ ...menuItemStyle, color: "#B4443A", fontWeight: 600 }}
              >
                <IconSignOut /> <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Small sync indicators
function CheckDot() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={C.accent} />
      <path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" style={{ animation: "sg-spin 0.7s linear infinite" }}>
      <style>{`@keyframes sg-spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" stroke={C.line} strokeWidth="3" fill="none" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke={C.accent} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Profile menu (avatar + dropdown) ----------
function initialsFrom(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function firstNameFrom(name) {
  return name.trim().split(/\s+/)[0] || "Student";
}

function Avatar({ photo, initials, size = 32 }) {
  if (photo) {
    return <img src={photo} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, fontWeight: 700, letterSpacing: 0.2 }}>
      {initials}
    </div>
  );
}

const menuItemStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "9px 10px",
  background: "none",
  border: "none",
  borderRadius: 9,
  fontSize: 14,
  fontWeight: 500,
  color: "#31445F",
  cursor: "pointer",
  textAlign: "left",
};

// Minimal line icons (stroke = currentColor so they inherit item color)
const iconWrap = { width: 17, height: 17, flexShrink: 0 };
function IconSignOut() { return (<svg style={iconWrap} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg>); }

function Stat({ label, value, accent = C.ink, sub, small = false }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 14px", minWidth: 92, background: C.paper }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.ink2 }}>{label}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: small ? 16 : 24, color: accent, lineHeight: 1.15, marginTop: small ? 3 : 0 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.ink2, marginTop: 2, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

// ---------- Nav ----------
function Nav({ tab, setTab }) {
  const tabs = [
    ["hub", "Practice Hub"],
    ["tracker", "Test Tracker"],
    ["mistakes", "Mistake Log"],
    ["analytics", "Analytics"],
    ["planner", "AI Planner"],
    ["sim", "Test Simulator"],
    ["more", "More"],
  ];
  return (
    <nav style={{ background: C.card, borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px", display: "flex", gap: 4, overflowX: "auto" }}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className="sg-tab"
            onClick={() => setTab(id)}
            style={{
              border: "none",
              background: "none",
              padding: "14px 14px",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: tab === id ? C.ink : C.ink2,
              borderBottom: tab === id ? `2px solid ${C.accent}` : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function SectionTitle({ kicker, title, sub }) {
  return (
    <div style={{ margin: "34px 0 18px" }}>
      {kicker && <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, color: C.accent, fontWeight: 700 }}>{kicker}</div>}
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 26, margin: "4px 0 0", letterSpacing: -0.4 }}>{title}</h2>
      {sub && <p style={{ color: C.ink2, fontSize: 14, marginTop: 6, maxWidth: 640 }}>{sub}</p>}
    </div>
  );
}

// ---------- 1. PRACTICE HUB (the centerpiece) ----------
function Hub() {
  const [filter, setFilter] = useState("all");
  const list = PROVIDERS.filter((p) => filter === "all" || p.tier === filter);

  return (
    <>
      <SectionTitle
        kicker="Start here"
        title="Every practice test, in one place"
        sub="Official practice is free and the most realistic — do it first. Paid vendors add extra question volume once you've exhausted the official pool. Each card opens the provider directly; SATGene never copies their questions."
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[["all", "All"], ["official", "Official (free)"], ["paid", "Paid vendors"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: `1px solid ${filter === id ? C.accent : C.line}`,
              background: filter === id ? C.accent : C.card,
              color: filter === id ? "#fff" : C.ink2,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {list.map((p) => (
          <ProviderCard key={p.id} p={p} />
        ))}
      </div>

      <div style={{ marginTop: 28, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, fontFamily: FONT_DISPLAY }}>The recommended path</div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: C.ink2, lineHeight: 1.7 }}>
          <li>Download <b>Bluebook</b> and take a full-length test — it's the real test-day engine.</li>
          <li>Open <b>My Practice</b> to see your score, then <b>Tailored Practice</b> for auto-targeted questions.</li>
          <li>Use <b>Khan Academy</b> to learn the concept behind each missed question.</li>
          <li>Drill weak skills in the <b>Student Question Bank</b>.</li>
          <li>Log every result in <b>Test Tracker</b> and <b>Mistake Log</b> here so Analytics + the AI Planner can guide you.</li>
          <li>Only if you exhaust official practice, add a paid <b>QBank</b> like UWorld.</li>
        </ol>
      </div>
    </>
  );
}

function ProviderCard({ p }) {
  const tierColor = p.tier === "official" ? C.official : C.paid;
  return (
    <div className="sg-card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}>{p.name}</div>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#fff", background: tierColor, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
          {p.tier === "official" ? "Official" : "Paid"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 14, margin: "12px 0", fontSize: 12.5, color: C.ink2 }}>
        <div><b style={{ color: C.ink }}>{p.cost}</b><br />Cost</div>
        <div><b style={{ color: C.ink }}>{p.tests}</b><br />Practice</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: C.ink2, marginBottom: 3 }}>Test-day realism</div>
        <div style={{ height: 7, background: C.soft, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${p.realism}%`, height: "100%", background: tierColor }} />
        </div>
      </div>

      <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, margin: "0 0 8px" }}>{p.note}</p>
      <div style={{ fontSize: 12.5, color: C.ink, marginBottom: 14 }}>
        <b>Best for:</b> {p.best}
      </div>

      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ marginTop: "auto", textAlign: "center", textDecoration: "none", background: tierColor, color: "#fff", padding: "10px", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
      >
        Open {p.name.split("—")[0].trim()} →
      </a>
    </div>
  );
}

// ---------- 2. TEST TRACKER ----------
const SAT_SOURCES = ["College Board"];
const PRACTICE_SOURCES = ["Bluebook", "Khan Academy", "Princeton Review", "Kaplan", "UWorld", "Magoosh", "School", "Paper", "Tutor", "Other"];

function Tracker({ attempts, setAttempts }) {
  const blankFor = (testType) => ({
    date: "",
    testType,
    source: testType === "SAT" ? SAT_SOURCES[0] : PRACTICE_SOURCES[0],
    rw: "",
    math: "",
    minutes: "",
    confidence: 3,
    notes: "",
  });
  const [form, setForm] = useState(blankFor("Practice"));
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | SAT | Practice

  const setType = (testType) => {
    // Reset source to a valid one for the chosen type.
    setForm((f) => ({ ...f, testType, source: testType === "SAT" ? SAT_SOURCES[0] : PRACTICE_SOURCES[0] }));
  };

  const total = (Number(form.rw) || 0) + (Number(form.math) || 0);
  const valid = form.date && form.rw !== "" && form.math !== "";

  const save = () => {
    if (!valid) return;
    const record = {
      ...form,
      rw: +form.rw,
      math: +form.math,
      minutes: +form.minutes || 0,
    };
    if (editingId) {
      setAttempts(attempts.map((a) => (a.id === editingId ? { ...record, id: editingId } : a)));
      setEditingId(null);
    } else {
      setAttempts([...attempts, { ...record, id: Date.now() }]);
    }
    setForm(blankFor(form.testType));
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({
      date: a.date, testType: a.testType || "Practice", source: a.source,
      rw: String(a.rw), math: String(a.math), minutes: a.minutes ? String(a.minutes) : "",
      confidence: a.confidence ?? 3, notes: a.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditingId(null); setForm(blankFor(form.testType)); };
  const remove = (id) => {
    setAttempts(attempts.filter((a) => a.id !== id));
    if (editingId === id) cancelEdit();
  };

  const sources = form.testType === "SAT" ? SAT_SOURCES : PRACTICE_SOURCES;
  const shown = attempts
    .filter((a) => filter === "all" || a.testType === filter)
    .sort(byDateDesc);

  return (
    <>
      <SectionTitle kicker="Log results" title="Test Tracker" sub="Record both official SAT scores and practice-test scores. This is the source of truth for your header, analytics, and study plans." />

      {/* form */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
        {editingId && (
          <div style={{ fontSize: 13, fontWeight: 600, color: C.accent2, marginBottom: 10 }}>Editing a saved result</div>
        )}

        {/* Test Type selector — prominent, drives the rest of the form */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.ink2, fontWeight: 600, marginBottom: 6 }}>Test Type</div>
          <div style={{ display: "inline-flex", background: C.soft, borderRadius: 10, padding: 3 }}>
            {["Practice", "SAT"].map((t) => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: "7px 18px", borderRadius: 8, border: "none", fontSize: 13.5, fontWeight: 700,
                background: form.testType === t ? (t === "SAT" ? C.accent : "#fff") : "transparent",
                color: form.testType === t ? (t === "SAT" ? "#fff" : C.ink) : C.ink2,
                boxShadow: form.testType === t && t !== "SAT" ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              }}>
                {t === "SAT" ? "Official SAT" : "Practice"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12 }}>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inp} /></Field>
          <Field label="Source">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={inp}>
              {sources.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Reading & Writing"><input type="number" value={form.rw} onChange={(e) => setForm({ ...form, rw: e.target.value })} style={inp} placeholder="620" /></Field>
          <Field label="Math"><input type="number" value={form.math} onChange={(e) => setForm({ ...form, math: e.target.value })} style={inp} placeholder="640" /></Field>
          <Field label="Total (auto)">
            <div style={{ ...inp, background: C.soft, fontWeight: 700, color: C.ink }}>{total || "—"}</div>
          </Field>
          <Field label={`Minutes${form.testType === "SAT" ? " (optional)" : ""}`}><input type="number" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} style={inp} placeholder="134" /></Field>
          <Field label={`Confidence (${form.confidence}/5)`}><input type="range" min="1" max="5" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: +e.target.value })} style={{ width: "100%" }} /></Field>
        </div>
        <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inp} placeholder="What went well / what to fix" /></Field>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={save} style={{ ...btnPrimary, opacity: valid ? 1 : 0.5 }}>{editingId ? "Save changes" : `Add ${form.testType === "SAT" ? "SAT" : "practice"} result`}</button>
          {editingId && <button onClick={cancelEdit} style={btnGhostSolid}>Cancel</button>}
        </div>
      </div>

      {/* filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["all", "All tests"], ["SAT", "Official SAT"], ["Practice", "Practice"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: "7px 14px", borderRadius: 20, border: `1px solid ${filter === id ? C.accent : C.line}`,
            background: filter === id ? C.accent : C.card, color: filter === id ? "#fff" : C.ink2, fontSize: 13, fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      {/* history */}
      {shown.length === 0 ? (
        <Empty text={filter === "all" ? "No tests logged yet. Add an official SAT or practice result above." : `No ${filter === "SAT" ? "official SAT" : "practice"} results yet.`} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {shown.map((a) => {
            const tot = totalOf(a);
            const isSAT = a.testType === "SAT";
            return (
              <div key={a.id} className="sg-card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 28 }}>{tot}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#fff", background: isSAT ? C.accent : C.paid, padding: "3px 8px", borderRadius: 6 }}>
                      {isSAT ? "Official SAT" : "Practice"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: C.ink2, marginTop: 4 }}>{a.date} · {a.source} · R&W {a.rw} · Math {a.math}{a.minutes ? ` · ${a.minutes} min` : ""}{a.confidence ? ` · confidence ${a.confidence}/5` : ""}</div>
                  {a.notes && <div style={{ fontSize: 13, marginTop: 4, color: C.ink }}>“{a.notes}”</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => startEdit(a)} style={btnGhost}>Edit</button>
                  <button onClick={() => remove(a.id)} style={btnGhost}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------- 3. MISTAKE LOG ----------
function Mistakes({ mistakes, setMistakes, attempts }) {
  const blank = { date: "", testType: "Practice", source: "Bluebook", section: "Math", skill: SKILLS.Math[0], difficulty: "Medium", why: "Concept gap", concept: "", mastered: false };
  const [form, setForm] = useState(blank);
  const [filter, setFilter] = useState("all"); // all | SAT | Practice

  const add = () => {
    if (!form.concept) return;
    setMistakes([...mistakes, { ...form, id: Date.now() }]);
    setForm({ ...blank, testType: form.testType });
  };
  const toggle = (id) => setMistakes(mistakes.map((m) => (m.id === id ? { ...m, mastered: !m.mastered } : m)));
  const remove = (id) => setMistakes(mistakes.filter((m) => m.id !== id));

  const shown = mistakes.filter((m) => filter === "all" || (m.testType || "Practice") === filter);

  return (
    <>
      <SectionTitle kicker="Learn from errors" title="Mistake Log" sub="Record why you missed each question — not the copyrighted question itself, just the skill and the lesson. Tag each as SAT or Practice so your plans can weigh them correctly." />

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
        {/* Test Type selector */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.ink2, fontWeight: 600, marginBottom: 6 }}>Test Type</div>
          <div style={{ display: "inline-flex", background: C.soft, borderRadius: 10, padding: 3 }}>
            {["Practice", "SAT"].map((t) => (
              <button key={t} onClick={() => setForm({ ...form, testType: t })} style={{
                padding: "7px 18px", borderRadius: 8, border: "none", fontSize: 13.5, fontWeight: 700,
                background: form.testType === t ? (t === "SAT" ? C.accent : "#fff") : "transparent",
                color: form.testType === t ? (t === "SAT" ? "#fff" : C.ink) : C.ink2,
                boxShadow: form.testType === t && t !== "SAT" ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              }}>{t === "SAT" ? "Official SAT" : "Practice"}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12 }}>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inp} /></Field>
          <Field label="Section">
            <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value, skill: SKILLS[e.target.value][0] })} style={inp}>
              {Object.keys(SKILLS).map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Skill">
            <select value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} style={inp}>
              {SKILLS[form.section].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} style={inp}>
              {["Easy", "Medium", "Hard"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Why missed">
            <select value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} style={inp}>
              {["Concept gap", "Careless", "Ran out of time", "Misread", "Guessed"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="The lesson (what's the correct concept?)"><input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} style={inp} placeholder="e.g. Isolate the variable before squaring both sides" /></Field>
        <button onClick={add} style={{ ...btnPrimary, opacity: form.concept ? 1 : 0.5 }}>Add to log</button>
      </div>

      {/* filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["all", "All"], ["SAT", "Official SAT"], ["Practice", "Practice"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: "7px 14px", borderRadius: 20, border: `1px solid ${filter === id ? C.accent : C.line}`,
            background: filter === id ? C.accent : C.card, color: filter === id ? "#fff" : C.ink2, fontSize: 13, fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty text="No mistakes logged. After each test, add the ones you missed here." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {[...shown].reverse().map((m) => {
            const isSAT = (m.testType || "Practice") === "SAT";
            return (
              <div key={m.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, opacity: m.mastered ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <Tag c={isSAT ? C.accent : C.paid}>{isSAT ? "SAT" : "Practice"}</Tag>
                    <Tag c={m.section === "Math" ? C.accent2 : C.ink2}>{m.section}</Tag>
                    <Tag c={C.ink2}>{m.skill}</Tag>
                    <Tag c={C.ink2}>{m.difficulty}</Tag>
                    <Tag c={m.why === "Concept gap" ? "#B4443A" : C.ink2}>{m.why}</Tag>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggle(m.id)} style={{ ...btnGhost, color: m.mastered ? C.accent : C.ink2 }}>{m.mastered ? "✓ Mastered" : "Mark mastered"}</button>
                    <button onClick={() => remove(m.id)} style={btnGhost}>Delete</button>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 14 }}>{m.concept}</div>
                {m.date && <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>{m.date}</div>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------- 4. ANALYTICS ----------
function Analytics({ attempts, mistakes, goal }) {
  const skillCounts = useMemo(() => {
    const map = {};
    mistakes.forEach((m) => { map[m.skill] = (map[m.skill] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [mistakes]);

  const whyCounts = useMemo(() => {
    const map = {};
    mistakes.forEach((m) => { map[m.why] = (map[m.why] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [mistakes]);

  const maxTotal = 1600;
  return (
    <>
      <SectionTitle kicker="See the pattern" title="Analytics" sub="Your score trajectory and where points are leaking. Everything here comes from the tests and mistakes you logged." />

      {/* Score trend */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>Score trend</div>
        {attempts.length === 0 ? <Empty text="Log tests to see your trend." /> : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 180, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>
            {attempts.map((a) => {
              const total = a.rw + a.math;
              const h = (total / maxTotal) * 160;
              return (
                <div key={a.id} style={{ flex: 1, textAlign: "center", minWidth: 44 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{total}</div>
                  <div style={{ position: "relative", height: h, background: `linear-gradient(${C.accent}, ${C.official})`, borderRadius: "6px 6px 0 0" }} />
                  <div style={{ fontSize: 10, color: C.ink2, marginTop: 4 }}>{a.date?.slice(5)}</div>
                </div>
              );
            })}
            <div style={{ borderTop: `2px dashed ${C.accent2}`, position: "relative", flexBasis: "100%", alignSelf: "flex-start", marginTop: (1 - goal.satTarget / maxTotal) * 160, order: 99, width: 0 }} />
          </div>
        )}
        <div style={{ fontSize: 12, color: C.ink2, marginTop: 8 }}>Target (SAT): {goal.satTarget} · latest gap tracked in the header.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Weakest skills (by misses)</div>
          {skillCounts.length === 0 ? <Empty text="No mistakes logged yet." /> : skillCounts.map(([skill, n]) => (
            <div key={skill} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}><span>{skill}</span><b>{n}</b></div>
              <div style={{ height: 8, background: C.soft, borderRadius: 4 }}>
                <div style={{ width: `${(n / skillCounts[0][1]) * 100}%`, height: "100%", background: C.accent2, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Why you miss questions</div>
          {whyCounts.length === 0 ? <Empty text="No mistakes logged yet." /> : whyCounts.map(([why, n]) => (
            <div key={why} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}><span>{why}</span><b>{n}</b></div>
              <div style={{ height: 8, background: C.soft, borderRadius: 4 }}>
                <div style={{ width: `${(n / whyCounts[0][1]) * 100}%`, height: "100%", background: C.paid, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------- 5. AI PLANNER ----------
// ---------- 5. AI PLANNER (SAT + Practice tabs, saved history) ----------
function Planner({ attempts, mistakes, goal, setGoal, plans, setPlans, setTab }) {
  const [sub, setSub] = useState("SAT"); // SAT | Practice
  const [openPlanId, setOpenPlanId] = useState(null);

  const latestSat = latestOfType(attempts, "SAT");
  const latestPractice = latestOfType(attempts, "Practice");

  const addPlan = (planObj) => {
    const now = new Date().toISOString();
    const record = { id: Date.now(), createdAt: now, updatedAt: now, ...planObj };
    setPlans((prev) => [record, ...prev]);
    setOpenPlanId(record.id);
  };
  const deletePlan = (id) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    if (openPlanId === id) setOpenPlanId(null);
  };

  return (
    <>
      <SectionTitle kicker="What to do next" title="AI Study Planner" sub="Separate plans for the official SAT and for your next practice test. Each reads your saved scores and mistakes. AI plans use a model; Instant plans use a built-in rule engine that always works." />

      {/* sub-tabs */}
      <div style={{ display: "inline-flex", background: C.soft, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {[["SAT", "SAT Plan"], ["Practice", "Practice Plan"]].map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)} style={{
            padding: "9px 22px", borderRadius: 9, border: "none", fontSize: 14, fontWeight: 700,
            background: sub === id ? (id === "SAT" ? C.accent : "#fff") : "transparent",
            color: sub === id ? (id === "SAT" ? "#fff" : C.ink) : C.ink2,
            boxShadow: sub === id && id === "Practice" ? "0 1px 3px rgba(0,0,0,.08)" : "none",
          }}>{label}</button>
        ))}
      </div>

      {sub === "SAT" ? (
        <PlanPanel
          kind="SAT"
          latest={latestSat}
          supportingLatest={latestPractice}
          target={goal.satTarget}
          onTarget={(v) => setGoal({ ...goal, satTarget: v })}
          nextDate={goal.nextSatDate}
          onNextDate={(v) => setGoal({ ...goal, nextSatDate: v })}
          attempts={attempts} mistakes={mistakes}
          onAddPlan={addPlan} setTab={setTab}
        />
      ) : (
        <PlanPanel
          kind="Practice"
          latest={latestPractice}
          supportingLatest={null}
          target={goal.practiceTarget}
          onTarget={(v) => setGoal({ ...goal, practiceTarget: v })}
          nextDate={goal.nextPracticeDate}
          onNextDate={(v) => setGoal({ ...goal, nextPracticeDate: v })}
          attempts={attempts} mistakes={mistakes}
          onAddPlan={addPlan} setTab={setTab}
        />
      )}

      {/* Saved plans / history */}
      <SavedPlans plans={plans} filterKind={sub} openPlanId={openPlanId} setOpenPlanId={setOpenPlanId} onDelete={deletePlan} />
    </>
  );
}

function PlanPanel({ kind, latest, supportingLatest, target, onTarget, nextDate, onNextDate, attempts, mistakes, onAddPlan, setTab }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSAT = kind === "SAT";
  const latestScore = latest ? totalOf(latest) : null;
  const gap = latestScore == null ? null : target - latestScore;

  // Build a rule-based plan from the data for this kind.
  const buildInstant = () => {
    const typeMistakes = mistakes.filter((m) => (m.testType || "Practice") === kind);
    // For SAT, also let practice mistakes inform (spec: both may inform SAT plan).
    const pool = isSAT ? mistakes : typeMistakes;
    const skillMap = {};
    pool.forEach((m) => { skillMap[m.skill] = (skillMap[m.skill] || 0) + 1; });
    const weak = Object.entries(skillMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);

    const sectionMap = { "Reading & Writing": 0, Math: 0 };
    pool.forEach((m) => { if (sectionMap[m.section] != null) sectionMap[m.section]++; });
    const weakestSection = sectionMap.Math >= sectionMap["Reading & Writing"] ? "Math" : "Reading & Writing";

    const days = daysUntil(nextDate);
    const daysText = days == null ? "no date set yet" : days > 0 ? `~${days} days away` : "the date has passed";
    const rw = latest ? latest.rw : null;
    const math = latest ? latest.math : null;
    const timeIssues = pool.filter((m) => m.why === "Ran out of time").length;

    const gapText = gap == null ? "No score recorded yet." : gap <= 0 ? "You're at or above target." : `${gap} points to target.`;

    const summaryBase = isSAT
      ? (latestScore == null
          ? `No official SAT score recorded yet.${supportingLatest ? ` Your latest practice score is ${totalOf(supportingLatest)}, useful as a baseline but not an official result.` : ""} Target ${target}. Next SAT ${daysText}.`
          : `Current official SAT ${latestScore}. Target ${target}. ${gapText} Next SAT ${daysText}.`)
      : (latestScore == null
          ? `No practice score recorded yet. Target ${target}. Next practice test ${daysText}.`
          : `Latest practice ${latestScore}. Target ${target}. ${gapText} Next practice test ${daysText}.`);

    const focus = weak.length ? weak : ["Take a full test to reveal weak skills"];
    const week = [
      weak[0] ? `Two focused sessions on ${weak[0]} (your most-missed skill).` : "Complete one full-length test to establish a baseline.",
      weak[1] ? `One session on ${weak[1]}.` : `Review ${weakestSection} fundamentals.`,
      "One timed module to build pacing.",
      timeIssues >= 2 ? "Pacing drill — you've run out of time repeatedly." : "Revisit unmastered items in your Mistake Log.",
    ];
    const nextAction = latestScore == null
      ? (isSAT ? "Add your official SAT score in Test Tracker once you have it." : "Take a Bluebook practice test, then log it in Test Tracker.")
      : `Focus your next sessions on ${weak[0] || weakestSection}.`;

    return {
      summary: summaryBase,
      currentScore: latestScore,
      targetScore: target,
      gap: gap,
      rw, math,
      weakestSection,
      focus,
      week,
      practiceSchedule: isSAT
        ? (days && days > 14 ? "Take one full Bluebook test each week until your SAT." : "Take a final full timed Bluebook test 3–5 days before the SAT.")
        : (days ? "Do timed section drills between now and your practice test." : "Schedule your next practice test to create a deadline."),
      nextAction,
    };
  };

  const saveAndShow = (planData, genType) => {
    onAddPlan({
      planType: kind,
      genType,
      currentScore: planData.currentScore ?? null,
      targetScore: target,
      testDate: nextDate || null,
      content: planData,
    });
  };

  const generate = async (useAI) => {
    setError(null);
    if (!useAI) { saveAndShow(buildInstant(), "Instant"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKind: kind,
          goal: { target, nextDate },
          latest, supportingLatest,
          attempts: attempts.filter((a) => isSAT || a.testType === "Practice"),
          mistakes,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "The AI service is temporarily unavailable. A rule-based plan was saved instead. Please try the AI plan again later."); }
      const data = await res.json();
      // Merge AI text fields with computed numbers so the saved plan is complete.
      const base = buildInstant();
      saveAndShow({ ...base, ...data, currentScore: base.currentScore }, "AI");
    } catch (e) {
      // The server returns a clean, student-friendly message; show it as-is.
      setError(e.message);
      saveAndShow(buildInstant(), "Instant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
      {/* current score (read-only, from tracker) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: C.ink2, fontWeight: 600, marginBottom: 5 }}>{isSAT ? "Current SAT Score" : "Current Practice Score"}</div>
          {latestScore != null ? (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 26, lineHeight: 1 }}>{latestScore}</div>
              <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>{latest.date} · R&W {latest.rw} · Math {latest.math}</div>
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: C.accent2, fontWeight: 600, padding: "6px 0" }}>
              {isSAT ? "No official SAT score recorded" : "No practice score recorded"}
            </div>
          )}
          <button onClick={() => setTab("tracker")} style={{ ...btnGhost, paddingLeft: 0, color: C.accent, marginTop: 4 }}>
            {isSAT ? "Add or edit SAT scores →" : "Add or edit practice scores →"}
          </button>
          {isSAT && latestScore == null && supportingLatest && (
            <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>
              Using latest practice ({totalOf(supportingLatest)}) as supporting context only.
            </div>
          )}
        </div>

        <Field label={isSAT ? "Target SAT Score" : "Target Practice Score"}>
          <input type="number" value={target} onChange={(e) => onTarget(+e.target.value)} style={inp} />
        </Field>
        <Field label={isSAT ? "Next SAT Test Date" : "Next Practice Test Date"}>
          <input type="date" value={nextDate || ""} onChange={(e) => onNextDate(e.target.value)} style={inp} />
        </Field>
      </div>

      {gap != null && (
        <div style={{ fontSize: 13, color: C.ink2, marginBottom: 14 }}>
          Gap to target: <b style={{ color: gap <= 0 ? C.accent : C.ink }}>{gap <= 0 ? "Target reached" : `${gap} points`}</b>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => generate(true)} style={btnPrimary} disabled={loading}>
          {loading ? "Thinking…" : `Generate AI Plan for ${isSAT ? "SAT" : "Practice"}`}
        </button>
        <button onClick={() => generate(false)} style={btnGhostSolid}>
          Instant Plan for {isSAT ? "SAT" : "Practice"} (No AI)
        </button>
      </div>

      {error && <div style={{ color: "#B4443A", fontSize: 13, marginTop: 12 }}>{error}</div>}
    </div>
  );
}

// Render a stored plan's content.
function PlanContent({ content }) {
  if (!content) return null;
  const c = content;
  return (
    <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
      {c.summary && <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.6 }}>{c.summary}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {c.currentScore != null && <Tag c={C.ink2}>Current {c.currentScore}</Tag>}
        {c.targetScore != null && <Tag c={C.accent}>Target {c.targetScore}</Tag>}
        {c.gap != null && <Tag c={c.gap <= 0 ? C.accent : C.accent2}>{c.gap <= 0 ? "Target reached" : `Gap ${c.gap}`}</Tag>}
        {c.rw != null && <Tag c={C.ink2}>R&W {c.rw}</Tag>}
        {c.math != null && <Tag c={C.ink2}>Math {c.math}</Tag>}
        {c.weakestSection && <Tag c={C.paid}>Focus: {c.weakestSection}</Tag>}
      </div>

      {Array.isArray(c.focus) && c.focus.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>Priority topics</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{c.focus.map((f, i) => <Tag key={i} c={C.accent}>{f}</Tag>)}</div>
        </div>
      )}

      {Array.isArray(c.week) && c.week.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>Weekly recommendations</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 14 }}>{c.week.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {c.practiceSchedule && <PlanRow label="Practice-test schedule" value={c.practiceSchedule} />}
      {c.nextAction && <PlanRow label="Recommended next action" value={c.nextAction} />}
    </div>
  );
}
function PlanRow({ label, value }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}

// Saved plan history for the current kind.
function SavedPlans({ plans, filterKind, openPlanId, setOpenPlanId, onDelete }) {
  const list = plans.filter((p) => p.planType === filterKind);
  if (list.length === 0) {
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Saved {filterKind} plans</div>
        <Empty text={`No ${filterKind} plans yet. Generate one above — every plan is saved here.`} />
      </div>
    );
  }
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Saved {filterKind} plans</div>
      <div style={{ display: "grid", gap: 10 }}>
        {list.map((p, idx) => {
          const open = openPlanId === p.id;
          return (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${idx === 0 ? C.accent : C.line}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {idx === 0 && <Tag c={C.accent}>Latest</Tag>}
                  <Tag c={p.genType === "AI" ? C.paid : C.ink2}>{p.genType}</Tag>
                  <span style={{ fontSize: 13, color: C.ink2 }}>{fmtDate(p.createdAt)}</span>
                  {p.currentScore != null && <span style={{ fontSize: 13, color: C.ink2 }}>· current {p.currentScore}</span>}
                  {p.targetScore != null && <span style={{ fontSize: 13, color: C.ink2 }}>· target {p.targetScore}</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setOpenPlanId(open ? null : p.id)} style={btnGhost}>{open ? "Hide" : "Open"}</button>
                  <button onClick={() => onDelete(p.id)} style={btnGhost}>Delete</button>
                </div>
              </div>
              {open && <div style={{ padding: "0 16px 16px" }}><PlanContent content={p.content} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- 6. SIMULATOR (structure + timing only; questions are Phase 2 / your own bank) ----------
function Simulator() {
  const [running, setRunning] = useState(false);
  const [modIdx, setModIdx] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const mods = SAT_STRUCTURE.modules;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, modIdx]);

  const cur = mods[modIdx];
  const remaining = cur.min * 60 - seconds;
  const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  const next = () => {
    if (modIdx < mods.length - 1) { setModIdx(modIdx + 1); setSeconds(0); }
    else { setRunning(false); setModIdx(0); setSeconds(0); }
  };

  return (
    <>
      <SectionTitle
        kicker="Feel the real thing"
        title="Digital SAT Simulator"
        sub="This reproduces the real exam's exact structure and timing — two Reading & Writing modules of 27 questions, a 10-minute break, then two Math modules of 22, for 2 hours 14 minutes. Questions belong in your own reviewed bank (Phase 2); this simulator handles format, pacing, and the adaptive flow, not copied content."
      />

      {!running ? (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 }}>
          <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
            {mods.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: m.adaptive === "break" ? C.soft : C.paper, border: `1px solid ${C.line}`, borderRadius: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                <span style={{ fontSize: 13, color: C.ink2 }}>{m.adaptive === "break" ? `${m.min} min` : `${m.q} questions · ${m.min} min`}{m.adaptive === "adaptive" && " · adapts to Module 1"}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: C.ink2, marginBottom: 16 }}>
            <b>Adaptive logic:</b> Module 1 runs at medium difficulty. Score high → Module 2 gets harder (unlocks the top score band). Score low → Module 2 gets easier. This mirrors the official section-adaptive design and is labeled as a simulation, not an official scoring engine.
          </div>
          <button onClick={() => { setRunning(true); setModIdx(0); setSeconds(0); }} style={btnPrimary}>Start timed simulation</button>
        </div>
      ) : (
        <div style={{ background: C.ink, color: "#fff", borderRadius: 16, padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: "#9DB0C4" }}>{cur.name}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 64, margin: "10px 0", color: remaining < 60 ? C.accent2 : "#fff" }}>{fmt(remaining)}</div>
          {cur.adaptive !== "break" && <div style={{ color: "#9DB0C4", fontSize: 14 }}>{cur.q} questions · difficulty: {cur.adaptive === "adaptive" ? "adapts to your Module 1" : "medium"}</div>}
          {cur.adaptive === "break" && <div style={{ color: "#9DB0C4", fontSize: 14 }}>Stretch, breathe, hydrate.</div>}
          <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={next} style={{ ...btnPrimary, background: C.accent2 }}>{modIdx < mods.length - 1 ? "Next module →" : "Finish"}</button>
            <button onClick={() => { setRunning(false); setSeconds(0); setModIdx(0); }} style={{ ...btnGhost, color: "#9DB0C4", border: "1px solid #33455F" }}>Exit</button>
          </div>
          <div style={{ marginTop: 18, fontSize: 12, color: "#7E93AB" }}>Slot your own reviewed questions into each module. Never paste College Board / vendor questions here.</div>
        </div>
      )}
    </>
  );
}

// ============================================================
// MORE PAGE — profile, settings, data & privacy, help, about
// ============================================================
function MorePage({ user, displayName, syncState, profile, setProfile, goal, setGoal, attempts, mistakes, plans, setAttempts, setMistakes, setPlans }) {
  const [section, setSection] = useState("profile");
  const initials = initialsFrom(displayName);
  const photo = user?.photoURL || null;

  const sections = [
    ["profile", "Profile"],
    ["settings", "Settings"],
    ["data", "Data & Privacy"],
    ["help", "Help & User Guide"],
    ["about", "About SATGene"],
  ];

  const saveText = syncState === "saving" ? "Saving…" : syncState === "error" ? "Save failed" : "Saved to your account";

  return (
    <>
      <SectionTitle kicker="Account & information" title="More" sub="Manage your profile, preferences, saved data, and SATGene information." />

      {/* account summary card */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 18, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Avatar photo={photo} initials={initials} size={56} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{displayName}</div>
          {profile.fullName && profile.fullName !== displayName && (
            <div style={{ fontSize: 13, color: C.ink2 }}>{profile.fullName}</div>
          )}
          <div style={{ fontSize: 13, color: C.ink2 }}>{user?.email}</div>
        </div>
        <div style={{ fontSize: 12, color: syncState === "error" ? "#B4443A" : C.ink2 }}>{saveText}</div>
      </div>

      {/* section nav (left) + content (right) on desktop; stacks on mobile */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 220px) 1fr", gap: 18, alignItems: "start" }} className="sg-more-grid">
        <style>{`@media (max-width: 720px){ .sg-more-grid { grid-template-columns: 1fr !important; } }`}</style>

        <nav style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 8, position: "sticky", top: 64 }}>
          {sections.map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)} className="sg-focus" style={{
              width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 9, border: "none",
              background: section === id ? C.soft : "transparent",
              color: section === id ? C.ink : C.ink2, fontSize: 14, fontWeight: section === id ? 700 : 500, marginBottom: 2,
            }}>{label}</button>
          ))}
        </nav>

        <div>
          {section === "profile" && <ProfilePanel profile={profile} setProfile={setProfile} user={user} displayName={displayName} />}
          {section === "settings" && <SettingsPanel goal={goal} setGoal={setGoal} syncState={syncState} />}
          {section === "data" && (
            <DataPrivacyPanel
              profile={profile} goal={goal} attempts={attempts} mistakes={mistakes} plans={plans}
              setGoal={setGoal} setAttempts={setAttempts} setMistakes={setMistakes} setPlans={setPlans}
            />
          )}
          {section === "help" && <HelpPanel />}
          {section === "about" && <AboutPanel />}
        </div>
      </div>
    </>
  );
}

function PanelCard({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 14, ...style }}>{children}</div>;
}
function PanelHeading({ title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, margin: 0 }}>{title}</h3>
      {sub && <p style={{ fontSize: 13.5, color: C.ink2, margin: "6px 0 0", lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

// ---- Profile panel ----
function ProfilePanel({ profile, setProfile, user, displayName }) {
  const set = (k, v) => setProfile({ ...profile, [k]: v });
  return (
    <>
      <PanelHeading title="Profile" sub="Your details personalize the app. The preferred name appears in the top-right account area." />
      <PanelCard>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          <Field label="Preferred name"><input value={profile.name} onChange={(e) => set("name", e.target.value)} style={inp} placeholder="e.g. Ansh" /></Field>
          <Field label="Full name"><input value={profile.fullName} onChange={(e) => set("fullName", e.target.value)} style={inp} placeholder="e.g. Ansh Saini" /></Field>
          <Field label="Email (from your sign-in)"><input value={user?.email || ""} readOnly style={{ ...inp, background: C.soft, color: C.ink2 }} /></Field>
          <Field label="Graduation year"><input value={profile.gradYear} onChange={(e) => set("gradYear", e.target.value)} style={inp} placeholder="e.g. 2027" /></Field>
          <Field label="School (optional)"><input value={profile.school} onChange={(e) => set("school", e.target.value)} style={inp} placeholder="e.g. Lincoln High" /></Field>
          <Field label="Time zone (optional)"><input value={profile.timezone} onChange={(e) => set("timezone", e.target.value)} style={inp} placeholder="e.g. America/New_York" /></Field>
        </div>
        <p style={{ fontSize: 12.5, color: C.ink2, marginTop: 12 }}>Changes save automatically to your account.</p>
      </PanelCard>
    </>
  );
}

// ---- Settings panel ----
function SettingsPanel({ goal, setGoal, syncState }) {
  const set = (k, v) => setGoal({ ...goal, [k]: v });
  return (
    <>
      <PanelHeading title="Settings" sub="Planning preferences and saved goals. These also appear in the AI Planner." />
      <PanelCard>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Planning preferences</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14 }}>
          <Field label="SAT Target"><input type="number" value={goal.satTarget} onChange={(e) => set("satTarget", +e.target.value)} style={inp} /></Field>
          <Field label="Next SAT date"><input type="date" value={goal.nextSatDate} onChange={(e) => set("nextSatDate", e.target.value)} style={inp} /></Field>
          <Field label="Practice Target"><input type="number" value={goal.practiceTarget} onChange={(e) => set("practiceTarget", +e.target.value)} style={inp} /></Field>
          <Field label="Next practice date"><input type="date" value={goal.nextPracticeDate} onChange={(e) => set("nextPracticeDate", e.target.value)} style={inp} /></Field>
        </div>
      </PanelCard>
      <PanelCard>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Data-saving status</div>
        <div style={{ fontSize: 13.5, color: C.ink2 }}>
          {syncState === "saving" ? "Saving your latest changes…" : syncState === "error" ? "Last save failed — check your connection." : "Your data is saved to your account and syncs across devices."}
        </div>
      </PanelCard>
    </>
  );
}

// ---- Data & Privacy panel ----
function DataPrivacyPanel({ profile, goal, attempts, mistakes, plans, setGoal, setAttempts, setMistakes, setPlans }) {
  const [msg, setMsg] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reauthPw, setReauthPw] = useState("");

  const exportData = () => {
    const payload = { version: 2, exportedAt: new Date().toISOString(), profile, goal, attempts, mistakes, plans };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `satgene-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setMsg({ kind: "ok", text: "Backup downloaded." });
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = migrateUserData(JSON.parse(reader.result));
        if (data.goal) setGoal({ ...DEFAULT_GOAL, ...data.goal });
        if (Array.isArray(data.attempts)) setAttempts(data.attempts);
        if (Array.isArray(data.mistakes)) setMistakes(data.mistakes);
        if (Array.isArray(data.plans)) setPlans(data.plans);
        setMsg({ kind: "ok", text: "Backup restored to your account." });
      } catch {
        setMsg({ kind: "err", text: "That file couldn't be read. Use a SATGene backup file (.json)." });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const clearAll = () => {
    if (!window.confirm("Erase all tests, mistakes, plans, and goals from your account? This can't be undone.")) return;
    setGoal(DEFAULT_GOAL); setAttempts([]); setMistakes([]); setPlans([]);
    setMsg({ kind: "ok", text: "All records cleared from your account." });
  };

  const doDelete = async () => {
    setMsg(null);
    setDeleting(true);
    try {
      if (needsReauth) { await reauthenticate(reauthPw); }
      await deleteAccount();
      // On success, auth state change returns the user to the login page automatically.
    } catch (e) {
      if (e.code === "auth/requires-recent-login") {
        setNeedsReauth(true);
        setMsg({ kind: "err", text: "For security, please confirm your sign-in to delete your account." });
      } else if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setMsg({ kind: "err", text: "Incorrect password. Please try again." });
      } else {
        setMsg({ kind: "err", text: `Couldn't delete account: ${e.message}` });
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PanelHeading title="Data & Privacy" sub="Export or import your data, clear records, or delete your account." />

      <PanelCard>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>What we store</div>
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: 0 }}>
          SATGene stores your profile, SAT and practice scores, mistake log, targets, test dates, and generated
          plans under your account. Data is isolated to your sign-in and syncs across your devices.
        </p>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14 }}>
        <PanelCard style={{ marginBottom: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Export</div>
          <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 12px" }}>Download all your data as a portable file.</p>
          <button onClick={exportData} style={btnPrimary}>Export account data</button>
        </PanelCard>
        <PanelCard style={{ marginBottom: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Import</div>
          <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 12px" }}>Load a SATGene backup file (replaces current data).</p>
          <label style={{ ...btnGhostSolid, display: "inline-block", marginTop: 0 }}>
            Import data
            <input type="file" accept="application/json,.json" onChange={importData} style={{ display: "none" }} />
          </label>
        </PanelCard>
      </div>

      <PanelCard style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Clear records</div>
        <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 12px" }}>Erase all tests, mistakes, plans, and goals but keep your account.</p>
        <button onClick={clearAll} style={{ ...btnGhostSolid, color: "#B4443A", borderColor: "#E3B7B3" }}>Clear all records</button>
      </PanelCard>

      {/* Danger zone: delete account */}
      <div style={{ background: "#FCF4F3", border: "1px solid #E3B7B3", borderRadius: 14, padding: 20, marginTop: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: "#B4443A" }}>Delete account</div>
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "0 0 12px" }}>
          Permanently deletes your account and all stored data. This cannot be undone. Type <b>DELETE</b> to confirm.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" style={{ ...inp, maxWidth: 180 }} />
          {needsReauth && (
            <input type="password" value={reauthPw} onChange={(e) => setReauthPw(e.target.value)} placeholder="Confirm password" style={{ ...inp, maxWidth: 200 }} />
          )}
          <button
            onClick={doDelete}
            disabled={confirmText !== "DELETE" || deleting}
            style={{ background: "#B4443A", color: "#fff", border: "none", padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, opacity: confirmText === "DELETE" && !deleting ? 1 : 0.5 }}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: msg.kind === "ok" ? "#E7F1EC" : "#FBEAE8", color: msg.kind === "ok" ? C.accent : "#B4443A", border: `1px solid ${msg.kind === "ok" ? "#BFDDCF" : "#E3B7B3"}` }}>
          {msg.text}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={logout} style={{ ...btnGhostSolid, color: C.ink2 }}>Sign out</button>
      </div>
    </>
  );
}

// ---- Help & User Guide panel ----
function HelpPanel() {
  const guide = [
    ["Practice Hub", "Organize your practice activities and open official and vendor study resources. SATGene links out to providers and does not reproduce copyrighted official SAT questions."],
    ["Test Tracker", "Log both practice and official SAT results. Test Type distinguishes Practice from SAT. Reading & Writing plus Math makes the total. Official SAT records can contribute to your superscore; practice-test scores never do."],
    ["Mistake Log", "Record each miss with its Test Type, section, topic, error type, notes, corrective action, and status. Saved mistakes can be used by the AI Planner to target weak areas."],
    ["Analytics", "See score trends, Reading & Writing and Math trends, practice-versus-official performance, progress toward your target, and how your superscore is formed."],
    ["AI Planner", "Separate SAT and Practice plans. Generate AI plans from a model, or Instant rule-based plans that always work. Every plan is saved to history. AI-generated content may contain errors."],
    ["Test Simulator", "Practice the real digital SAT structure and timing. Questions are original or your own — the simulator does not use official College Board questions, and its results are not official SAT scores."],
  ];
  return (
    <>
      <PanelHeading title="Help & User Guide" sub="What each part of SATGene does, in plain language." />
      {guide.map(([t, d]) => (
        <PanelCard key={t}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{t}</div>
          <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55 }}>{d}</div>
        </PanelCard>
      ))}
    </>
  );
}

// ---- About panel (with disclaimer) ----
function AboutPanel() {
  return (
    <>
      <PanelHeading title="About SATGene" />
      <PanelCard>
        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, margin: 0 }}>
          SATGene is a digital SAT planning, tracking, analytics, and study-planning prototype. It helps students
          organize official SAT and practice-test scores, review mistakes, monitor progress, calculate a superscore,
          and create personalized study plans.
        </p>
      </PanelCard>

      <PanelCard>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Developed by Ansh Saini</div>
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6, margin: 0 }}>
          SATGene was developed by Ansh Saini, a high school student, as an independent educational prototype. The
          project explores how responsible data tracking, analytics, and artificial intelligence can help students
          understand their SAT preparation progress and plan their next steps.
        </p>
      </PanelCard>

      <PanelCard>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Features</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: C.ink2, lineHeight: 1.7 }}>
          <li><b>Practice Hub</b> — organize practice and open study resources.</li>
          <li><b>SAT & Practice Test Tracker</b> — log official and practice results separately.</li>
          <li><b>Mistake Log</b> — record and categorize errors for review.</li>
          <li><b>Score Analytics</b> — trends across sections and test types.</li>
          <li><b>SAT Superscore</b> — best section scores across official SATs.</li>
          <li><b>AI SAT Plan & Practice Plan</b> — model-generated study guidance.</li>
          <li><b>Instant rule-based planning</b> — works with no AI.</li>
          <li><b>Test Simulator</b> — real structure and timing practice.</li>
          <li><b>User-specific saved data</b> — isolated to your account.</li>
        </ul>
        <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
          <b>Score types:</b> an <b>official SAT score</b> comes from a real College Board SAT; a <b>practice-test
          score</b> comes from practice; a <b>target score</b> is your goal; a <b>superscore</b> is a calculated
          combination of your best official SAT section scores.
        </p>
      </PanelCard>

      {/* Disclaimer */}
      <div style={{ background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginTop: 4 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, marginBottom: 12 }}>Important Disclaimer</div>
        {[
          ["Independent project", "SATGene is an independent educational prototype developed by Ansh Saini, a high school student. It is intended to help students organize test results, review mistakes, view performance trends, and create study plans."],
          ["No College Board affiliation", "SATGene is not affiliated with, endorsed by, approved by, or sponsored by College Board or any test-preparation company. SAT® is a trademark of College Board. SATGene does not issue official SAT scores, register students for the SAT, submit scores to colleges, reproduce official SAT questions, or provide official College Board services."],
          ["Superscore calculation", "The SAT superscore shown in SATGene is a mathematical calculation based on official SAT scores entered by the user. Colleges and universities may have different score-use and superscoring policies. Students must verify each institution's current policy directly."],
          ["AI recommendations", "AI-generated and rule-based recommendations may be incomplete, inaccurate, or unsuitable for a particular student. They should be treated as supplemental planning guidance, not professional educational, admissions, legal, or financial advice."],
          ["No guaranteed outcomes", "SATGene does not guarantee score improvement, college admission, scholarship eligibility, academic performance, or any other educational outcome."],
          ["User responsibility", "Students should verify SAT dates, registration requirements, official scores, testing policies, score-reporting requirements, superscoring policies, and college admission requirements through College Board and the relevant institutions. Users should not upload copyrighted test questions, official answer keys, confidential school records, or unnecessary sensitive personal information."],
          ["Prototype status", "SATGene is a student-developed prototype. Features may change, and the application may contain technical errors, inaccurate outputs, or temporary interruptions."],
        ].map(([t, d]) => (
          <div key={t} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{t}</div>
            <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.55 }}>{d}</div>
          </div>
        ))}
      </div>
    </>
  );
}


// ---------- Small UI helpers ----------
function Field({ label, children }) {
  return (
    <label style={{ display: "block", fontSize: 12, color: C.ink2, fontWeight: 600, marginTop: 6 }}>
      <div style={{ marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
function Tag({ children, c }) {
  return <span style={{ fontSize: 11.5, fontWeight: 600, color: c, background: `${c}18`, border: `1px solid ${c}40`, padding: "3px 9px", borderRadius: 20 }}>{children}</span>;
}
function Empty({ text }) {
  return <div style={{ padding: 24, textAlign: "center", color: C.ink2, fontSize: 14, background: C.soft, borderRadius: 12 }}>{text}</div>;
}

const inp = { width: "100%", padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 14, background: "#fff", color: C.ink, outline: "none" };
const btnPrimary = { marginTop: 14, background: C.accent, color: "#fff", border: "none", padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700 };
const btnGhost = { background: "none", border: "none", color: C.ink2, fontSize: 13, fontWeight: 600, padding: "6px 8px" };
const btnGhostSolid = { marginTop: 14, background: "#fff", color: C.ink, border: `1px solid ${C.line}`, padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700 };
