import React, { useState, useMemo, useEffect, useRef } from "react";
import Login from "./Login.jsx";
import { watchAuth, logout, loadUserData, saveUserData, deleteAccount, reauthenticate } from "./firebase";
import {
  blankMastery,
  recomputeMastery,
  computePriorities,
  nextBestAction,
  todaysMission,
  masteryStatus,
} from "./agent.js";
import { pickQuestion, DIFFICULTIES } from "./questionBank.js";

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
// SATGene Agent state (Phase 1). practiceEvents are individual adaptive-practice
// question results ({ skill, section, correct, difficulty, date }), the primary
// mastery signal once Phase 2 ships. missionCompleted tracks Today's Mission
// checkbox state per item id so it survives sign-out/sign-in.
const DEFAULT_PRACTICE_EVENTS = [];
const DEFAULT_MISSION_COMPLETED = {};
// Phase 3: a lightweight baseline snapshot of what the agent last showed the
// student (mastery per skill, top priority skill/reason, evidence counts). Diffing
// the live agent output against this baseline is what powers "SATGene Noticed"
// and "Why My Plan Changed" — entirely deterministic, no Gemini call involved.
const DEFAULT_AGENT_SNAPSHOT = null;

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

  // Agent state: practiceEvents/missionCompleted default to empty; mastery stays
  // null (not blankMastery()) so the caller can tell "never computed" apart from
  // "computed and everyone's unassessed" and feed the right seed into recomputeMastery.
  out.practiceEvents = Array.isArray(data.practiceEvents) ? data.practiceEvents : [];
  out.mastery = data.mastery && typeof data.mastery === "object" ? data.mastery : null;
  out.missionCompleted = data.missionCompleted && typeof data.missionCompleted === "object" ? data.missionCompleted : {};
  out.agentSnapshot = data.agentSnapshot && typeof data.agentSnapshot === "object" ? data.agentSnapshot : null;
  return out;
}

// ---- Agent snapshot & change tracking (Phase 3) ----
// Pure, deterministic helpers — no AI. buildAgentSnapshot captures a lightweight
// "what the agent showed the student" baseline; computeAgentNotices/buildPlanChangeExplanation
// diff the live agent output against that baseline.
function buildAgentSnapshot({ mastery, agentAction, mistakes, practiceEvents }) {
  const masterySnap = {};
  Object.keys(mastery || {}).forEach((skill) => { masterySnap[skill] = mastery[skill]?.mastery ?? null; });
  const isPractice = agentAction && agentAction.kind === "practice";
  return {
    mastery: masterySnap,
    topSkill: isPractice ? agentAction.skill : null,
    topSection: isPractice ? agentAction.section : null,
    topStatus: isPractice ? agentAction.status : null,
    topReason: agentAction ? agentAction.reason : null,
    mistakeCount: (mistakes || []).length,
    practiceEventCount: (practiceEvents || []).length,
    capturedAt: new Date().toISOString(),
  };
}

// Minimum mastery-point swing worth surfacing, so noise doesn't spam the card.
const NOTICE_MASTERY_THRESHOLD = 5;

function computeAgentNotices({ prevSnapshot, mastery, agentAction, mistakes, practiceEvents }) {
  if (!prevSnapshot) return [];
  const notices = [];

  Object.keys(mastery || {}).forEach((skill) => {
    const now = mastery[skill]?.mastery ?? null;
    const before = prevSnapshot.mastery ? prevSnapshot.mastery[skill] : undefined;
    if (before === undefined || before == null || now == null) return;
    const delta = now - before;
    if (Math.abs(delta) >= NOTICE_MASTERY_THRESHOLD) {
      notices.push({
        id: `mastery-${skill}`,
        kind: delta > 0 ? "up" : "down",
        text: `${skill} mastery ${delta > 0 ? "rose" : "dropped"} from ${before}% to ${now}% (now ${masteryStatus(now)}).`,
      });
    }
  });

  const newMistakes = (mistakes || []).length - (prevSnapshot.mistakeCount || 0);
  if (newMistakes > 0) {
    notices.push({
      id: "new-mistakes",
      kind: "info",
      text: `${newMistakes} new mistake${newMistakes === 1 ? "" : "s"} logged since your last visit.`,
    });
  }

  const newPractice = (practiceEvents || []).length - (prevSnapshot.practiceEventCount || 0);
  if (newPractice > 0) {
    notices.push({
      id: "new-practice",
      kind: "info",
      text: `${newPractice} adaptive practice question${newPractice === 1 ? "" : "s"} answered since your last visit.`,
    });
  }

  const nowTop = agentAction && agentAction.kind === "practice" ? agentAction.skill : null;
  if (nowTop && prevSnapshot.topSkill && nowTop !== prevSnapshot.topSkill) {
    notices.push({
      id: "priority-shift",
      kind: "shift",
      text: `Your #1 priority shifted from ${prevSnapshot.topSkill} to ${nowTop}.`,
    });
  }

  return notices;
}

function buildPlanChangeExplanation({ prevSnapshot, agentAction }) {
  if (!prevSnapshot || !prevSnapshot.topSkill) return null;
  const nowTop = agentAction && agentAction.kind === "practice" ? agentAction.skill : null;
  if (!nowTop) return null;
  if (nowTop === prevSnapshot.topSkill) {
    return { changed: false, text: `Still ${nowTop} — ${agentAction.reason}` };
  }
  return {
    changed: true,
    from: prevSnapshot.topSkill,
    to: nowTop,
    text: `Moved from ${prevSnapshot.topSkill} to ${nowTop}. ${agentAction.reason}`,
  };
}

// ============================================================
// DEMO STUDENT MODE (Phase 4)
// ------------------------------------------------------------
// A fully local, sample-data walkthrough of the app for people who don't want to
// create an account. It NEVER touches Firestore: AppShell short-circuits both the
// load effect and the save effect whenever `demo` is true (see AppShell below),
// so nothing here can ever be written into a real user's data. Every screen that
// shows demo data also carries a visible "Demo" label so it's never mistaken for
// a real account.
// ============================================================
const DEMO_USER = { uid: "demo-student", displayName: "Demo Student", email: "demo@satgene.app (sample account)", photoURL: null };

const DEMO_PROFILE = { name: "Jordan", fullName: "Jordan Rivera (Demo)", gradYear: "2027", school: "Sample High School", timezone: "" };

const demoISO = (daysFromToday) => new Date(Date.now() + daysFromToday * 86400000).toISOString().slice(0, 10);

const DEMO_GOAL = {
  satTarget: 1550,
  practiceTarget: 1520,
  nextSatDate: demoISO(62),
  nextPracticeDate: demoISO(18),
  legacyCurrent: null,
};

const DEMO_ATTEMPTS = [
  { id: 9001, date: demoISO(-70), testType: "Practice", source: "Bluebook", rw: 690, math: 700 },
  { id: 9002, date: demoISO(-14), testType: "SAT", source: "College Board", rw: 740, math: 740 }, // 1480 total — the Section 23 scenario
];

// The baseline is what the agent showed "last time" — four Craft and Structure
// mistakes, nothing else yet. The current set adds new Algebra mistakes so the
// demo visibly shows a priority shift, plus one mastered mistake for realism.
const DEMO_MISTAKES_BASELINE = [
  { id: 9101, date: demoISO(-13), testType: "SAT", source: "College Board", section: "Reading & Writing", skill: "Craft and Structure", difficulty: "Medium", why: "Concept gap", concept: "Missed the author's tone shift in the second paragraph.", mastered: false },
  { id: 9102, date: demoISO(-13), testType: "SAT", source: "College Board", section: "Reading & Writing", skill: "Craft and Structure", difficulty: "Hard", why: "Misread", concept: "Confused the rhetorical purpose of the closing sentence.", mastered: false },
  { id: 9103, date: demoISO(-12), testType: "SAT", source: "College Board", section: "Reading & Writing", skill: "Craft and Structure", difficulty: "Medium", why: "Concept gap", concept: "Picked a choice that restated the passage instead of analyzing its structure.", mastered: false },
  { id: 9104, date: demoISO(-12), testType: "SAT", source: "College Board", section: "Reading & Writing", skill: "Craft and Structure", difficulty: "Hard", why: "Ran out of time", concept: "Guessed under time pressure on a word-in-context question.", mastered: false },
];
const DEMO_MISTAKES = [
  ...DEMO_MISTAKES_BASELINE,
  { id: 9105, date: demoISO(-3), testType: "Practice", source: "Khan Academy", section: "Math", skill: "Algebra", difficulty: "Medium", why: "Careless", concept: "Dropped a negative sign when distributing.", mastered: false },
  { id: 9106, date: demoISO(-2), testType: "Practice", source: "Khan Academy", section: "Math", skill: "Algebra", difficulty: "Hard", why: "Concept gap", concept: "Set up the system of equations with the wrong variable order.", mastered: false },
  { id: 9107, date: demoISO(-2), testType: "Practice", source: "Student Question Bank", section: "Math", skill: "Algebra", difficulty: "Medium", why: "Concept gap", concept: "Forgot to check the solution against the original equation.", mastered: false },
];

const DEMO_PLANS = [];

const DEMO_PRACTICE_EVENTS = [
  { skill: "Craft and Structure", section: "Reading & Writing", correct: true, difficulty: "medium", date: demoISO(-4) },
  { skill: "Craft and Structure", section: "Reading & Writing", correct: true, difficulty: "medium", date: demoISO(-4) },
  { skill: "Craft and Structure", section: "Reading & Writing", correct: true, difficulty: "hard", date: demoISO(-1) },
  { skill: "Craft and Structure", section: "Reading & Writing", correct: false, difficulty: "hard", date: demoISO(-1) },
];

const DEMO_MISSION_COMPLETED = {};

// Baseline mastery/priorities/action as they would have looked BEFORE the new
// Algebra mistakes and Craft and Structure practice arrived — this becomes both
// the mastery recompute seed (so it folds forward with a real trend) and the
// stored "SATGene Noticed" / "Why My Plan Changed" baseline.
const DEMO_BASELINE_MASTERY = recomputeMastery({ mastery: null, attempts: DEMO_ATTEMPTS, mistakes: DEMO_MISTAKES_BASELINE, practiceEvents: [] });
const DEMO_BASELINE_PRIORITIES = computePriorities({ mastery: DEMO_BASELINE_MASTERY, mistakes: DEMO_MISTAKES_BASELINE, goal: DEMO_GOAL, attempts: DEMO_ATTEMPTS });
const DEMO_BASELINE_ACTION = nextBestAction({ priorities: DEMO_BASELINE_PRIORITIES, mistakes: DEMO_MISTAKES_BASELINE, attempts: DEMO_ATTEMPTS });
const DEMO_AGENT_SNAPSHOT = buildAgentSnapshot({ mastery: DEMO_BASELINE_MASTERY, agentAction: DEMO_BASELINE_ACTION, mistakes: DEMO_MISTAKES_BASELINE, practiceEvents: [] });

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
  // Demo Student mode: a fully local walkthrough with sample data, never tied to
  // (or capable of writing into) a real signed-in account. See AppShell for the
  // hard guard that skips Firestore entirely while this is true.
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const unsub = watchAuth((u) => {
      setUser(u);
      setAuthState(u ? "in" : "out");
    });
    return unsub;
  }, []);

  if (demo) {
    return <AppShell user={DEMO_USER} demo onExitDemo={() => setDemo(false)} />;
  }

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

  if (authState === "out") return <Login onTryDemo={() => setDemo(true)} />;

  return <AppShell user={user} />;
}

function AppShell({ user, demo = false, onExitDemo }) {
  const [tab, setRawTab] = useState("hub");
  // Sub-tabs for the two grouped nav areas (My Results, Practice). Kept as separate
  // state so switching the primary tab never loses the student's place inside it.
  const [resultsTab, setResultsTab] = useState("scores"); // scores | mistakes
  const [practiceTab, setPracticeTab] = useState("adaptive"); // adaptive | full | resources
  // Back-compat navigation shim: every existing call site in this file still calls
  // setTab("tracker" | "mistakes" | "analytics" | "sim" | ...) — the pre-simplification
  // tab ids. Rather than touch every one of those call sites (and risk missing one),
  // this translates the old ids into the new 5-tab structure + the right sub-tab, so
  // "Log a test score", "Review Mistake Log", "Add Test Result", etc. all still land
  // in the correct place under My Results / Practice / Progress. New code can also
  // call setTab("results"), setTab("practice"), setTab("progress"), setTab("planner")
  // directly.
  const setTab = (target) => {
    switch (target) {
      case "tracker":
        setRawTab("results"); setResultsTab("scores"); break;
      case "mistakes":
        setRawTab("results"); setResultsTab("mistakes"); break;
      case "analytics":
        setRawTab("progress"); break;
      case "sim":
        setRawTab("practice"); setPracticeTab("adaptive"); break;
      default:
        setRawTab(target);
    }
  };
  const [profile, setProfile] = useState(demo ? DEMO_PROFILE : DEFAULT_PROFILE);
  const [goal, setGoal] = useState(demo ? DEMO_GOAL : DEFAULT_GOAL);
  const [attempts, setAttempts] = useState(demo ? DEMO_ATTEMPTS : DEFAULT_ATTEMPTS);
  const [mistakes, setMistakes] = useState(demo ? DEMO_MISTAKES : DEFAULT_MISTAKES);
  const [plans, setPlans] = useState(demo ? DEMO_PLANS : DEFAULT_PLANS);
  // ---- SATGene Agent state (Phase 1) ----
  const [practiceEvents, setPracticeEvents] = useState(demo ? DEMO_PRACTICE_EVENTS : DEFAULT_PRACTICE_EVENTS);
  const [mastery, setMastery] = useState(() => blankMastery());
  const [missionCompleted, setMissionCompleted] = useState(demo ? DEMO_MISSION_COMPLETED : DEFAULT_MISSION_COMPLETED);
  const [agentSnapshot, setAgentSnapshot] = useState(demo ? DEMO_AGENT_SNAPSHOT : DEFAULT_AGENT_SNAPSHOT);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncState, setSyncState] = useState("idle"); // idle | saving | saved | error

  // Holds the mastery map as saved in Firestore until the first recompute pass
  // consumes it (so mastery.history/trend carries forward across sessions instead
  // of resetting every reload).
  const loadedMasteryRef = useRef(null);

  // Load this user's data from Firestore once on sign-in, migrating older shapes.
  // HARD SAFETY GUARD: in Demo Student mode this never runs — demo state is seeded
  // entirely from the local DEMO_* constants above and Firestore is never touched.
  useEffect(() => {
    if (demo) {
      // Seed the mastery recompute below from the demo baseline (not from Firestore)
      // and mark data "loaded" so the rest of the app renders immediately.
      loadedMasteryRef.current = DEMO_BASELINE_MASTERY;
      setDataLoaded(true);
      return;
    }
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
          if (Array.isArray(data.practiceEvents)) setPracticeEvents(data.practiceEvents);
          if (data.missionCompleted) setMissionCompleted(data.missionCompleted);
          if (data.agentSnapshot) setAgentSnapshot(data.agentSnapshot);
          loadedMasteryRef.current = data.mastery || null;
        }
        // If no data doc exists yet, the defaults stay and get saved on first change.
      } catch (e) {
        console.error("Load failed:", e);
      } finally {
        if (!cancelled) setDataLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user.uid, demo]);

  // Recompute mastery deterministically whenever evidence changes (new test, new
  // mistake, or — from Phase 2 on — a new adaptive-practice result). Runs fully
  // offline; no Gemini call. On the first pass after load it seeds from the saved
  // mastery map (preserving history/trend); after that it folds forward from state.
  //
  // Phase 3: the very first time real evidence exists and no agent snapshot has
  // ever been captured, this effect also lays down that baseline — computed from
  // the SAME freshly-recomputed mastery (not the old state value, which would
  // still be stale in this render pass) so "SATGene Noticed" has something correct
  // to diff against on the student's next visit.
  useEffect(() => {
    if (!dataLoaded) return;
    setMastery((prev) => {
      const seed = loadedMasteryRef.current !== null ? loadedMasteryRef.current : prev;
      loadedMasteryRef.current = null;
      const next = recomputeMastery({ mastery: seed, attempts, mistakes, practiceEvents });
      setAgentSnapshot((snap) => {
        if (snap !== null) return snap;
        if (attempts.length === 0 && mistakes.length === 0) return snap;
        const prio = computePriorities({ mastery: next, mistakes, goal, attempts });
        const action = nextBestAction({ priorities: prio, mistakes, attempts });
        return buildAgentSnapshot({ mastery: next, agentAction: action, mistakes, practiceEvents });
      });
      return next;
    });
  }, [attempts, mistakes, practiceEvents, dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to Firestore whenever data changes (after the initial load completes).
  // HARD SAFETY GUARD: Demo Student mode NEVER reaches saveUserData — this is the
  // one line that guarantees sample data can't leak into (or overwrite) a real
  // account. Every other demo behavior lives entirely in React state.
  useEffect(() => {
    if (demo) return;
    if (!dataLoaded) return;
    setSyncState("saving");
    const t = setTimeout(async () => {
      try {
        await saveUserData(user.uid, { profile, goal, attempts, mistakes, plans, mastery, practiceEvents, missionCompleted, agentSnapshot });
        setSyncState("saved");
      } catch (e) {
        console.error("Save failed:", e);
        setSyncState("error");
      }
    }, 600); // debounce so rapid edits don't spam writes
    return () => clearTimeout(t);
  }, [profile, goal, attempts, mistakes, plans, mastery, practiceEvents, missionCompleted, agentSnapshot, dataLoaded, user.uid, demo]);

  // ---- Derived agent outputs (pure, deterministic, no AI call) ----
  const priorities = useMemo(
    () => computePriorities({ mastery, mistakes, goal, attempts }),
    [mastery, mistakes, goal, attempts]
  );
  const agentAction = useMemo(
    () => nextBestAction({ priorities, mistakes, attempts }),
    [priorities, mistakes, attempts]
  );
  const mission = useMemo(
    () => todaysMission({ priorities, mistakes, attempts, goal, completed: missionCompleted }),
    [priorities, mistakes, attempts, goal, missionCompleted]
  );
  const toggleMissionItem = (id) => setMissionCompleted((prev) => ({ ...prev, [id]: !prev[id] }));

  // ---- Auto-reassessment change tracking (Phase 3, pure/deterministic, no AI) ----
  const agentNotices = useMemo(
    () => computeAgentNotices({ prevSnapshot: agentSnapshot, mastery, agentAction, mistakes, practiceEvents }),
    [agentSnapshot, mastery, agentAction, mistakes, practiceEvents]
  );
  const planChange = useMemo(
    () => buildPlanChangeExplanation({ prevSnapshot: agentSnapshot, agentAction }),
    [agentSnapshot, agentAction]
  );
  const dismissAgentNotices = () => {
    setAgentSnapshot(buildAgentSnapshot({ mastery, agentAction, mistakes, practiceEvents }));
  };

  // ---- Adaptive practice launch (Phase 2) ----
  // A single piece of shared state so any entry point (Next Best Action, Today's
  // Mission, or a manual pick inside the Simulator itself) drives the same
  // adaptive-practice flow — no duplicate launch logic.
  const [adaptiveLaunch, setAdaptiveLaunch] = useState(null);
  const launchAdaptivePractice = (spec) => { setAdaptiveLaunch(spec); setTab("sim"); };
  const recordPracticeEvent = (evt) => setPracticeEvents((prev) => [...prev, evt]);

  // Resolve the display name: student-entered name first, then Google name, else "Student".
  const displayName =
    (profile.name && profile.name.trim()) ||
    (user.displayName && user.displayName.trim()) ||
    "Student";

  return (
    <div className="sg-app" style={{ background: C.paper, minHeight: "100vh", fontFamily: FONT_BODY, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        .sg-app { width: 100%; max-width: 100%; overflow-x: hidden; }
        .sg-tab { transition: all .15s ease; }
        .sg-tab:hover { color: ${C.ink}; }
        .sg-card { transition: transform .15s ease, box-shadow .15s ease; }
        .sg-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(18,32,58,.10); }
        input, select, textarea { font-family: inherit; max-width: 100%; }
        a { color: ${C.accent}; }
        .sg-focus:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; border-radius: 6px; }

        /* Responsive page container: replaces fixed 20px desktop padding on mobile.
           1200px keeps desktop balanced (cards/charts have room to breathe) without
           stretching content edge-to-edge on large monitors. */
        .sg-container { width: 100%; max-width: 1200px; margin-inline: auto; padding-inline: 20px; }
        /* Auto-fit card grids: min column basis shrinks on mobile so nothing overflows */
        .sg-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        .sg-grid > * { min-width: 0; }
        /* Form field grids */
        .sg-fields { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        .sg-fields > * { min-width: 0; }
        /* flex children that must be allowed to shrink */
        .sg-min0 { min-width: 0; }

        .sg-name-text { }

        @media (max-width: 720px) {
          .sg-more-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .sg-container { padding-inline: 16px; }
          .sg-grid { grid-template-columns: 1fr; }
          .sg-fields { grid-template-columns: 1fr; }
          .sg-btn-row { flex-direction: column; align-items: stretch; }
          .sg-btn-row > button, .sg-btn-row > label { width: 100%; }
        }
        @media (max-width: 560px) {
          .sg-name-btn { display: none; }
        }
        @media (max-width: 359px) {
          .sg-container { padding-inline: 12px; }
        }
        .sg-h2 { font-size: 26px; }
        @media (max-width: 640px) {
          .sg-h2 { font-size: 22px; }
          .sg-sim-timer { font-size: 48px !important; }
        }
        @media (prefers-reduced-motion: reduce){ .sg-card, .sg-tab { transition: none; } }

        /* Hide scrollbar on the horizontal nav while keeping it scrollable */
        .sg-nav-scroll { overflow-x: auto; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .sg-nav-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {demo && <DemoBanner onExitDemo={onExitDemo} />}

      <Header attempts={attempts} goal={goal} user={user} syncState={syncState} displayName={displayName} setTab={setTab} demo={demo} onExitDemo={onExitDemo} />

      <Nav tab={tab} setTab={setTab} />

      <main className="sg-container" style={{ paddingBottom: 40 }}>
        {tab === "hub" && (
          <Hub
            mastery={mastery}
            priorities={priorities}
            agentAction={agentAction}
            mission={mission}
            missionCompleted={missionCompleted}
            onToggleMission={toggleMissionItem}
            attempts={attempts}
            mistakes={mistakes}
            goal={goal}
            setTab={setTab}
            onStartPractice={launchAdaptivePractice}
            agentNotices={agentNotices}
            planChange={planChange}
            onDismissNotices={dismissAgentNotices}
          />
        )}
        {tab === "results" && (
          <ResultsPage
            resultsTab={resultsTab}
            setResultsTab={setResultsTab}
            attempts={attempts}
            setAttempts={setAttempts}
            mistakes={mistakes}
            setMistakes={setMistakes}
          />
        )}
        {tab === "practice" && (
          <PracticePage
            practiceTab={practiceTab}
            setPracticeTab={setPracticeTab}
            adaptiveLaunch={adaptiveLaunch}
            onConsumeLaunch={() => setAdaptiveLaunch(null)}
            agentAction={agentAction}
            onPracticeResult={recordPracticeEvent}
          />
        )}
        {tab === "progress" && (
          <Progress attempts={attempts} mistakes={mistakes} goal={goal} setTab={setTab} mastery={mastery} priorities={priorities} />
        )}
        {tab === "planner" && (
          <Planner
            attempts={attempts} mistakes={mistakes} goal={goal} setGoal={setGoal}
            plans={plans} setPlans={setPlans} setTab={setTab}
          />
        )}
        {tab === "more" && (
          <MorePage
            user={user} displayName={displayName} syncState={syncState}
            profile={profile} setProfile={setProfile}
            goal={goal} setGoal={setGoal}
            attempts={attempts} mistakes={mistakes} plans={plans}
            setAttempts={setAttempts} setMistakes={setMistakes} setPlans={setPlans}
            mastery={mastery} practiceEvents={practiceEvents} missionCompleted={missionCompleted}
            setMastery={setMastery} setPracticeEvents={setPracticeEvents} setMissionCompleted={setMissionCompleted}
            agentSnapshot={agentSnapshot} setAgentSnapshot={setAgentSnapshot}
            demo={demo} onExitDemo={onExitDemo}
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
// A persistent, unmissable banner across the very top of the app while in Demo
// Student mode — the primary "clearly labeled" requirement for the demo.
function DemoBanner({ onExitDemo }) {
  return (
    <div style={{ background: C.ink, color: "#fff", textAlign: "center", padding: "9px 16px", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span>Demo Student Mode — you're viewing sample data. Nothing here is saved to a real account.</span>
      <button onClick={onExitDemo} className="sg-focus" style={{ background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 8, padding: "4px 12px", fontSize: 12.5, fontWeight: 700 }}>
        Exit demo
      </button>
    </div>
  );
}

function Header({ goal, attempts, user, syncState, displayName, setTab, demo, onExitDemo }) {
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
      <style>{`
        /* Slim account utility row (~42px) */
        .sg-acct-row { display: flex; justify-content: flex-end; align-items: center; gap: 8px; height: 42px; }
        /* Reserve space for the save status so account controls never shift */
        .sg-save-slot { display: inline-flex; justify-content: flex-end; align-items: center; min-width: 84px; }

        /* Main header row: logo left, scores right, tight vertical spacing */
        .sg-header-main { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; padding-top: 6px; padding-bottom: 12px; }
        .sg-logo { font-size: 28px; }
        .sg-tagline { font-size: 13px; color: ${C.ink2}; margin-top: 3px; }

        /* Content-sized score cards via flexible auto-fit grid */
        .sg-scores { display: grid; grid-auto-flow: column; grid-auto-columns: max-content; gap: 10px; justify-content: end; }

        /* Tablet / narrow desktop: wrap to 3 + 2 instead of squeezing */
        @media (max-width: 900px) {
          .sg-header-main { align-items: flex-start; }
          .sg-scores { grid-auto-flow: row; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-columns: auto; width: 100%; }
          .sg-scores > * { min-width: 0; }
          .sg-stat { min-width: 0 !important; }
          /* Superscore sits in row 1 col 3; Target & Gap wrap to row 2 */
          .sg-super-card { min-width: 0 !important; }
        }
        @media (max-width: 640px) {
          .sg-header-main { align-items: center; padding-bottom: 12px; }
          .sg-logo { font-size: 24px; }
          .sg-tagline { display: none; }
          .sg-scores { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sg-super-card { grid-column: 1 / -1; }
        }
        @media (max-width: 340px) {
          .sg-scores { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* account utility row — slim, no divider, reserved save-status width */}
      <div style={{ background: C.card }}>
        <div className="sg-container sg-acct-row">
          <span className="sg-save-slot"><SaveStatus syncState={syncState} demo={demo} /></span>
          <AccountArea user={user} displayName={displayName} setTab={setTab} demo={demo} onExitDemo={onExitDemo} />
        </div>
      </div>

      <div className="sg-container sg-header-main">
        <div className="sg-min0">
          <div className="sg-logo" style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>
            SATGene
          </div>
          <div className="sg-tagline">
            Adaptive SAT Preparation Agent
          </div>
        </div>
        <div className="sg-scores">
          <Stat label="Days to SAT" value={daysValue} accent={daysAccent} small={days == null} />
          <Stat label="Latest Score" value={latestScore == null ? "No score" : latestScore} sub={source} small={latestScore == null} />
          <SuperscoreStat superscore={superscore} fmtShort={fmtShort} />
          <Stat label="Target" value={target} />
          <Stat label="Gap" value={gapValue} accent={gapAccent} sub={gapBasisLabel} small={gapValue === "Target reached"} />
        </div>
      </div>
    </header>
  );
}

// Superscore header card (slightly wider, two-line detail, abbreviated dates)
function SuperscoreStat({ superscore, fmtShort }) {
  const fullDates = superscore
    ? `R&W ${superscore.rw} on ${new Date(superscore.rwDate).toLocaleDateString()} · Math ${superscore.math} on ${new Date(superscore.mathDate).toLocaleDateString()}`
    : undefined;
  if (!superscore) {
    return (
      <div className="sg-super-card" style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 13px", background: C.paper }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.ink2, whiteSpace: "nowrap" }}>Superscore</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: C.ink2, lineHeight: 1.15, marginTop: 3 }}>Not available</div>
        <div style={{ fontSize: 11, color: C.ink2, marginTop: 2 }}>Requires 2 SAT tests</div>
      </div>
    );
  }
  return (
    <div className="sg-super-card" title={fullDates} style={{ border: `1px solid ${C.accent}`, borderRadius: 12, padding: "10px 13px", background: C.paper }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.accent, fontWeight: 700, whiteSpace: "nowrap" }}>Superscore</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 29, color: C.ink, lineHeight: 1.1, marginTop: 1 }}>{superscore.total}</div>
      <div style={{ fontSize: 11, color: C.ink2, marginTop: 2, overflowWrap: "anywhere", lineHeight: 1.3 }}>R&W {superscore.rw} · {fmtShort(superscore.rwDate)}</div>
      <div style={{ fontSize: 11, color: C.ink2, overflowWrap: "anywhere", lineHeight: 1.3 }}>Math {superscore.math} · {fmtShort(superscore.mathDate)}</div>
    </div>
  );
}

// Transient save status: shows Saving…, then ✓ Saved which auto-hides after ~2.5s.
// In Demo Student mode the save pipeline never runs (see AppShell's save effect),
// so this shows a permanent, unambiguous "Demo — not saved" label instead.
function SaveStatus({ syncState, demo }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (syncState === "saving" || syncState === "error") { setVisible(true); return; }
    if (syncState === "saved") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(t);
    }
  }, [syncState]);

  if (demo) {
    return (
      <span aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.accent2, fontWeight: 600, fontSize: 12 }}>
        Demo — not saved
      </span>
    );
  }

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
function AccountArea({ user, displayName, setTab, demo, onExitDemo }) {
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => setTab("more")}
        className="sg-focus sg-name-btn"
        style={{ background: "none", border: "none", padding: "2px 2px", fontSize: 13.5, fontWeight: 600, color: C.ink, cursor: "pointer" }}
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
          <div role="menu" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "min(280px, calc(100vw - 24px))", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 10px 34px rgba(18,32,58,.16)", overflow: "hidden", zIndex: 60 }}>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, overflowWrap: "anywhere" }}>{displayName}{demo && <Tag c={C.accent2}> Demo</Tag>}</div>
              <div style={{ fontSize: 12.5, color: C.ink2, overflowWrap: "anywhere" }}>{user?.email}</div>
            </div>
            <div style={{ height: 1, background: C.soft }} />
            <div style={{ padding: 6 }}>
              <button
                ref={firstItemRef}
                role="menuitem"
                onClick={() => { setOpen(false); demo ? onExitDemo?.() : logout(); }}
                className="sg-focus"
                style={{ ...menuItemStyle, color: "#B4443A", fontWeight: 600 }}
              >
                <IconSignOut /> <span>{demo ? "Exit demo" : "Sign out"}</span>
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
    <div className="sg-stat" style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 13px", background: C.paper }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.ink2, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: small ? 16 : 29, color: accent, lineHeight: 1.1, marginTop: small ? 3 : 1, overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.ink2, marginTop: 2, fontWeight: 500, overflowWrap: "anywhere", lineHeight: 1.25 }}>{sub}</div>}
    </div>
  );
}

// ---------- Nav ----------
function Nav({ tab, setTab }) {
  const tabs = [
    ["hub", "Home"],
    ["results", "My Results"],
    ["practice", "Practice"],
    ["progress", "Progress"],
    ["more", "More"],
  ];
  const refs = React.useRef({});
  useEffect(() => {
    const el = refs.current[tab];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [tab]);

  return (
    <nav style={{ background: C.card, borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 10 }}>
      <div className="sg-container sg-nav-scroll" style={{ display: "flex", gap: 4, whiteSpace: "nowrap" }}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            ref={(el) => { refs.current[id] = el; }}
            className="sg-tab sg-focus"
            onClick={() => setTab(id)}
            style={{
              border: "none",
              background: "none",
              padding: "14px 14px",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
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
      <h2 className="sg-h2" style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, margin: "4px 0 0", letterSpacing: -0.4, overflowWrap: "anywhere" }}>{title}</h2>
      {sub && <p style={{ color: C.ink2, fontSize: 14, marginTop: 6, maxWidth: 640 }}>{sub}</p>}
    </div>
  );
}

// ---------- 1. PRACTICE HUB (the centerpiece) ----------
function Hub({ mastery, priorities, agentAction, mission, missionCompleted, onToggleMission, attempts, mistakes, goal, setTab, onStartPractice, agentNotices, planChange, onDismissNotices }) {
  return (
    <AgentDashboard
      mastery={mastery}
      priorities={priorities}
      agentAction={agentAction}
      mission={mission}
      missionCompleted={missionCompleted}
      onToggleMission={onToggleMission}
      onStartPractice={onStartPractice}
      attempts={attempts}
      mistakes={mistakes}
      goal={goal}
      setTab={setTab}
      agentNotices={agentNotices}
      planChange={planChange}
      onDismissNotices={onDismissNotices}
    />
  );
}

// ---------- SATGene Agent Dashboard (Phase 1) ----------
// Reads real saved data (attempts, mistakes → mastery via agent.js) and surfaces
// the Next Best Action + Today's Mission + a live SAT Mastery map. Falls back to a
// diagnostic prompt when there isn't yet enough evidence to recommend anything.
function AgentDashboard({ mastery, priorities, agentAction, mission, missionCompleted, onToggleMission, onStartPractice, attempts, mistakes, goal, setTab, agentNotices, planChange, onDismissNotices }) {
  const hasEvidence = (attempts && attempts.length > 0) || (mistakes && mistakes.length > 0);

  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 24, margin: 0, letterSpacing: -0.4 }}>
        SATGene Agent
      </h2>
      <p style={{ color: C.ink2, fontSize: 14, margin: "6px 0 20px", maxWidth: 640 }}>
        Your adaptive SAT coach. It reads your real My Results data — no guessing — and tells you exactly what to work on next.
      </p>

      {!hasEvidence ? (
        <DiagnosticFallback setTab={setTab} />
      ) : (
        <>
          <div className="sg-agent-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16, marginBottom: 16, alignItems: "stretch" }}>
            <style>{`@media (max-width: 860px){ .sg-agent-grid { grid-template-columns: 1fr !important; } }`}</style>
            <NextActionCard action={agentAction} setTab={setTab} onStartPractice={onStartPractice} />
            <MissionCard mission={mission} missionCompleted={missionCompleted} onToggle={onToggleMission} setTab={setTab} onStartPractice={onStartPractice} />
          </div>
          <NoticedCard notices={agentNotices} onDismiss={onDismissNotices} />
          <PlanChangeCard planChange={planChange} />
        </>
      )}

      <MasterySnapshot mastery={mastery} priorities={priorities} setTab={setTab} />
      <ActiveStudyPlanCard goal={goal} priorities={priorities} setTab={setTab} />
    </div>
  );
}

// ---- Mastery Snapshot (Home): a deliberately short list, not the full mastery
// model — weakest + second priority + a couple of stronger skills, so Home stays
// scannable. The full breakdown lives at Progress → SAT Mastery (MasteryPanel).
function MasterySnapshot({ mastery, priorities, setTab }) {
  const allSkills = Object.values(SKILLS).flat();
  const priorityBySkill = {};
  (priorities || []).forEach((p, i) => { priorityBySkill[p.skill] = i; });

  const weakest = priorities && priorities[0] ? priorities[0].skill : null;
  const second = priorities && priorities[1] ? priorities[1].skill : null;
  const shown = new Set([weakest, second].filter(Boolean));

  const stronger = allSkills
    .filter((s) => !shown.has(s) && mastery?.[s]?.mastery != null)
    .sort((a, b) => mastery[b].mastery - mastery[a].mastery)
    .slice(0, 2);

  const seen = new Set();
  const displaySkills = [weakest, second, ...stronger].filter((s) => s && !seen.has(s) && (seen.add(s), true));

  return (
    <div style={{ marginTop: 4, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>Mastery Snapshot</div>
        <button onClick={() => setTab("progress")} className="sg-focus" style={{ ...btnGhost, padding: "4px 6px" }}>View all mastery →</button>
      </div>
      {displaySkills.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, fontSize: 13.5, color: C.ink2 }}>
          Not enough evidence yet to rank your skills. Log a test score, a mistake, or complete a practice set to get started.
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, display: "grid", gap: 14 }}>
          {displaySkills.map((skill) => (
            <MasteryRow key={skill} skill={skill} rec={mastery?.[skill]} rank={priorityBySkill[skill]} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Active Study Plan (Home): a compact pointer into the AI Planner, which is
// no longer in the primary nav — this + Progress are the only ways in.
function ActiveStudyPlanCard({ goal, priorities, setTab }) {
  const topSkill = priorities && priorities[0] ? priorities[0].skill : "Not enough data yet";
  const nextSatText = goal.nextSatDate ? fmtAbbr(goal.nextSatDate) : "Not scheduled";
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
      <CardKicker>Active Study Plan</CardKicker>
      <div style={{ display: "grid", gap: 4, margin: "10px 0 14px", fontSize: 13.5, color: C.ink2 }}>
        <div><b style={{ color: C.ink }}>SAT Target:</b> {goal.satTarget}</div>
        <div><b style={{ color: C.ink }}>Next SAT:</b> {nextSatText}</div>
        <div><b style={{ color: C.ink }}>Current Priority:</b> {topSkill}</div>
      </div>
      <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 14px", lineHeight: 1.5 }}>
        SATGene automatically adjusts recommendations when new results are recorded.
      </p>
      <button onClick={() => setTab("planner")} style={{ ...btnGhostSolid, marginTop: 0 }}>View Full Plan →</button>
    </div>
  );
}

// ---- SATGene Noticed / Why My Plan Changed (Phase 3) ----
// Both cards are pure renders of deterministic diffs computed in AppShell
// (computeAgentNotices / buildPlanChangeExplanation) — no AI call involved.
function NoticedCard({ notices, onDismiss }) {
  if (!notices || notices.length === 0) return null;
  return (
    <div role="status" style={{ background: C.card, border: `1px solid ${C.accent}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AgentBadge />
          <div style={{ fontWeight: 800, fontSize: 14.5, fontFamily: FONT_DISPLAY }}>SATGene Noticed</div>
        </div>
        <button onClick={onDismiss} className="sg-focus" style={btnGhost} aria-label="Dismiss these updates">Got it</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {notices.map((n) => (
          <div key={n.id} style={{ fontSize: 13.5, color: C.ink2, display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.5 }}>
            <span aria-hidden="true" style={{ color: n.kind === "up" ? C.accent : n.kind === "down" ? "#B4443A" : C.accent2, flexShrink: 0, fontWeight: 700 }}>
              {n.kind === "up" ? "↑" : n.kind === "down" ? "↓" : "•"}
            </span>
            <span>{n.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanChangeCard({ planChange }) {
  if (!planChange) return null;
  return (
    <div style={{ background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.accent, fontWeight: 700, marginBottom: 6 }}>
        Why my plan {planChange.changed ? "changed" : "stayed the same"}
      </div>
      <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55 }}>{planChange.text}</div>
    </div>
  );
}

function AgentBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 0.6, color: "#fff", background: C.accent,
      padding: "4px 10px", borderRadius: 20,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2z" fill="#fff" />
      </svg>
      Agent
    </span>
  );
}

function DiagnosticFallback({ setTab }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 24 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
        Not enough data yet — let's run a quick diagnostic
      </div>
      <p style={{ color: C.ink2, fontSize: 14, lineHeight: 1.6, margin: "0 0 16px", maxWidth: 560 }}>
        The agent builds your mastery map from real results: a logged test score or a few entries in the Mistake Log.
        Add either one and SATGene will name your #1 priority skill with a data-grounded reason — no guessing, no fake numbers.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setTab("tracker")} style={btnPrimary}>Log a test score</button>
        <button onClick={() => setTab("mistakes")} style={btnGhostSolid}>Log a mistake</button>
      </div>
    </div>
  );
}

function NextActionCard({ action, setTab, onStartPractice }) {
  if (!action || action.kind === "diagnostic") {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <CardKicker>Next Best Action</CardKicker>
        <p style={{ color: C.ink2, fontSize: 14, margin: "8px 0 0" }}>{action?.reason}</p>
      </div>
    );
  }
  const statusColor = action.status === "Needs Review" ? "#B4443A" : action.status === "Developing" ? C.accent2 : C.accent;
  const start = () => {
    if (onStartPractice) {
      onStartPractice({
        section: action.section,
        skill: action.skill,
        difficulty: action.startDifficulty,
        questionCount: action.questionCount,
        minutes: action.minutes,
        reason: action.reason,
        source: "nextAction",
      });
    } else {
      setTab("sim");
    }
  };
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column" }}>
      <CardKicker>Next Best Action</CardKicker>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "8px 0 4px" }}>
        <Tag c={action.section === "Math" ? C.accent2 : C.ink2}>{action.section}</Tag>
        <Tag c={statusColor}>{action.status}{action.mastery != null ? ` · ${action.mastery}%` : ""}</Tag>
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, margin: "2px 0 8px" }}>{action.skill}</div>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "0 0 14px" }}>{action.reason}</p>
      <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: C.ink2, marginBottom: 16, flexWrap: "wrap" }}>
        <span><b style={{ color: C.ink }}>{action.questionCount}</b> questions</span>
        <span><b style={{ color: C.ink }}>~{action.minutes}</b> min</span>
        <span>Starts <b style={{ color: C.ink }}>{action.startDifficulty}</b></span>
      </div>
      <button onClick={start} style={{ ...btnPrimary, marginTop: "auto" }}>
        Start adaptive practice →
      </button>
    </div>
  );
}

function CardKicker({ children }) {
  return <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: C.accent, fontWeight: 700 }}>{children}</div>;
}

function MissionCard({ mission, missionCompleted, onToggle, setTab, onStartPractice }) {
  const items = (mission && mission.items) || [];
  const done = mission ? mission.done : 0;
  const total = mission ? mission.total : 0;

  const runItem = (it) => {
    if (it.kind === "practice" && onStartPractice) {
      onStartPractice({
        section: it.section,
        skill: it.skill,
        difficulty: "medium",
        questionCount: 5,
        minutes: it.minutes,
        reason: it.label,
        source: "mission",
      });
    } else {
      setTab("mistakes");
    }
  };

  const firstUndone = items.find((it) => !missionCompleted[it.id]) || items[0];

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <CardKicker>Today's Mission</CardKicker>
        <span style={{ fontSize: 12.5, color: C.ink2, fontWeight: 600 }}>{done}/{total} done</span>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 13.5, color: C.ink2, marginTop: 10 }}>Nothing queued right now — log more results to unlock a full mission.</p>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {items.map((it) => {
            const checked = !!missionCompleted[it.id];
            return (
              <div key={it.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                border: `1px solid ${C.line}`, borderRadius: 10,
                background: checked ? C.soft : "#fff",
              }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(it.id)}
                  aria-label={`Mark "${it.label}" complete`}
                  style={{ width: 16, height: 16, accentColor: C.accent, flexShrink: 0, cursor: "pointer" }}
                />
                <span style={{ flex: 1, fontSize: 13.5, color: checked ? C.ink2 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
                  {it.label}
                </span>
                <span style={{ fontSize: 11.5, color: C.ink2, whiteSpace: "nowrap" }}>{it.minutes} min</span>
                <button
                  onClick={() => runItem(it)}
                  className="sg-focus"
                  aria-label={`${it.kind === "practice" ? "Start" : "Review"}: ${it.label}`}
                  style={{ background: "none", border: "none", color: C.accent, fontSize: 12.5, fontWeight: 700, padding: "4px 6px", whiteSpace: "nowrap" }}
                >
                  {it.kind === "practice" ? "Start" : "Review"} →
                </button>
              </div>
            );
          })}
        </div>
      )}
      <button
        onClick={() => firstUndone && runItem(firstUndone)}
        disabled={!firstUndone}
        style={{ ...btnGhostSolid, marginTop: "auto", marginBottom: 0, opacity: firstUndone ? 1 : 0.5 }}
      >
        Go to today's work →
      </button>
    </div>
  );
}

function MasteryPanel({ mastery, priorities }) {
  const priorityBySkill = {};
  (priorities || []).forEach((p, i) => { priorityBySkill[p.skill] = i; });
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>SAT Mastery</div>
        <div style={{ fontSize: 12, color: C.ink2 }}>Updated automatically from your logged results</div>
      </div>
      <div className="sg-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {Object.entries(SKILLS).map(([section, skills]) => (
          <div key={section} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{section}</div>
            <div style={{ display: "grid", gap: 12 }}>
              {skills.map((skill) => (
                <MasteryRow key={skill} skill={skill} rec={mastery?.[skill]} rank={priorityBySkill[skill]} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MasteryRow({ skill, rec, rank }) {
  const score = rec?.mastery ?? null;
  const status = masteryStatus(score);
  const color = score == null ? C.ink2 : status === "Needs Review" ? "#B4443A" : status === "Developing" ? C.accent2 : C.accent;
  const isTop = rank === 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5, gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: isTop ? 700 : 500, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
          {skill}
          {isTop && <Tag c={C.accent}>#1 priority</Tag>}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color, whiteSpace: "nowrap" }}>
          {score == null ? "Not assessed" : `${score}% · ${status}`}
        </span>
      </div>
      <div style={{ height: 7, background: C.soft, borderRadius: 4, overflow: "hidden" }} role="img" aria-label={`${skill} mastery: ${score == null ? "not assessed" : `${score}%, ${status}`}`}>
        <div style={{ width: `${score ?? 0}%`, height: "100%", background: color, opacity: score == null ? 0.25 : 1 }} />
      </div>
    </div>
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

// ---------- MY RESULTS (Test Scores + Mistakes, combined) ----------
function ResultsPage({ resultsTab, setResultsTab, attempts, setAttempts, mistakes, setMistakes }) {
  return (
    <>
      <SectionTitle kicker="Your evidence" title="My Results" sub="SAT scores, practice scores, and mistakes — the evidence SATGene uses to understand your progress and decide what to work on next." />
      <div style={{ display: "inline-flex", background: C.soft, borderRadius: 12, padding: 4, marginBottom: 22, flexWrap: "wrap" }} role="group" aria-label="My Results section">
        {[["scores", "Test Scores"], ["mistakes", "Mistakes"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setResultsTab(id)}
            className="sg-focus"
            aria-pressed={resultsTab === id}
            style={{
              padding: "9px 18px", borderRadius: 9, border: "none", fontSize: 13.5, fontWeight: 700,
              background: resultsTab === id ? C.card : "transparent",
              color: resultsTab === id ? C.ink : C.ink2,
              boxShadow: resultsTab === id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {resultsTab === "mistakes" ? (
        <Mistakes mistakes={mistakes} setMistakes={setMistakes} attempts={attempts} />
      ) : (
        <Tracker attempts={attempts} setAttempts={setAttempts} />
      )}
    </>
  );
}

// ---------- 2. TEST TRACKER (My Results → Test Scores) ----------
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

  // ---- Score validation (§7): a section score is only accepted in 200–800. Total
  // is always derived (rw + math), never entered — so once both sections are valid
  // it is automatically in the valid 400–1600 range. Invalid records are blocked
  // from saving entirely (not silently dropped later in Progress).
  const rwNum = Number(form.rw);
  const mathNum = Number(form.math);
  const rwEntered = form.rw !== "";
  const mathEntered = form.math !== "";
  const rwValid = rwEntered && Number.isFinite(rwNum) && rwNum >= 200 && rwNum <= 800;
  const mathValid = mathEntered && Number.isFinite(mathNum) && mathNum >= 200 && mathNum <= 800;
  const total = (rwValid ? rwNum : 0) + (mathValid ? mathNum : 0);
  const validationErrors = [];
  if (rwEntered && !rwValid) validationErrors.push("Reading & Writing score must be between 200 and 800.");
  if (mathEntered && !mathValid) validationErrors.push("Math score must be between 200 and 800.");
  const valid = Boolean(form.date) && rwValid && mathValid;

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
      <p style={{ color: C.ink2, fontSize: 14, margin: "0 0 18px", maxWidth: 640 }}>Record both official SAT scores and practice-test scores. This is the source of truth for your header, Progress, and study plans.</p>

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

        <div className="sg-fields">
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inp} /></Field>
          <Field label="Source">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={inp}>
              {sources.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Reading & Writing">
            <input
              type="number" value={form.rw} onChange={(e) => setForm({ ...form, rw: e.target.value })}
              style={{ ...inp, ...(rwEntered && !rwValid ? invalidInp : {}) }} placeholder="620"
              aria-invalid={rwEntered && !rwValid} min={200} max={800}
            />
          </Field>
          <Field label="Math">
            <input
              type="number" value={form.math} onChange={(e) => setForm({ ...form, math: e.target.value })}
              style={{ ...inp, ...(mathEntered && !mathValid ? invalidInp : {}) }} placeholder="640"
              aria-invalid={mathEntered && !mathValid} min={200} max={800}
            />
          </Field>
          <Field label="Total (auto)">
            <div style={{ ...inp, background: C.soft, fontWeight: 700, color: C.ink }}>{rwValid && mathValid ? total : "—"}</div>
          </Field>
          <Field label={`Minutes${form.testType === "SAT" ? " (optional)" : ""}`}><input type="number" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} style={inp} placeholder="134" /></Field>
          <Field label={`Confidence (${form.confidence}/5)`}><input type="range" min="1" max="5" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: +e.target.value })} style={{ width: "100%" }} /></Field>
        </div>
        <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inp} placeholder="What went well / what to fix" /></Field>

        {validationErrors.length > 0 && (
          <div role="alert" style={{ marginTop: 10, display: "grid", gap: 4 }}>
            {validationErrors.map((e, i) => (
              <div key={i} style={{ fontSize: 12.5, color: "#B4443A" }}>{e}</div>
            ))}
          </div>
        )}

        <div className="sg-btn-row" style={{ display: "flex", gap: 10 }}>
          <button onClick={save} disabled={!valid} style={{ ...btnPrimary, opacity: valid ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}>{editingId ? "Save changes" : `Add ${form.testType === "SAT" ? "SAT" : "practice"} result`}</button>
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
      <p style={{ color: C.ink2, fontSize: 14, margin: "0 0 18px", maxWidth: 640 }}>Record why you missed each question — not the copyrighted question itself, just the skill and the lesson. Tag each as SAT or Practice so SATGene can weigh them correctly.</p>

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

        <div className="sg-fields">
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
// ============================================================
// ANALYTICS UTILITIES — deterministic, testable, no AI.
// Test Tracker is the source of truth for scores; Mistake Log for patterns.
// ============================================================

// A record is valid only if it has a type, a real date, section scores in 200–800,
// and a total in 400–1600 that equals rw+math. Invalid records are excluded from
// analytics (but never deleted — they stay in Test Tracker for correction).
function isValidScoreRecord(a) {
  if (!a) return false;
  if (a.testType !== "SAT" && a.testType !== "Practice") return false;
  if (!a.date || isNaN(new Date(a.date).getTime())) return false;
  const rw = Number(a.rw), math = Number(a.math);
  if (!Number.isFinite(rw) || rw < 200 || rw > 800) return false;
  if (!Number.isFinite(math) || math < 200 || math > 800) return false;
  const total = rw + math;
  if (total < 400 || total > 1600) return false;
  return true;
}

function partitionValidity(attempts) {
  const valid = [], invalid = [];
  (attempts || []).forEach((a) => (isValidScoreRecord(a) ? valid : invalid).push(a));
  return { valid, invalid };
}

// Chronological ascending by true test date (never text sort, never creation time).
const byDateAsc = (a, b) => new Date(a.date) - new Date(b.date);

const fmtFull = (d) => { try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch { return String(d); } };
const fmtAbbr = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return String(d); } };

const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null);

// Change vs the previous record OF THE SAME TYPE (never cross-type).
function changeVsPrevSameType(sortedValid, record) {
  const sameType = sortedValid.filter((a) => a.testType === record.testType);
  const idx = sameType.findIndex((a) => a.id === record.id);
  if (idx <= 0) return null;
  return totalOf(record) - totalOf(sameType[idx - 1]);
}

// Section summary for "rw" or "math" over a given scope of valid records.
function sectionSummary(validSorted, field) {
  const scores = validSorted.map((a) => Number(a[field]));
  if (!scores.length) return null;
  const latest = scores[scores.length - 1];
  const best = Math.max(...scores);
  const lastThreePractice = validSorted.filter((a) => a.testType === "Practice").slice(-3).map((a) => Number(a[field]));
  const lastThreeAvg = avg(lastThreePractice);
  const latestType = validSorted[validSorted.length - 1].testType;
  const sameType = validSorted.filter((a) => a.testType === latestType).map((a) => Number(a[field]));
  const window = sameType.slice(-3);
  const changeLastThree = window.length >= 2 ? window[window.length - 1] - window[0] : null;
  return { latest, best, lastThreeAvg, changeLastThree };
}

// Suggested per-section planning target from the total SAT target (transparent 50/50
// split, rounded to 10s). Clearly NOT an official target.
function suggestedSectionTargets(satTarget) {
  const half = Math.round((satTarget / 2) / 10) * 10;
  return { rw: half, math: satTarget - half };
}

// Practice consistency from recent valid practice totals. Transparent thresholds.
const CONSISTENCY_THRESHOLDS = { consistent: 30, moderate: 60 };
function practiceConsistency(validSorted) {
  const totals = validSorted.filter((a) => a.testType === "Practice").slice(-3).map(totalOf);
  if (totals.length < 3) return { status: "Insufficient data", average: avg(totals), best: totals.length ? Math.max(...totals) : null, low: totals.length ? Math.min(...totals) : null, range: null, count: totals.length };
  const best = Math.max(...totals), low = Math.min(...totals), range = best - low;
  let status = "Variable";
  if (range <= CONSISTENCY_THRESHOLDS.consistent) status = "Consistent";
  else if (range <= CONSISTENCY_THRESHOLDS.moderate) status = "Moderately consistent";
  return { status, average: avg(totals), best, low, range, count: totals.length };
}

// Mistake categories grouped by skill, prioritized. mastered=false means unresolved.
function mistakeCategories(mistakes, limit = 5) {
  const groups = {};
  (mistakes || []).forEach((m) => {
    const key = m.skill || "Uncategorized";
    if (!groups[key]) groups[key] = { skill: key, section: m.section, total: 0, unresolved: 0, dates: new Set(), types: new Set(), last: null };
    const g = groups[key];
    g.total++;
    if (!m.mastered) g.unresolved++;
    if (m.date) { g.dates.add(m.date); if (!g.last || new Date(m.date) > new Date(g.last)) g.last = m.date; }
    if (m.testType) g.types.add(m.testType);
  });
  return Object.values(groups)
    .map((g) => ({ ...g, testsSeen: g.dates.size, sources: [...g.types] }))
    .sort((a, b) => b.unresolved - a.unresolved || b.total - a.total || (new Date(b.last || 0) - new Date(a.last || 0)))
    .slice(0, limit);
}

// SAT readiness — transparent rule-based status from best applicable score vs target.
function satReadiness({ superscore, latestSat, practiceAvg, target, practiceCount }) {
  const applicable = superscore != null ? superscore : latestSat != null ? latestSat : null;
  if (applicable == null && (practiceCount || 0) < 2) return { status: "Insufficient Data", applicable: null, gap: null };
  const basis = applicable != null ? applicable : practiceAvg;
  if (basis == null) return { status: "Insufficient Data", applicable: null, gap: null };
  const gap = target - basis;
  let status;
  if (gap <= 0) status = basis > target ? "Above Target" : "At Target";
  else if (gap <= 30) status = "Approaching Target";
  else if (gap <= 90) status = "Improving";
  else status = "Building Foundation";
  return { status, applicable, gap: Math.max(0, gap), basisIsSuperscore: superscore != null };
}

function Progress({ attempts, mistakes, goal, setTab, mastery, priorities }) {
  const [testFilter, setTestFilter] = useState("all");   // all | Practice | SAT
  const [scoreFilter, setScoreFilter] = useState("total"); // total | rw | math

  const { valid, invalid } = useMemo(() => partitionValidity(attempts), [attempts]);
  const sorted = useMemo(() => [...valid].sort(byDateAsc), [valid]);

  const satsAsc = useMemo(() => sorted.filter((a) => a.testType === "SAT"), [sorted]);
  const pracAsc = useMemo(() => sorted.filter((a) => a.testType === "Practice"), [sorted]);
  const latestSat = satsAsc.length ? satsAsc[satsAsc.length - 1] : null;
  const latestPractice = pracAsc.length ? pracAsc[pracAsc.length - 1] : null;
  const superscore = useMemo(() => computeSuperscore(valid), [valid]);
  const target = goal.satTarget;
  const practiceLast3Avg = avg(pracAsc.slice(-3).map(totalOf));
  const daysToSat = daysUntil(goal.nextSatDate);

  // Gap basis: superscore if available, else latest applicable score.
  const gapBasis = superscore ? superscore.total : (latestSat ? totalOf(latestSat) : (latestPractice ? totalOf(latestPractice) : null));
  const gapBasisLabel = superscore ? "Based on superscore" : latestSat ? "Based on latest SAT" : latestPractice ? "Based on latest practice" : null;
  const gap = gapBasis == null ? null : Math.max(0, target - gapBasis);
  const targetReached = gapBasis != null && gapBasis >= target;

  const readiness = useMemo(() => satReadiness({
    superscore: superscore ? superscore.total : null,
    latestSat: latestSat ? totalOf(latestSat) : null,
    practiceAvg: practiceLast3Avg,
    target,
    practiceCount: pracAsc.length,
  }), [superscore, latestSat, practiceLast3Avg, target, pracAsc.length]);

  const categories = useMemo(() => mistakeCategories(mistakes, 5), [mistakes]);
  const secTargets = suggestedSectionTargets(target);

  const hasAnyValid = valid.length > 0;

  return (
    <>
      <SectionTitle kicker="Am I improving?" title="Progress" sub="Your My Results data turned into clear, actionable insights. All calculations are deterministic — no AI." />

      {invalid.length > 0 && (
        <div style={{ background: "#FBEAE8", border: "1px solid #E3B7B3", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, color: "#B4443A" }}>
            {invalid.length} test record{invalid.length === 1 ? " was" : "s were"} excluded because {invalid.length === 1 ? "its score is" : "their scores are"} incomplete or invalid.
          </span>
          <button onClick={() => setTab("tracker")} style={{ ...btnGhostSolid, marginTop: 0, color: "#B4443A", borderColor: "#E3B7B3" }}>Review in My Results</button>
        </div>
      )}

      {!hasAnyValid ? (
        <EmptyState
          title="Add an SAT or practice-test result to begin tracking your progress."
          button="Add Test Result" onClick={() => setTab("tracker")}
        />
      ) : (
        <>
          {/* 1. PERFORMANCE OVERVIEW */}
          <SubHeading>Performance Overview</SubHeading>
          <div className="sg-grid" style={{ marginBottom: 20 }}>
            <OverviewCard title="Latest Official SAT" empty={!latestSat ? "No official SAT recorded" : null}
              main={latestSat ? totalOf(latestSat) : null}
              lines={latestSat ? [fmtFull(latestSat.date), `R&W ${latestSat.rw}`, `Math ${latestSat.math}`] : []} />
            <OverviewCard title="Latest Practice" empty={!latestPractice ? "No practice score recorded" : null}
              main={latestPractice ? totalOf(latestPractice) : null}
              lines={latestPractice ? [fmtFull(latestPractice.date), `R&W ${latestPractice.rw}`, `Math ${latestPractice.math}`] : []} />
            <OverviewCard title="Superscore" accent empty={!superscore ? "Not available" : null}
              main={superscore ? superscore.total : null}
              emptySub={!superscore ? "Requires 2 SAT tests" : null}
              lines={superscore ? [`R&W ${superscore.rw} · ${fmtAbbr(superscore.rwDate)}`, `Math ${superscore.math} · ${fmtAbbr(superscore.mathDate)}`] : []} />
            <OverviewCard title="Target Progress"
              main={targetReached ? "✓" : gap}
              mainLabel={targetReached ? null : "pts remaining"}
              lines={targetReached
                ? ["Target reached", `Target ${target}`]
                : [`Target ${target}`, gapBasisLabel, daysToSat != null ? `${daysToSat > 0 ? daysToSat : 0} days to SAT` : "SAT not scheduled"].filter(Boolean)} />
          </div>

          {/* 2. SCORE PROGRESS */}
          <SubHeading>Score Progress</SubHeading>
          <ChartCard>
            <FilterRow>
              <FilterGroup label="Test" value={testFilter} setValue={setTestFilter} options={[["all", "All Tests"], ["Practice", "Practice"], ["SAT", "SAT"]]} />
              <FilterGroup label="Score" value={scoreFilter} setValue={setScoreFilter} options={[["total", "Total"], ["rw", "R&W"], ["math", "Math"]]} />
            </FilterRow>
            <ScoreProgressChart sorted={sorted} testFilter={testFilter} scoreFilter={scoreFilter} target={target} secTargets={secTargets} />
          </ChartCard>

          {/* 3. SECTION PROGRESS */}
          <SubHeading>Section Progress</SubHeading>
          <ChartCard>
            <SectionProgressBlock sorted={sorted} testFilter={testFilter} setTestFilter={setTestFilter} target={target} secTargets={secTargets} />
          </ChartCard>

          {/* 4. PRACTICE CONSISTENCY */}
          <SubHeading>Practice Consistency</SubHeading>
          <ConsistencyBlock sorted={sorted} />

          {/* 5. SAT MASTERY (full model — Home only shows a trimmed snapshot) */}
          <SubHeading>SAT Mastery</SubHeading>
          <MasteryPanel mastery={mastery} priorities={priorities} />

          {/* 6. WHAT THE DATA SAYS */}
          <SubHeading>What the Data Says</SubHeading>
          <InsightsBlock sorted={sorted} satsAsc={satsAsc} pracAsc={pracAsc} superscore={superscore} target={target} practiceLast3Avg={practiceLast3Avg} secTargets={secTargets} />

          {/* 7. WHERE POINTS ARE LEAKING */}
          <SubHeading>Where Points Are Leaking</SubHeading>
          <LeakingBlock categories={categories} setTab={setTab} />

          {/* 8. SAT READINESS */}
          <SubHeading>SAT Readiness</SubHeading>
          <ReadinessBlock readiness={readiness} superscore={superscore} latestSat={latestSat} practiceLast3Avg={practiceLast3Avg} target={target} daysToSat={daysToSat} />

          {/* 9. RECOMMENDED NEXT STEPS */}
          <SubHeading>Recommended Next Steps</SubHeading>
          <NextStepsBlock categories={categories} sorted={sorted} secTargets={secTargets} latestSat={latestSat} pracAsc={pracAsc} goal={goal} setTab={setTab} />

          {/* 10. TEST HISTORY */}
          <SubHeading>Test History</SubHeading>
          <TestHistoryBlock valid={valid} />
        </>
      )}
    </>
  );
}

// ---- shared small pieces ----
function SubHeading({ children }) {
  return <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, margin: "26px 0 12px" }}>{children}</h3>;
}
function ChartCard({ children }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 4 }}>{children}</div>;
}
function EmptyState({ title, button, onClick, sub }) {
  return (
    <div style={{ background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 14.5, color: C.ink, marginBottom: sub ? 6 : 14 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: C.ink2, marginBottom: 14 }}>{sub}</div>}
      {button && <button onClick={onClick} style={{ ...btnPrimary, marginTop: 0 }}>{button}</button>}
    </div>
  );
}
function OverviewCard({ title, main, mainLabel, lines = [], empty, emptySub, accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${accent ? C.accent : C.line}`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.6, color: accent ? C.accent : C.ink2, fontWeight: 700 }}>{title}</div>
      {empty ? (
        <>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: C.ink2, marginTop: 6 }}>{empty}</div>
          {emptySub && <div style={{ fontSize: 11.5, color: C.ink2, marginTop: 2 }}>{emptySub}</div>}
        </>
      ) : (
        <>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 30, color: C.ink, lineHeight: 1.05, marginTop: 4 }}>
            {main}{mainLabel && <span style={{ fontSize: 13, fontFamily: FONT_BODY, fontWeight: 500, color: C.ink2 }}> {mainLabel}</span>}
          </div>
          {lines.map((l, i) => <div key={i} style={{ fontSize: 12, color: C.ink2, marginTop: 2, overflowWrap: "anywhere" }}>{l}</div>)}
        </>
      )}
    </div>
  );
}
function FilterRow({ children }) {
  return <div className="sg-nav-scroll" style={{ display: "flex", gap: 16, marginBottom: 14, paddingBottom: 2 }}>{children}</div>;
}
function FilterGroup({ label, value, setValue, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
      <span style={{ fontSize: 12, color: C.ink2, fontWeight: 600 }}>{label}:</span>
      <div style={{ display: "inline-flex", background: C.soft, borderRadius: 8, padding: 2 }} role="group" aria-label={label}>
        {options.map(([id, lbl]) => (
          <button key={id} onClick={() => setValue(id)} className="sg-focus" aria-pressed={value === id} style={{
            padding: "5px 11px", borderRadius: 6, border: "none", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
            background: value === id ? "#fff" : "transparent", color: value === id ? C.ink : C.ink2,
            boxShadow: value === id ? "0 1px 2px rgba(0,0,0,.08)" : "none",
          }}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}

// ---- 2. Score Progress chart (SVG line + distinct markers) ----
function ScoreProgressChart({ sorted, testFilter, scoreFilter, target, secTargets }) {
  const field = scoreFilter; // total|rw|math
  const valOf = (a) => (field === "total" ? totalOf(a) : Number(a[field]));
  const refLine = field === "total" ? target : field === "rw" ? secTargets.rw : secTargets.math;

  const points = sorted
    .filter((a) => testFilter === "all" || a.testType === testFilter)
    .map((a) => ({ a, x: new Date(a.date).getTime(), y: valOf(a), type: a.testType }));

  if (points.length === 0) {
    return <Empty text="No records match this filter yet." />;
  }

  // chart geometry
  const W = 680, H = 260, padL = 44, padR = 16, padT = 24, padB = 34;
  const yMin = field === "total" ? 400 : 200, yMax = field === "total" ? 1600 : 800;
  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const xSpan = xMax - xMin || 1;
  const sx = (x) => padL + ((x - xMin) / xSpan) * (W - padL - padR);
  const sy = (y) => padT + (1 - (y - yMin) / (yMax - yMin)) * (H - padT - padB);

  // Connect only same-type sequences (don't mislead across types).
  const seq = (type) => points.filter((p) => p.type === type).map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
  const refY = sy(refLine);

  const [hover, setHover] = useState(null);

  const summaryText = `Score progress chart. ${points.length} records shown. ` +
    points.map((p) => `${p.type} ${fmtAbbr(p.a.date)}: ${p.y}.`).join(" ");

  return (
    <div>
      <div className="sg-nav-scroll" style={{ width: "100%" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 340, display: "block" }} role="img" aria-label={summaryText}>
          {/* y gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const yv = yMin + t * (yMax - yMin);
            const yy = sy(yv);
            return <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke={C.soft} strokeWidth="1" />
              <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="9" fill={C.ink2}>{Math.round(yv)}</text>
            </g>;
          })}
          {/* target reference line */}
          <line x1={padL} y1={refY} x2={W - padR} y2={refY} stroke={C.accent2} strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={W - padR} y={refY - 4} textAnchor="end" fontSize="9" fill={C.accent2} fontWeight="700">Target {refLine}</text>

          {/* same-type connecting lines */}
          {(testFilter === "all" || testFilter === "Practice") && <polyline points={seq("Practice")} fill="none" stroke={C.paid} strokeWidth="2" />}
          {(testFilter === "all" || testFilter === "SAT") && <polyline points={seq("SAT")} fill="none" stroke={C.accent} strokeWidth="2" />}

          {/* markers: SAT = diamond, Practice = circle (shape, not just color) */}
          {points.map((p, i) => {
            const cx = sx(p.x), cy = sy(p.y);
            const isSAT = p.type === "SAT";
            return (
              <g key={i} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} tabIndex={0}
                 onFocus={() => setHover(p)} onBlur={() => setHover(null)}>
                {isSAT
                  ? <rect x={cx - 5} y={cy - 5} width="10" height="10" transform={`rotate(45 ${cx} ${cy})`} fill={C.accent} />
                  : <circle cx={cx} cy={cy} r="5" fill={C.paid} />}
                <text x={cx} y={cy - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.ink}>{p.y}</text>
              </g>
            );
          })}
          {/* x labels */}
          {points.map((p, i) => (
            <text key={i} x={sx(p.x)} y={H - 10} textAnchor="middle" fontSize="9" fill={C.ink2}>{fmtAbbr(p.a.date)}</text>
          ))}
        </svg>
      </div>

      {/* legend (shape-based, wraps) */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8, fontSize: 12, color: C.ink2 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: C.paid, borderRadius: "50%", display: "inline-block" }} /> Practice (circle)</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: C.accent, display: "inline-block", transform: "rotate(45deg)" }} /> Official SAT (diamond)</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 0, borderTop: `2px dashed ${C.accent2}`, display: "inline-block" }} /> Target</span>
      </div>

      {hover && <ChartTooltip p={hover} sorted={sorted} field={field} />}
    </div>
  );
}

function ChartTooltip({ p, sorted, field }) {
  const change = changeVsPrevSameType([...sorted].sort(byDateAsc), p.a);
  const typeLabel = p.type === "SAT" ? "Official SAT" : "Practice Test";
  return (
    <div style={{ marginTop: 10, background: C.ink, color: "#fff", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.6, maxWidth: 320 }}>
      <div style={{ fontWeight: 700 }}>{fmtFull(p.a.date)}</div>
      <div>{typeLabel}{p.a.source ? ` · Source: ${p.a.source}` : ""}</div>
      <div>Reading and Writing: {p.a.rw}</div>
      <div>Math: {p.a.math}</div>
      <div>Total: {totalOf(p.a)}</div>
      {change != null && <div>Change from previous {p.type === "SAT" ? "SAT" : "practice"}: {change >= 0 ? "+" : ""}{change}</div>}
    </div>
  );
}

// ---- 3. Section Progress ----
function SectionProgressBlock({ sorted, testFilter, setTestFilter, target, secTargets }) {
  const scope = sorted.filter((a) => testFilter === "all" || a.testType === testFilter);
  const rw = sectionSummary(scope, "rw");
  const math = sectionSummary(scope, "math");

  return (
    <div>
      <FilterRow>
        <FilterGroup label="Test" value={testFilter} setValue={setTestFilter} options={[["all", "All Tests"], ["Practice", "Practice"], ["SAT", "SAT"]]} />
      </FilterRow>
      {scope.length === 0 ? <Empty text="No records match this filter yet." /> : (
        <>
          <MiniDualChart scope={scope} secTargets={secTargets} />
          <div className="sg-grid" style={{ marginTop: 14 }}>
            <SectionSummaryCard title="Reading & Writing" data={rw} suggested={secTargets.rw} />
            <SectionSummaryCard title="Math" data={math} suggested={secTargets.math} />
          </div>
          <div style={{ fontSize: 11.5, color: C.ink2, marginTop: 8 }}>Suggested planning target: a transparent 50/50 split of your {target} SAT target — not an official requirement.</div>
        </>
      )}
    </div>
  );
}
function MiniDualChart({ scope, secTargets }) {
  const W = 680, H = 200, padL = 40, padR = 14, padT = 16, padB = 28;
  const yMin = 200, yMax = 800;
  const xs = scope.map((a) => new Date(a.date).getTime());
  const xMin = Math.min(...xs), xMax = Math.max(...xs), xSpan = xMax - xMin || 1;
  const sx = (x) => padL + ((x - xMin) / xSpan) * (W - padL - padR);
  const sy = (y) => padT + (1 - (y - yMin) / (yMax - yMin)) * (H - padT - padB);
  const line = (field) => scope.map((a) => `${sx(new Date(a.date).getTime())},${sy(Number(a[field]))}`).join(" ");
  const summary = `Section progress. Reading and Writing and Math trends across ${scope.length} tests.`;
  return (
    <div className="sg-nav-scroll" style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 340, display: "block" }} role="img" aria-label={summary}>
        {[200, 400, 600, 800].map((yv, i) => (
          <g key={i}><line x1={padL} y1={sy(yv)} x2={W - padR} y2={sy(yv)} stroke={C.soft} /><text x={padL - 6} y={sy(yv) + 3} textAnchor="end" fontSize="9" fill={C.ink2}>{yv}</text></g>
        ))}
        <polyline points={line("rw")} fill="none" stroke={C.paid} strokeWidth="2" />
        <polyline points={line("math")} fill="none" stroke={C.accent2} strokeWidth="2" />
        {scope.map((a, i) => <circle key={"r" + i} cx={sx(new Date(a.date).getTime())} cy={sy(Number(a.rw))} r="3.5" fill={C.paid} />)}
        {scope.map((a, i) => <rect key={"m" + i} x={sx(new Date(a.date).getTime()) - 3} y={sy(Number(a.math)) - 3} width="6" height="6" fill={C.accent2} />)}
        {scope.map((a, i) => <text key={"x" + i} x={sx(new Date(a.date).getTime())} y={H - 8} textAnchor="middle" fontSize="9" fill={C.ink2}>{fmtAbbr(a.date)}</text>)}
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, fontSize: 12, color: C.ink2 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: C.paid, borderRadius: "50%" }} /> Reading & Writing</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: C.accent2 }} /> Math</span>
      </div>
    </div>
  );
}
function SectionSummaryCard({ title, data, suggested }) {
  if (!data) return null;
  const dist = suggested - data.latest;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <Row k="Latest" v={data.latest} />
      <Row k="Best" v={data.best} />
      <Row k="Avg of last 3 practice" v={data.lastThreeAvg ?? "—"} />
      <Row k="Change (last 3 comparable)" v={data.changeLastThree == null ? "—" : `${data.changeLastThree >= 0 ? "+" : ""}${data.changeLastThree}`} />
      <Row k="Distance from suggested target" v={dist <= 0 ? "At/above target" : `${dist} pts`} />
    </div>
  );
}
function Row({ k, v }) {
  return <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", gap: 10 }}><span style={{ color: C.ink2 }}>{k}</span><b style={{ overflowWrap: "anywhere" }}>{v}</b></div>;
}

// ---- 4. What the Data Says ----
function InsightsBlock({ sorted, satsAsc, pracAsc, superscore, target, practiceLast3Avg, secTargets }) {
  const insights = [];
  if (pracAsc.length < 2 && satsAsc.length < 2) {
    insights.push("Add at least two practice tests to see a meaningful trend.");
  } else {
    const latestSat = satsAsc[satsAsc.length - 1];
    const latestPrac = pracAsc[pracAsc.length - 1];
    if (latestSat && superscore) insights.push(`Your latest official SAT is ${totalOf(latestSat)} and your superscore is ${superscore.total}.`);
    if (practiceLast3Avg != null) {
      const parts = [`Your last three practice tests average ${practiceLast3Avg}`];
      if (superscore) parts.push(`${Math.abs(superscore.total - practiceLast3Avg)} points ${practiceLast3Avg < superscore.total ? "below" : "above"} your superscore`);
      parts.push(`${Math.abs(target - practiceLast3Avg)} points ${practiceLast3Avg < target ? "below" : "above"} your ${target} target`);
      insights.push(parts.join(", ") + ".");
    }
    // strongest / weakest section using latest record sections vs suggested
    const latest = sorted[sorted.length - 1];
    if (latest) {
      const rwGap = secTargets.rw - Number(latest.rw);
      const mathGap = secTargets.math - Number(latest.math);
      const stronger = rwGap < mathGap ? "Reading and Writing" : "Math";
      const weaker = rwGap < mathGap ? "Math" : "Reading and Writing";
      insights.push(`${stronger} is currently your stronger section. ${weaker} shows the largest gap to target and is your biggest opportunity.`);
    }
    // improvement first->latest practice
    if (pracAsc.length >= 2) {
      const d = totalOf(pracAsc[pracAsc.length - 1]) - totalOf(pracAsc[0]);
      insights.push(`Across your practice tests, your total has ${d >= 0 ? "improved" : "declined"} by ${Math.abs(d)} points from first to latest.`);
    }
  }
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 4 }}>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 14 }}>
        {insights.map((t, i) => <li key={i} style={{ overflowWrap: "anywhere" }}>{t}</li>)}
      </ul>
    </div>
  );
}

// ---- 5. Practice Consistency ----
function ConsistencyBlock({ sorted }) {
  const c = practiceConsistency(sorted);
  if (c.count < 3) {
    return <EmptyState title="Add at least three practice tests to assess consistency." sub={c.count ? `You have ${c.count} so far.` : undefined} />;
  }
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 4 }}>
      <div className="sg-grid">
        <div><Row k="Last 3 practice average" v={c.average} /><Row k="Best recent" v={c.best} /><Row k="Lowest recent" v={c.low} /><Row k="Score range" v={`${c.range} pts`} /></div>
        <div>
          <div style={{ fontSize: 13, color: C.ink2 }}>Consistency</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, color: c.status === "Consistent" ? C.accent : c.status === "Variable" ? "#B4443A" : C.accent2 }}>{c.status}</div>
          <div style={{ fontSize: 13, color: C.ink2, marginTop: 6, lineHeight: 1.5 }}>Your recent practice scores vary by {c.range} points. More timed full-length testing may help determine whether the variation is caused by pacing, content gaps, or testing conditions.</div>
        </div>
      </div>
    </div>
  );
}

// ---- 6. Where Points Are Leaking ----
function LeakingBlock({ categories, setTab }) {
  if (categories.length === 0) {
    return <EmptyState title="No mistake patterns are available yet. Add mistakes after your next test to receive targeted insights." button="Review Mistake Log" onClick={() => setTab("mistakes")} />;
  }
  return (
    <>
      <div style={{ display: "grid", gap: 10 }}>
        {categories.map((c) => (
          <div key={c.skill} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{c.skill}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.sources.map((s) => <Tag key={s} c={s === "SAT" ? C.accent : C.paid}>{s}</Tag>)}
                {c.section && <Tag c={C.ink2}>{c.section}</Tag>}
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.ink2, marginTop: 6, lineHeight: 1.6 }}>
              {c.total} mistake{c.total === 1 ? "" : "s"} · {c.unresolved} unresolved · seen across {c.testsSeen} test{c.testsSeen === 1 ? "" : "s"} · last recorded {c.last ? fmtFull(c.last) : "—"}
            </div>
            <div style={{ fontSize: 13, color: C.ink, marginTop: 6 }}>
              <b>Next action:</b> Complete 15 timed {c.skill} questions and review every incorrect answer before your next practice test.
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setTab("mistakes")} style={btnGhostSolid}>Review Mistake Log</button>
    </>
  );
}

// ---- 7. SAT Readiness ----
function ReadinessBlock({ readiness, superscore, latestSat, practiceLast3Avg, target, daysToSat }) {
  const [showHow, setShowHow] = useState(false);
  const color = { "At Target": C.accent, "Above Target": C.accent, "Approaching Target": C.accent2, "Improving": C.accent2, "Building Foundation": "#B4443A", "Insufficient Data": C.ink2 }[readiness.status] || C.ink2;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: C.ink2 }}>Status</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, color }}>{readiness.status}</div>
        </div>
        <button onClick={() => setShowHow((s) => !s)} className="sg-focus" style={{ ...btnGhost, color: C.accent }}>How readiness is calculated {showHow ? "▲" : "▼"}</button>
      </div>
      <div className="sg-grid" style={{ marginTop: 10 }}>
        <div>
          <Row k="Latest official SAT" v={latestSat ? totalOf(latestSat) : "—"} />
          <Row k="Superscore" v={superscore ? superscore.total : "—"} />
          <Row k="Last 3 practice avg" v={practiceLast3Avg ?? "—"} />
        </div>
        <div>
          <Row k="SAT target" v={target} />
          <Row k="Gap to target" v={readiness.gap == null ? "—" : readiness.gap <= 0 ? "Target reached" : `${readiness.gap} pts`} />
          <Row k="Days to next SAT" v={daysToSat == null ? "Not scheduled" : daysToSat > 0 ? daysToSat : "—"} />
        </div>
      </div>
      {showHow && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: C.ink2, lineHeight: 1.6, background: C.soft, borderRadius: 10, padding: 14 }}>
          Readiness compares your best applicable score (superscore if you have two official SATs, otherwise your latest official SAT, otherwise your recent practice average) against your target. Thresholds: at or above target → At/Above Target; within 30 points → Approaching Target; within 90 points → Improving; more than 90 points → Building Foundation. Fewer than two data points → Insufficient Data. This is a description of where you stand today, not a prediction of your next official score.
        </div>
      )}
    </div>
  );
}

// ---- 8. Recommended Next Steps ----
function NextStepsBlock({ categories, sorted, secTargets, latestSat, pracAsc, goal, setTab }) {
  const steps = [];
  const topUnresolved = categories.find((c) => c.unresolved > 0);
  if (topUnresolved) steps.push({ text: `Review the ${topUnresolved.unresolved} unresolved ${topUnresolved.skill} mistake${topUnresolved.unresolved === 1 ? "" : "s"}.`, btn: ["Review Mistakes", () => setTab("mistakes")] });

  const latest = sorted[sorted.length - 1];
  if (latest) {
    const rwGap = secTargets.rw - Number(latest.rw), mathGap = secTargets.math - Number(latest.math);
    const weaker = rwGap >= mathGap ? "Reading & Writing" : "Math";
    if (Math.max(rwGap, mathGap) > 0) steps.push({ text: `Complete one timed ${weaker} module to close your largest section gap.`, btn: ["Open Practice Plan", () => setTab("planner")] });
  }
  if (goal.nextPracticeDate) steps.push({ text: `Take your scheduled full practice test on ${fmtFull(goal.nextPracticeDate)}.`, btn: ["Add Test Result", () => setTab("tracker")] });
  else if (pracAsc.length === 0) steps.push({ text: "Take a full-length Bluebook practice test to establish a baseline.", btn: ["Add Test Result", () => setTab("tracker")] });
  else steps.push({ text: "Schedule your next practice test to keep momentum.", btn: ["Open Practice Plan", () => setTab("planner")] });

  const shown = steps.slice(0, 3);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {shown.map((s, i) => (
        <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 14, overflowWrap: "anywhere" }}><b style={{ color: C.accent }}>{i + 1}.</b> {s.text}</div>
          {s.btn && <button onClick={s.btn[1]} style={{ ...btnGhostSolid, marginTop: 0 }}>{s.btn[0]}</button>}
        </div>
      ))}
    </div>
  );
}

// ---- 9. Test History ----
function TestHistoryBlock({ valid }) {
  const [filter, setFilter] = useState("all");
  const rows = [...valid].filter((a) => filter === "all" || a.testType === filter).sort((a, b) => new Date(b.date) - new Date(a.date));
  const asc = [...valid].sort(byDateAsc);
  return (
    <div>
      <FilterRow>
        <FilterGroup label="Type" value={filter} setValue={setFilter} options={[["all", "All"], ["SAT", "SAT"], ["Practice", "Practice"]]} />
      </FilterRow>
      {rows.length === 0 ? <Empty text="No records match this filter." /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((a) => {
            const change = changeVsPrevSameType(asc, a);
            return (
              <div key={a.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 700 }}>{fmtFull(a.date)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Tag c={a.testType === "SAT" ? C.accent : C.paid}>{a.testType === "SAT" ? "Official SAT" : "Practice"}</Tag>
                    {a.source && <Tag c={C.ink2}>{a.source}</Tag>}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.ink2, marginTop: 6 }}>
                  R&W {a.rw} · Math {a.math} · <b style={{ color: C.ink }}>Total {totalOf(a)}</b>
                  {change != null && <> · Change {change >= 0 ? "+" : ""}{change}</>}
                </div>
                {a.notes && <div style={{ fontSize: 13, marginTop: 4 }}>“{a.notes}”</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
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

      <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <AgentBadge />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Agent-managed plan</div>
          <div style={{ fontSize: 13, color: C.ink2, marginTop: 2, lineHeight: 1.5 }}>
            SATGene automatically adapts your recommendations as new performance data is recorded. You can also generate a complete plan manually below.
          </div>
        </div>
      </div>

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
      <div className="sg-fields" style={{ marginBottom: 8 }}>
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

      <div className="sg-btn-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

// Saved plan history for the current kind. Only the current (most recent) plan
// shows by default; older plans collapse behind "Previous Plans (N)" so the page
// doesn't dump a long list on the student — nothing is deleted, just collapsed.
function SavedPlans({ plans, filterKind, openPlanId, setOpenPlanId, onDelete }) {
  const [showPrevious, setShowPrevious] = useState(false);
  const list = plans.filter((p) => p.planType === filterKind);
  if (list.length === 0) {
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, fontFamily: FONT_DISPLAY }}>Current plan</div>
        <Empty text={`No ${filterKind} plans yet. Generate one above — every plan is saved here.`} />
      </div>
    );
  }
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const fmtDateShort = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return iso; } };

  const [current, ...previous] = list;

  const renderPlan = (p, idx, isCurrent) => {
    const open = openPlanId === p.id;
    return (
      <div key={p.id} style={{ background: C.card, border: `1px solid ${isCurrent ? C.accent : C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {isCurrent && <Tag c={C.accent}>Current</Tag>}
            <Tag c={p.genType === "AI" ? C.paid : C.ink2}>{p.genType}</Tag>
            <span style={{ fontSize: 13, color: C.ink2 }}>{fmtDate(p.createdAt)}</span>
            {p.currentScore != null && <span style={{ fontSize: 13, color: C.ink2 }}>· current {p.currentScore}</span>}
            {p.targetScore != null && <span style={{ fontSize: 13, color: C.ink2 }}>· target {p.targetScore}</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setOpenPlanId(open ? null : p.id)} style={btnGhost}>{open ? "Hide" : isCurrent ? "Open Current Plan" : "Open"}</button>
            <button onClick={() => onDelete(p.id)} style={btnGhost}>Delete</button>
          </div>
        </div>
        {open && <div style={{ padding: "0 16px 16px" }}><PlanContent content={p.content} /></div>}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Current plan</div>
      <div style={{ fontSize: 13, color: C.ink2, marginBottom: 10 }}>
        {current.genType} Plan · {fmtDateShort(current.createdAt)}
        {current.currentScore != null && current.targetScore != null ? ` — Current ${current.currentScore} → Target ${current.targetScore}` : ""}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {renderPlan(current, 0, true)}
      </div>

      {previous.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button onClick={() => setShowPrevious((s) => !s)} className="sg-focus" style={{ ...btnGhost, padding: "6px 0", fontSize: 13.5 }}>
            Previous Plans ({previous.length}) {showPrevious ? "▲" : "▼"}
          </button>
          {showPrevious && (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {previous.map((p, idx) => renderPlan(p, idx + 1, false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- PRACTICE (Adaptive Practice + Full SAT Simulation + Resources) ----------
function PracticePage({ practiceTab, setPracticeTab, adaptiveLaunch, onConsumeLaunch, agentAction, onPracticeResult }) {
  // If the agent (or the student) launches adaptive practice while on another
  // Practice sub-tab, switch to meet it — one shared launch signal, no duplicate logic.
  useEffect(() => {
    if (adaptiveLaunch) setPracticeTab("adaptive");
  }, [adaptiveLaunch]); // eslint-disable-line react-hooks/exhaustive-deps

  const labels = { adaptive: "Adaptive Practice", full: "Full SAT Simulation", resources: "Resources" };

  return (
    <>
      <SectionTitle
        kicker="Practice, your way"
        title="Practice"
        sub="Complete SATGene-recommended adaptive practice, run a full-length timed mock, or open trusted SAT resources."
      />

      <div style={{ display: "inline-flex", background: C.soft, borderRadius: 12, padding: 4, marginBottom: 22, flexWrap: "wrap" }} role="group" aria-label="Practice section">
        {Object.entries(labels).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPracticeTab(id)}
            className="sg-focus"
            aria-pressed={practiceTab === id}
            style={{
              padding: "9px 16px", borderRadius: 9, border: "none", fontSize: 13.5, fontWeight: 700,
              background: practiceTab === id ? C.card : "transparent",
              color: practiceTab === id ? C.ink : C.ink2,
              boxShadow: practiceTab === id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {practiceTab === "adaptive" && (
        <AdaptivePractice
          launch={adaptiveLaunch}
          onConsumeLaunch={onConsumeLaunch}
          agentAction={agentAction}
          onPracticeResult={onPracticeResult}
        />
      )}
      {practiceTab === "full" && <FullSimulation />}
      {practiceTab === "resources" && <ResourcesPanel />}
    </>
  );
}

// ---- Resources (moved off Home — external SAT prep providers, links only) ----
function ResourcesPanel() {
  const [filter, setFilter] = useState("all");
  const list = PROVIDERS.filter((p) => filter === "all" || p.tier === filter);
  return (
    <>
      <p style={{ color: C.ink2, fontSize: 14, margin: "0 0 16px", maxWidth: 640 }}>
        Official practice is free and the most realistic — do it first. Paid vendors add extra question volume once you've exhausted the official pool. Each card opens the provider directly; SATGene never copies their questions.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[["all", "All"], ["official", "Official"], ["paid", "Paid vendors"]].map(([id, label]) => (
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

      <div className="sg-grid">
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
          <li>Log every result in <b>My Results</b> so Progress + the AI Planner can guide you.</li>
          <li>Only if you exhaust official practice, add a paid <b>QBank</b> like UWorld.</li>
        </ol>
      </div>
    </>
  );
}

function FullSimulation() {
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
          <p style={{ fontSize: 12, color: C.ink2, marginTop: 14 }}>This is a prototype simulation of the digital SAT's structure and pacing only — it is not official College Board scoring and never reuses copied questions. For scored practice with real questions, use Adaptive Practice.</p>
        </div>
      ) : (
        <div style={{ background: C.ink, color: "#fff", borderRadius: 16, padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: "#9DB0C4" }}>{cur.name}</div>
          <div className="sg-sim-timer" style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 64, margin: "10px 0", color: remaining < 60 ? C.accent2 : "#fff" }}>{fmt(remaining)}</div>
          {cur.adaptive !== "break" && <div style={{ color: "#9DB0C4", fontSize: 14 }}>{cur.q} questions · difficulty: {cur.adaptive === "adaptive" ? "adapts to your Module 1" : "medium"}</div>}
          {cur.adaptive === "break" && <div style={{ color: "#9DB0C4", fontSize: 14 }}>Stretch, breathe, hydrate.</div>}
          <div className="sg-btn-row" style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={next} style={{ ...btnPrimary, background: C.accent2 }}>{modIdx < mods.length - 1 ? "Next module →" : "Finish"}</button>
            <button onClick={() => { setRunning(false); setSeconds(0); setModIdx(0); }} style={{ ...btnGhost, color: "#9DB0C4", border: "1px solid #33455F", borderRadius: 10, padding: "11px 20px" }}>Exit</button>
          </div>
          <div style={{ marginTop: 18, fontSize: 12, color: "#7E93AB" }}>Slot your own reviewed questions into each module. Never paste College Board / vendor questions here.</div>
        </div>
      )}
    </>
  );
}

// ---- Adaptive Practice (Phase 2) ----
// Agent-launched (or self-selected) short practice sets drawn from the original,
// SATGene-authored question bank. Difficulty adapts question-to-question, and
// every answered question is recorded via onPracticeResult so it feeds straight
// into the Phase 1 mastery recompute — no separate mastery-update logic here.
const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
function stepDifficulty(diff, correct) {
  const i = DIFFICULTY_ORDER.indexOf(diff);
  const idx = i === -1 ? 1 : i;
  const next = correct ? Math.min(idx + 1, 2) : Math.max(idx - 1, 0);
  return DIFFICULTY_ORDER[next];
}
const todayISO = () => new Date().toISOString().slice(0, 10);

function AdaptivePractice({ launch, onConsumeLaunch, agentAction, onPracticeResult }) {
  const [session, setSession] = useState(null);
  const consumedRef = useRef(false);

  const startSession = (spec) => {
    const difficulty = spec.difficulty && DIFFICULTY_ORDER.includes(spec.difficulty) ? spec.difficulty : "medium";
    const q = pickQuestion(spec.skill, difficulty, []);
    setSession({
      section: spec.section,
      skill: spec.skill,
      reason: spec.reason || null,
      source: spec.source || "manual",
      targetCount: spec.questionCount || 5,
      difficulty,
      askedIds: q ? [q.id] : [],
      current: q,
      qNumber: 1,
      selected: null,
      revealed: false,
      hintLevel: 0,
      tutor: { loading: false, text: null, error: false },
      correctCount: 0,
      done: false,
    });
  };

  // Consume an incoming agent/mission launch exactly once.
  useEffect(() => {
    if (launch && !consumedRef.current) {
      consumedRef.current = true;
      startSession(launch);
      onConsumeLaunch();
    }
    if (!launch) consumedRef.current = false;
  }, [launch]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) {
    return <PracticePicker onStart={startSession} agentAction={agentAction} />;
  }

  if (session.done) {
    return <PracticeSummary session={session} onRestart={() => setSession(null)} />;
  }

  return (
    <PracticeQuestion
      session={session}
      setSession={setSession}
      onPracticeResult={onPracticeResult}
      onRestart={() => setSession(null)}
    />
  );
}

function PracticePicker({ onStart, agentAction }) {
  const [section, setSection] = useState("Math");
  const [skill, setSkill] = useState(SKILLS.Math[0]);
  const [difficulty, setDifficulty] = useState("medium");

  const hasRecommendation = agentAction && agentAction.kind === "practice";

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 }}>
      {hasRecommendation && (
        <div style={{ background: C.soft, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.accent, fontWeight: 700, marginBottom: 4 }}>Agent recommendation</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{agentAction.skill} <span style={{ color: C.ink2, fontWeight: 500 }}>({agentAction.section})</span></div>
          </div>
          <button
            onClick={() => onStart({
              section: agentAction.section, skill: agentAction.skill, difficulty: agentAction.startDifficulty,
              questionCount: agentAction.questionCount, reason: agentAction.reason, source: "nextAction",
            })}
            style={btnPrimary}
          >
            Practice this →
          </button>
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Or choose a skill to drill</div>
      <div className="sg-fields" style={{ marginBottom: 16 }}>
        <Field label="Section">
          <select value={section} onChange={(e) => { setSection(e.target.value); setSkill(SKILLS[e.target.value][0]); }} style={inp}>
            {Object.keys(SKILLS).map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Skill">
          <select value={skill} onChange={(e) => setSkill(e.target.value)} style={inp}>
            {SKILLS[section].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Starting difficulty">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={inp}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
          </select>
        </Field>
      </div>
      <button onClick={() => onStart({ section, skill, difficulty, questionCount: 5, source: "manual" })} style={btnPrimary}>
        Start practice set →
      </button>
      <p style={{ fontSize: 12, color: C.ink2, marginTop: 14 }}>
        Every question is original — written by SATGene, never copied from College Board or any vendor. Difficulty adapts as you answer.
      </p>
    </div>
  );
}

function PracticeQuestion({ session, setSession, onPracticeResult, onRestart }) {
  const q = session.current;

  if (!q) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 }}>
        <Empty text={`No practice questions are available yet for ${session.skill}. Try another skill.`} />
        <button onClick={onRestart} style={{ ...btnGhostSolid, marginTop: 14 }}>← Choose a different skill</button>
      </div>
    );
  }

  const select = (idx) => {
    if (session.revealed) return;
    setSession((s) => ({ ...s, selected: idx }));
  };

  const check = () => {
    if (session.selected == null || session.revealed) return;
    const correct = session.selected === q.correctIndex;
    setSession((s) => ({ ...s, revealed: true, correctCount: s.correctCount + (correct ? 1 : 0) }));
    onPracticeResult({
      skill: session.skill,
      section: session.section,
      correct,
      difficulty: session.difficulty,
      date: todayISO(),
    });
  };

  const guideMe = () => {
    setSession((s) => ({ ...s, hintLevel: Math.min((s.hintLevel || 0) + 1, 4) }));
  };

  const explain = async () => {
    setSession((s) => ({ ...s, tutor: { ...s.tutor, loading: true, error: false } }));
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: session.section,
          skill: session.skill,
          difficulty: session.difficulty,
          prompt: q.prompt,
          choices: q.choices,
          correctIndex: q.correctIndex,
          studentAnswerIndex: session.selected,
        }),
      });
      if (!res.ok) throw new Error("unavailable");
      const data = await res.json();
      if (!data.explanation) throw new Error("empty");
      setSession((s) => ({ ...s, tutor: { loading: false, text: data.explanation, error: false, source: "ai" } }));
    } catch {
      // Never show a raw error — fall back silently to the bank's own explanation.
      setSession((s) => ({ ...s, tutor: { loading: false, text: q.explanation, error: true, source: "local" } }));
    }
  };

  const advance = () => {
    const nextDiff = stepDifficulty(session.difficulty, session.selected === q.correctIndex);
    if (session.qNumber >= session.targetCount) {
      setSession((s) => ({ ...s, done: true }));
      return;
    }
    const nextQ = pickQuestion(session.skill, nextDiff, session.askedIds);
    setSession((s) => ({
      ...s,
      difficulty: nextDiff,
      askedIds: nextQ ? [...s.askedIds, nextQ.id] : s.askedIds,
      current: nextQ,
      qNumber: s.qNumber + 1,
      selected: null,
      revealed: false,
      hintLevel: 0,
      tutor: { loading: false, text: null, error: false },
    }));
  };

  const isCorrect = session.selected === q.correctIndex;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Tag c={session.section === "Math" ? C.accent2 : C.ink2}>{session.section}</Tag>
          <Tag c={C.ink2}>{session.skill}</Tag>
          <Tag c={q.difficulty === "hard" ? "#B4443A" : q.difficulty === "medium" ? C.accent2 : C.accent}>{q.difficulty}</Tag>
        </div>
        <div style={{ fontSize: 12.5, color: C.ink2, fontWeight: 600 }}>Question {session.qNumber} of {session.targetCount}</div>
      </div>

      {q.passage && <p style={{ fontSize: 14.5, lineHeight: 1.6, background: C.soft, borderRadius: 10, padding: 14, marginBottom: 14 }}>{q.passage}</p>}
      <p style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.55, marginBottom: 16, whiteSpace: "pre-line" }}>{q.prompt}</p>

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }} role="group" aria-label="Answer choices">
        {q.choices.map((choice, idx) => {
          let bg = "#fff", border = C.line, color = C.ink;
          const isCorrectChoice = session.revealed && idx === q.correctIndex;
          const isWrongSelected = session.revealed && idx === session.selected && idx !== q.correctIndex;
          if (isCorrectChoice) { bg = `${C.accent}18`; border = C.accent; }
          else if (isWrongSelected) { bg = "#B4443A18"; border = "#B4443A"; }
          else if (idx === session.selected) { border = C.accent; bg = `${C.accent}10`; }
          return (
            <button
              key={idx}
              onClick={() => select(idx)}
              disabled={session.revealed}
              className="sg-focus"
              aria-pressed={idx === session.selected}
              style={{
                textAlign: "left", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${border}`,
                background: bg, color, fontSize: 14, cursor: session.revealed ? "default" : "pointer",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <b style={{ flexShrink: 0 }}>{String.fromCharCode(65 + idx)}</b>
              <span style={{ flex: 1 }}>{choice}</span>
              {isCorrectChoice && <b style={{ color: C.accent, flexShrink: 0 }}>Correct</b>}
              {isWrongSelected && <b style={{ color: "#B4443A", flexShrink: 0 }}>Your answer</b>}
            </button>
          );
        })}
      </div>

      {/* Socratic tutor: Guide Me (instant, local) + Explain (AI, with instant fallback) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {!session.revealed && (
          <button
            onClick={guideMe}
            disabled={session.hintLevel >= 4}
            title={session.hintLevel >= 4 ? "All 4 hints shown" : "Reveal the next hint"}
            style={{ ...btnGhostSolid, marginTop: 0, opacity: session.hintLevel >= 4 ? 0.5 : 1 }}
          >
            {session.hintLevel === 0 ? "Guide Me" : `Guide Me (${session.hintLevel}/4)`}
          </button>
        )}
        {session.revealed && (
          <button onClick={explain} disabled={session.tutor.loading} style={{ ...btnGhostSolid, marginTop: 0 }}>
            {session.tutor.loading ? "Asking the AI tutor…" : "Explain differently (AI)"}
          </button>
        )}
      </div>

      {session.hintLevel > 0 && !session.revealed && (
        <div style={{ background: C.soft, borderRadius: 10, padding: 14, marginBottom: 16, display: "grid", gap: 8 }}>
          {q.hints.slice(0, session.hintLevel).map((h, i) => (
            <div key={i} style={{ fontSize: 13.5, color: C.ink2 }}><b style={{ color: C.ink }}>Hint {i + 1}:</b> {h}</div>
          ))}
        </div>
      )}

      {session.revealed && (
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 16, marginBottom: 16 }}>
          <div aria-live="polite" style={{ fontWeight: 700, color: isCorrect ? C.accent : "#B4443A", marginBottom: 8, fontSize: 14.5 }}>
            {isCorrect ? "✓ Correct" : `✗ Not quite — the correct answer is ${String.fromCharCode(65 + q.correctIndex)}`}
          </div>
          <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6 }}>
            {session.tutor.text || q.explanation}
          </div>
          {session.tutor.source === "local" && session.tutor.error && (
            <div style={{ fontSize: 11.5, color: C.ink2, marginTop: 8, fontStyle: "italic" }}>
              Showing the instant explanation — the AI tutor is unavailable right now.
            </div>
          )}
        </div>
      )}

      <div className="sg-btn-row" style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <button onClick={onRestart} style={btnGhost}>Exit practice</button>
        {!session.revealed ? (
          <button onClick={check} disabled={session.selected == null} style={{ ...btnPrimary, marginTop: 0, opacity: session.selected == null ? 0.5 : 1 }}>
            Check answer
          </button>
        ) : (
          <button onClick={advance} style={{ ...btnPrimary, marginTop: 0 }}>
            {session.qNumber >= session.targetCount ? "Finish set →" : "Next question →"}
          </button>
        )}
      </div>
    </div>
  );
}

function PracticeSummary({ session, onRestart }) {
  const pct = session.targetCount ? Math.round((session.correctCount / session.targetCount) * 100) : 0;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 26, textAlign: "center" }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: C.accent, fontWeight: 700, marginBottom: 8 }}>Set complete</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 40, marginBottom: 4 }}>{session.correctCount}/{session.targetCount}</div>
      <div style={{ color: C.ink2, fontSize: 14, marginBottom: 18 }}>{pct}% correct on {session.skill} ({session.section})</div>
      <p style={{ fontSize: 13, color: C.ink2, maxWidth: 440, margin: "0 auto 20px" }}>
        Your SAT Mastery for {session.skill} just updated on Home based on these results.
      </p>
      <button onClick={onRestart} style={btnPrimary}>Practice another skill →</button>
    </div>
  );
}

// ============================================================
// MORE PAGE — profile, settings, data & privacy, help, about
// ============================================================
function MorePage({ user, displayName, syncState, profile, setProfile, goal, setGoal, attempts, mistakes, plans, setAttempts, setMistakes, setPlans, mastery, practiceEvents, missionCompleted, setMastery, setPracticeEvents, setMissionCompleted, agentSnapshot, setAgentSnapshot, demo, onExitDemo }) {
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

  const saveText = demo ? "Demo — not saved" : syncState === "saving" ? "Saving…" : syncState === "error" ? "Save failed" : "Saved to your account";

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
        <div style={{ fontSize: 12, color: demo ? C.accent2 : syncState === "error" ? "#B4443A" : C.ink2, fontWeight: demo ? 600 : 400 }}>{saveText}</div>
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
              mastery={mastery} practiceEvents={practiceEvents} missionCompleted={missionCompleted}
              setMastery={setMastery} setPracticeEvents={setPracticeEvents} setMissionCompleted={setMissionCompleted}
              agentSnapshot={agentSnapshot} setAgentSnapshot={setAgentSnapshot}
              demo={demo} onExitDemo={onExitDemo}
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
        <div className="sg-fields">
          <Field label="Preferred name"><input value={profile.name} onChange={(e) => set("name", e.target.value)} style={inp} placeholder="e.g. Jordan" /></Field>
          <Field label="Full name"><input value={profile.fullName} onChange={(e) => set("fullName", e.target.value)} style={inp} placeholder="e.g. Jordan Rivera" /></Field>
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
        <div className="sg-fields">
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
function DataPrivacyPanel({ profile, goal, attempts, mistakes, plans, setGoal, setAttempts, setMistakes, setPlans, mastery, practiceEvents, missionCompleted, setMastery, setPracticeEvents, setMissionCompleted, agentSnapshot, setAgentSnapshot, demo, onExitDemo }) {
  const [msg, setMsg] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reauthPw, setReauthPw] = useState("");

  const exportData = () => {
    const payload = { version: 2, exportedAt: new Date().toISOString(), profile, goal, attempts, mistakes, plans, mastery, practiceEvents, missionCompleted, agentSnapshot };
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
        if (Array.isArray(data.practiceEvents)) setPracticeEvents(data.practiceEvents);
        setMastery(recomputeMastery({ mastery: data.mastery || null, attempts: data.attempts || [], mistakes: data.mistakes || [], practiceEvents: data.practiceEvents || [] }));
        setMissionCompleted(data.missionCompleted || {});
        setAgentSnapshot(data.agentSnapshot || null);
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
    setPracticeEvents([]); setMastery(blankMastery()); setMissionCompleted({}); setAgentSnapshot(null);
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

      {demo && (
        <PanelCard style={{ background: "#FFF8EC", borderColor: "#E9CFA0" }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.accent2 }}>You're in Demo Student mode</div>
          <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "0 0 12px" }}>
            Everything below operates on the sample data in this browser tab only — nothing is tied to a real account, and none of it is ever sent to Firestore. Exit the demo to sign in for real.
          </p>
          <button onClick={onExitDemo} style={btnGhostSolid}>Exit demo</button>
        </PanelCard>
      )}

      <PanelCard>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>What we store</div>
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: 0 }}>
          SATGene stores your profile, SAT and practice scores, mistake log, targets, test dates, and generated
          plans under your account. Data is isolated to your sign-in and syncs across your devices.
        </p>
      </PanelCard>

      <div className="sg-grid">
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

      {/* Danger zone: delete account — not applicable in Demo Student mode, since
          there is no real signed-in account to delete. */}
      {demo ? (
        <div style={{ background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginTop: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Delete account</div>
          <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: 0 }}>
            Demo Student isn't a real account, so there's nothing to delete. Exit the demo above whenever you're done exploring.
          </p>
        </div>
      ) : (
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
      )}

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
    ["Home", "SATGene analyzes your saved results and recommends what you should work on next — Next Best Action, Today's Mission, SATGene Noticed, a mastery snapshot, and your active study plan."],
    ["My Results", "Record official SAT scores, practice-test scores, and mistakes under Test Scores and Mistakes. These become the evidence SATGene uses to understand your progress. Official SAT records can contribute to your superscore; practice-test scores never do."],
    ["Practice", "Complete SATGene-recommended adaptive practice, run a full-length timed SAT simulation, or open trusted official and vendor SAT resources."],
    ["Progress", "See score trends, section trends, mastery, weak areas, SAT readiness, and recommended next steps — answers the question \"Am I improving?\""],
    ["More", "Manage your profile, settings, data & privacy, help, and application information. The AI Planner is reached from Home → Active Study Plan → View Full Plan, or from Progress."],
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
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>About this project</div>
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6, margin: 0 }}>
          SATGene is an independent educational prototype. The project explores how responsible data tracking,
          analytics, and artificial intelligence can help students understand their SAT preparation progress and
          plan their next steps.
        </p>
      </PanelCard>

      <PanelCard>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Features</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: C.ink2, lineHeight: 1.7 }}>
          <li><b>SATGene Agent (Home)</b> — Next Best Action, Today's Mission, and SATGene Noticed, from your real data.</li>
          <li><b>My Results</b> — log official and practice SAT scores and mistakes separately.</li>
          <li><b>Practice</b> — agent-directed adaptive practice, a full-length simulation, and trusted SAT resources.</li>
          <li><b>Progress</b> — score and section trends, mastery, weak areas, readiness, and next steps.</li>
          <li><b>SAT Superscore</b> — best section scores across official SATs.</li>
          <li><b>AI Study Planner</b> — agent-managed, with model-generated or Instant rule-based plans.</li>
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
          ["Independent project", "SATGene is an independent educational prototype. It is intended to help students organize test results, review mistakes, view performance trends, and create study plans."],
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

const inp = { width: "100%", padding: "11px 12px", minHeight: 44, border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 14, background: "#fff", color: C.ink, outline: "none" };
const invalidInp = { borderColor: "#B4443A", background: "#FBEAE8" };
const btnPrimary = { marginTop: 14, minHeight: 44, background: C.accent, color: "#fff", border: "none", padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700 };
const btnGhost = { background: "none", border: "none", color: C.ink2, fontSize: 13, fontWeight: 600, padding: "8px 10px" };
const btnGhostSolid = { marginTop: 14, minHeight: 44, background: "#fff", color: C.ink, border: `1px solid ${C.line}`, padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700 };
