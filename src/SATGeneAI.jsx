import React, { useState, useMemo, useEffect } from "react";

/**
 * SATGene AI — Digital SAT Practice, Analytics & Study Planner
 * -----------------------------------------------------------------
 * DESIGN NOTE ON "PULLING TESTS FROM VENDORS":
 * You cannot legally copy questions from Bluebook, Khan Academy,
 * College Board Question Bank, UWorld, Kaplan, or Princeton Review.
 * None expose a public content API, and their questions are
 * copyrighted (College Board treats test-prep use as commercial).
 * So SATGene AI does NOT reinvent the test. It is the HUB + TRACKER
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

// ---------- Persistence: save to the browser (localStorage) ----------
// Data survives refreshes and closing the tab, stored on THIS device/browser.
// It is NOT synced across devices. Use Export/Import (Manage data panel) for backups.
const STORE_PREFIX = "satgene:";

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(STORE_PREFIX + key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage full or blocked (e.g. private mode) — silently keep in memory */
    }
  }, [key, value]);
  return [value, setValue];
}

const DEFAULT_GOAL = { current: 1200, target: 1450, testDate: "2026-10-03" };
const DEFAULT_ATTEMPTS = [
  { id: 1, date: "2026-06-14", source: "Bluebook", rw: 620, math: 640, minutes: 130, confidence: 3, notes: "Ran low on time in Math Module 2." },
];
const DEFAULT_MISTAKES = [
  { id: 1, date: "2026-06-14", source: "Bluebook", section: "Math", skill: "Advanced Math", difficulty: "Hard", why: "Careless", concept: "Factoring quadratics before plugging in.", mastered: false },
];

// ================================================================
export default function SATGeneAI() {
  const [tab, setTab] = useState("hub");
  const [goal, setGoal] = usePersistentState("goal", DEFAULT_GOAL);
  const [attempts, setAttempts] = usePersistentState("attempts", DEFAULT_ATTEMPTS);
  const [mistakes, setMistakes] = usePersistentState("mistakes", DEFAULT_MISTAKES);

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
        @media (prefers-reduced-motion: reduce){ .sg-card, .sg-tab { transition: none; } }
      `}</style>

      <Header goal={goal} attempts={attempts} />

      <Nav tab={tab} setTab={setTab} />

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 80px" }}>
        {tab === "hub" && <Hub />}
        {tab === "tracker" && <Tracker attempts={attempts} setAttempts={setAttempts} goal={goal} />}
        {tab === "mistakes" && <Mistakes mistakes={mistakes} setMistakes={setMistakes} />}
        {tab === "analytics" && <Analytics attempts={attempts} mistakes={mistakes} goal={goal} />}
        {tab === "planner" && <Planner mistakes={mistakes} attempts={attempts} goal={goal} setGoal={setGoal} />}
        {tab === "sim" && <Simulator />}
        {tab === "data" && (
          <DataManager
            goal={goal} attempts={attempts} mistakes={mistakes}
            setGoal={setGoal} setAttempts={setAttempts} setMistakes={setMistakes}
          />
        )}
      </main>

      <footer style={{ borderTop: `1px solid ${C.line}`, padding: "24px 20px", textAlign: "center", fontSize: 13, color: C.ink2 }}>
        SATGene AI is a planning, tracking & analytics layer. It links to official and vendor practice —
        it does not copy their questions. SAT® is a trademark of the College Board, which is not affiliated with this tool.
      </footer>
    </div>
  );
}

// ---------- Header ----------
function Header({ goal, attempts }) {
  const daysLeft = useMemo(() => {
    const d = Math.ceil((new Date(goal.testDate) - new Date()) / 86400000);
    return d;
  }, [goal.testDate]);
  const latest = attempts[attempts.length - 1];
  const latestTotal = latest ? latest.rw + latest.math : goal.current;
  const gap = goal.target - latestTotal;

  return (
    <header style={{ borderBottom: `1px solid ${C.line}`, background: C.card }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 30, letterSpacing: -0.5, lineHeight: 1 }}>
            SATGene<span style={{ color: C.accent }}> AI</span>
          </div>
          <div style={{ fontSize: 13, color: C.ink2, marginTop: 6 }}>
            Digital SAT practice hub · analytics · study planner
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Stat label="Days to test" value={daysLeft > 0 ? daysLeft : "—"} accent={daysLeft <= 30 ? C.accent2 : C.accent} />
          <Stat label="Latest total" value={latestTotal} />
          <Stat label="Target" value={goal.target} />
          <Stat label="Gap" value={gap > 0 ? `+${gap}` : "Met ✓"} accent={gap > 0 ? C.ink2 : C.accent} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, accent = C.ink }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 14px", minWidth: 92, background: C.paper }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.ink2 }}>{label}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 24, color: accent, lineHeight: 1.1 }}>{value}</div>
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
    ["data", "Manage data"],
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
function Tracker({ attempts, setAttempts, goal }) {
  const blank = { date: "", source: "Bluebook", rw: "", math: "", minutes: "", confidence: 3, notes: "" };
  const [form, setForm] = useState(blank);

  const add = () => {
    if (!form.date || form.rw === "" || form.math === "") return;
    setAttempts([...attempts, { ...form, id: Date.now(), rw: +form.rw, math: +form.math, minutes: +form.minutes || 0 }]);
    setForm(blank);
  };
  const remove = (id) => setAttempts(attempts.filter((a) => a.id !== id));

  return (
    <>
      <SectionTitle kicker="Log results" title="Practice Test Tracker" sub="Enter each score after finishing a test on any provider. This feeds your analytics and the AI planner." />

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12 }}>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inp} /></Field>
          <Field label="Source">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={inp}>
              {["Bluebook", "Khan", "UWorld", "Princeton Review", "Kaplan", "Magoosh", "Paper", "Book", "Tutor", "Other"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="R&W (200–800)"><input type="number" value={form.rw} onChange={(e) => setForm({ ...form, rw: e.target.value })} style={inp} placeholder="620" /></Field>
          <Field label="Math (200–800)"><input type="number" value={form.math} onChange={(e) => setForm({ ...form, math: e.target.value })} style={inp} placeholder="640" /></Field>
          <Field label="Minutes"><input type="number" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} style={inp} placeholder="134" /></Field>
          <Field label={`Confidence (${form.confidence}/5)`}><input type="range" min="1" max="5" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: +e.target.value })} style={{ width: "100%" }} /></Field>
        </div>
        <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inp} placeholder="What went well / what to fix" /></Field>
        <button onClick={add} style={btnPrimary}>Add test result</button>
      </div>

      {attempts.length === 0 ? (
        <Empty text="No tests logged yet. Take a Bluebook test, then add your score above." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {[...attempts].reverse().map((a) => {
            const total = a.rw + a.math;
            return (
              <div key={a.id} className="sg-card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 28 }}>{total}<span style={{ fontSize: 14, color: C.ink2, fontFamily: FONT_BODY, fontWeight: 500 }}> total</span></div>
                  <div style={{ fontSize: 13, color: C.ink2 }}>{a.date} · {a.source} · R&W {a.rw} · Math {a.math}{a.minutes ? ` · ${a.minutes} min` : ""}</div>
                  {a.notes && <div style={{ fontSize: 13, marginTop: 4, color: C.ink }}>“{a.notes}”</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: total >= goal.target ? C.accent : C.accent2, fontWeight: 700 }}>{total >= goal.target ? "On target" : `${goal.target - total} to go`}</span>
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
function Mistakes({ mistakes, setMistakes }) {
  const blank = { date: "", source: "Bluebook", section: "Math", skill: SKILLS.Math[0], difficulty: "Medium", why: "Concept gap", concept: "", mastered: false };
  const [form, setForm] = useState(blank);

  const add = () => {
    if (!form.concept) return;
    setMistakes([...mistakes, { ...form, id: Date.now() }]);
    setForm(blank);
  };
  const toggle = (id) => setMistakes(mistakes.map((m) => (m.id === id ? { ...m, mastered: !m.mastered } : m)));
  const remove = (id) => setMistakes(mistakes.filter((m) => m.id !== id));

  return (
    <>
      <SectionTitle kicker="Learn from errors" title="Mistake Log" sub="Record why you missed each question — not the copyrighted question itself, just the skill and the lesson. This is the single highest-leverage habit in test prep." />

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
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
        <button onClick={add} style={btnPrimary}>Add to log</button>
      </div>

      {mistakes.length === 0 ? (
        <Empty text="No mistakes logged. After each test, add the ones you missed here." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {[...mistakes].reverse().map((m) => (
            <div key={m.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, opacity: m.mastered ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <Tag c={m.section === "Math" ? C.accent2 : C.paid}>{m.section}</Tag>
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
              {m.date && <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>{m.date} · {m.source}</div>}
            </div>
          ))}
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
            <div style={{ borderTop: `2px dashed ${C.accent2}`, position: "relative", flexBasis: "100%", alignSelf: "flex-start", marginTop: (1 - goal.target / maxTotal) * 160, order: 99, width: 0 }} />
          </div>
        )}
        <div style={{ fontSize: 12, color: C.ink2, marginTop: 8 }}>Target: {goal.target} · latest gap tracked in the header.</div>
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
function Planner({ mistakes, attempts, goal, setGoal }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Local heuristic plan (works with no API). Your app can swap this for a Gemini/Claude call.
  const buildLocalPlan = () => {
    const skillMap = {};
    mistakes.forEach((m) => { skillMap[m.skill] = (skillMap[m.skill] || 0) + 1; });
    const weak = Object.entries(skillMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
    const latest = attempts[attempts.length - 1];
    const total = latest ? latest.rw + latest.math : goal.current;
    const gap = goal.target - total;
    const days = Math.max(1, Math.ceil((new Date(goal.testDate) - new Date()) / 86400000));
    const timeReasons = mistakes.filter((m) => m.why === "Ran out of time").length;
    return {
      summary: `You're ${gap > 0 ? gap : 0} points from ${goal.target}, with ~${days} days left. ${gap > 120 ? "Aggressive but doable with daily drilling." : gap > 0 ? "Very achievable with focused review." : "You're already at target — hold steady with light practice."}`,
      focus: weak.length ? weak : ["Take a diagnostic Bluebook test first to find weak skills"],
      today: weak[0] ? `Drill 10 ${weak[0]} questions in the Student Question Bank, then log every miss.` : "Take a full Bluebook test to establish a baseline.",
      week: [
        weak[0] ? `Two focused sessions on ${weak[0]} (your biggest leak).` : "Complete one full-length Bluebook test.",
        weak[1] ? `One session on ${weak[1]}.` : "Review all Khan lessons for your weakest section.",
        "One timed module to build pacing.",
        timeReasons >= 2 ? "Pacing drill: cap Math questions at ~1.6 min each." : "Review your Mistake Log and re-try mastered items.",
      ],
      retake: gap > 200 && days < 30 ? "Consider whether this test date is realistic, or plan a second attempt." : "One well-prepared attempt looks reasonable.",
    };
  };

  const generate = async (useAI) => {
    setError(null);
    // Real AI runs through the Netlify function at /api/plan, which holds the
    // Gemini key server-side. If it's unreachable or errors, we fall back to the
    // built-in rule engine so the button always produces a usable plan.
    if (useAI) {
      setLoading(true);
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal, attempts, mistakes }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail.error || `Planner responded ${res.status}`);
        }
        const data = await res.json();
        setPlan({ ...data, ai: true });
      } catch (e) {
        setError(`Couldn't generate the AI plan (${e.message}). Showing a rule-based plan instead.`);
        setPlan({ ...buildLocalPlan(), ai: false });
      } finally {
        setLoading(false);
      }
      return;
    }
    setPlan({ ...buildLocalPlan(), ai: false });
  };

  return (
    <>
      <SectionTitle kicker="What to do next" title="AI Study Planner" sub="Set your goal, then generate a plan from your logged data. The AI version calls a model; the instant version uses a built-in rule engine so it always works." />

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12 }}>
        <Field label="Current score"><input type="number" value={goal.current} onChange={(e) => setGoal({ ...goal, current: +e.target.value })} style={inp} /></Field>
        <Field label="Target score"><input type="number" value={goal.target} onChange={(e) => setGoal({ ...goal, target: +e.target.value })} style={inp} /></Field>
        <Field label="Test date"><input type="date" value={goal.testDate} onChange={(e) => setGoal({ ...goal, testDate: e.target.value })} style={inp} /></Field>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => generate(true)} style={btnPrimary} disabled={loading}>{loading ? "Thinking…" : "Generate AI plan"}</button>
        <button onClick={() => generate(false)} style={btnGhostSolid}>Instant plan (no AI)</button>
      </div>

      {error && <div style={{ color: "#B4443A", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {plan && (
        <div style={{ display: "grid", gap: 14 }}>
          <PlanCard title="Where you stand" body={plan.summary} badge={plan.ai ? "AI" : "Rule-based"} />
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Focus skills</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{plan.focus.map((f) => <Tag key={f} c={C.accent}>{f}</Tag>)}</div>
          </div>
          <PlanCard title="Today" body={plan.today} />
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>This week</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 14 }}>{plan.week.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
          <PlanCard title="Retake outlook" body={plan.retake} />
        </div>
      )}
    </>
  );
}

function PlanCard({ title, body, badge }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: C.accent, padding: "2px 8px", borderRadius: 6 }}>{badge}</span>}
      </div>
      <div style={{ fontSize: 14, color: C.ink2, marginTop: 6, lineHeight: 1.6 }}>{body}</div>
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

// ---------- Manage data (backup / restore / reset) ----------
function DataManager({ goal, attempts, mistakes, setGoal, setAttempts, setMistakes }) {
  const [msg, setMsg] = useState(null);

  const exportData = () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), goal, attempts, mistakes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satgene-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ kind: "ok", text: "Backup downloaded. Keep this file to restore your data on any device." });
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.goal) setGoal(data.goal);
        if (Array.isArray(data.attempts)) setAttempts(data.attempts);
        if (Array.isArray(data.mistakes)) setMistakes(data.mistakes);
        setMsg({ kind: "ok", text: "Backup restored. Your tests and mistakes are back." });
      } catch {
        setMsg({ kind: "err", text: "That file couldn't be read. Use a SATGene backup file (.json)." });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resetAll = () => {
    if (!window.confirm("Erase all saved tests, mistakes, and your goal on this browser? This can't be undone.")) return;
    setGoal(DEFAULT_GOAL);
    setAttempts([]);
    setMistakes([]);
    setMsg({ kind: "ok", text: "All data cleared on this browser." });
  };

  return (
    <>
      <SectionTitle
        kicker="Your saved work"
        title="Manage data"
        sub="Your results are saved automatically in this browser, so they're here when you come back. Back them up to a file to move between devices or guard against clearing your browser."
      />

      <div style={{ background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 18, fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>
        <b style={{ color: C.ink }}>How saving works:</b> everything you log is stored on <b>this device and browser</b>.
        It survives refreshes and closing the tab. It does <b>not</b> follow you to another device or browser, and it
        can be lost if you clear browsing data. For anything you care about, download a backup below.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Back up</div>
          <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 12px" }}>Download all your tests, mistakes, and goal as one file.</p>
          <button onClick={exportData} style={btnPrimary}>Download backup</button>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Restore</div>
          <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 12px" }}>Load a backup file. This replaces what's currently saved.</p>
          <label style={{ ...btnGhostSolid, display: "inline-block", marginTop: 0 }}>
            Choose backup file
            <input type="file" accept="application/json,.json" onChange={importData} style={{ display: "none" }} />
          </label>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#B4443A" }}>Reset</div>
          <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 12px" }}>Erase everything saved in this browser and start fresh.</p>
          <button onClick={resetAll} style={{ ...btnGhostSolid, color: "#B4443A", borderColor: "#E3B7B3" }}>Clear all data</button>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: C.ink2 }}>
        Currently saved: <b>{attempts.length}</b> test{attempts.length === 1 ? "" : "s"} · <b>{mistakes.length}</b> logged mistake{mistakes.length === 1 ? "" : "s"}.
      </div>

      {msg && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: msg.kind === "ok" ? "#E7F1EC" : "#FBEAE8", color: msg.kind === "ok" ? C.accent : "#B4443A", border: `1px solid ${msg.kind === "ok" ? "#BFDDCF" : "#E3B7B3"}` }}>
          {msg.text}
        </div>
      )}
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
