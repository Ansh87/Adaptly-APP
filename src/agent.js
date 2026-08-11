// ============================================================
// SATGene Agent Engine — deterministic, AI-free core.
// OBSERVE → DIAGNOSE → DECIDE. Turns saved student data into a
// mastery model, skill priorities, a Next Best Action, and a
// Today's Mission. No Gemini call happens here; the engine is the
// source of truth and works fully offline (accessibility).
// ============================================================

// Canonical SAT taxonomy — MUST match the SKILLS strings used across the app
// so Mistake Log entries, analytics, and mastery all key on the same names.
export const AGENT_TAXONOMY = {
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

export const ALL_SKILLS = Object.entries(AGENT_TAXONOMY).flatMap(([section, skills]) =>
  skills.map((skill) => ({ section, skill }))
);

// Status thresholds for a 0–100 mastery score.
export function masteryStatus(score) {
  if (score == null) return "Not Assessed";
  if (score >= 75) return "Strong";
  if (score >= 50) return "Developing";
  return "Needs Review";
}

// A fresh, neutral mastery record for a skill. Starting mastery is null
// ("Not Assessed") until real evidence exists — never a fake number.
function blankSkill(section, skill) {
  return {
    section,
    skill,
    mastery: null,        // 0–100 or null when unassessed
    attempts: 0,          // adaptive-practice questions answered
    correct: 0,
    incorrect: 0,
    recentMistakes: 0,    // mistake-log count in the recent window
    confidenceAvg: null,  // from test records, if available
    lastPracticed: null,  // ISO date string
    trend: 0,             // + improving, - declining, 0 flat
    history: [],          // recent mastery values for trend (max ~10)
  };
}

// Build a full mastery map for all skills (used as the default state).
export function blankMastery() {
  const map = {};
  ALL_SKILLS.forEach(({ section, skill }) => { map[skill] = blankSkill(section, skill); });
  return map;
}

const RECENT_WINDOW_DAYS = 30;
const withinDays = (dateStr, days) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  return (Date.now() - d.getTime()) / 86400000 <= days;
};

// ---- MASTERY UPDATE -----------------------------------------------------
// Recomputes the mastery map from all evidence. Deterministic and idempotent:
// given the same inputs it always yields the same output, so it can run after
// every new piece of evidence without drift.
//
// Evidence weighting (per spec §2): adaptive-practice answers and mistakes are
// primary; section scores are broad supporting evidence only.
export function recomputeMastery({ mastery, attempts = [], mistakes = [], practiceEvents = [] }) {
  const map = mastery ? JSON.parse(JSON.stringify(mastery)) : blankMastery();
  // Ensure every skill exists (handles taxonomy changes / older saves).
  ALL_SKILLS.forEach(({ section, skill }) => { if (!map[skill]) map[skill] = blankSkill(section, skill); });

  // 1) Adaptive practice events: [{ skill, correct, difficulty, date }]
  const bySkillEvents = {};
  practiceEvents.forEach((e) => {
    if (!map[e.skill]) return;
    (bySkillEvents[e.skill] = bySkillEvents[e.skill] || []).push(e);
  });

  // 2) Mistake-log counts in recent window, per skill.
  const recentMistakeCounts = {};
  mistakes.forEach((m) => {
    if (!m.skill) return;
    if (withinDays(m.date, RECENT_WINDOW_DAYS)) {
      recentMistakeCounts[m.skill] = (recentMistakeCounts[m.skill] || 0) + (m.mastered ? 0 : 1);
    }
  });

  // 3) Section-level supporting evidence: latest valid test per section score.
  const latestValid = [...attempts]
    .filter((a) => a && a.rw != null && a.math != null)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const sectionPct = latestValid
    ? {
        "Reading & Writing": clamp01((Number(latestValid.rw) - 200) / 600),
        Math: clamp01((Number(latestValid.math) - 200) / 600),
      }
    : null;

  ALL_SKILLS.forEach(({ section, skill }) => {
    const rec = map[skill];
    const events = bySkillEvents[skill] || [];
    const answered = events.length;
    const correct = events.filter((e) => e.correct).length;
    const incorrect = answered - correct;

    rec.attempts = (rec.attempts || 0) + 0; // attempts tracked cumulatively elsewhere
    // Cumulative counters come from the stored record; practiceEvents here are the
    // authoritative recomputation source when provided.
    if (answered > 0) {
      rec.attempts = answered;
      rec.correct = correct;
      rec.incorrect = incorrect;
      const last = events.map((e) => e.date).filter(Boolean).sort().slice(-1)[0];
      if (last) rec.lastPracticed = last;
    }

    rec.recentMistakes = recentMistakeCounts[skill] || 0;

    // --- Derive mastery 0–100 ---
    // Primary signal: practice accuracy (weighted by volume so 1 answer isn't gospel).
    let score = null;
    if (answered > 0) {
      const accuracy = correct / answered; // 0..1
      const volumeConfidence = Math.min(1, answered / 6); // 6 answers => full confidence
      const practiceScore = accuracy * 100;
      // Blend toward section evidence when practice volume is low.
      const secScore = sectionPct ? sectionPct[section] * 100 : practiceScore;
      score = practiceScore * volumeConfidence + secScore * (1 - volumeConfidence);
    }
    // NOTE: when there is no direct skill-level evidence (no adaptive-practice
    // attempts for this specific skill), score stays null — "Not Assessed" — even
    // if a section-level test score exists. A single R&W or Math section score is
    // broad evidence for the whole section, not proof about any one skill inside
    // it, so it must never be used to invent a per-skill mastery number (including
    // a fabricated 0%). Section evidence is still used above as a supporting blend
    // once direct practice evidence exists (see secScore).

    // Penalize for recent unresolved mistakes (each shaves a few points, capped).
    if (score != null && rec.recentMistakes > 0) {
      score = Math.max(0, score - Math.min(20, rec.recentMistakes * 5));
    }

    if (score != null) {
      score = Math.round(clamp(score, 0, 100));
      // Trend from history.
      const prev = rec.history && rec.history.length ? rec.history[rec.history.length - 1] : null;
      rec.trend = prev == null ? 0 : Math.sign(score - prev);
      rec.history = [...(rec.history || []), score].slice(-10);
      rec.mastery = score;
    }
  });

  return map;
}

// ---- PRIORITY ENGINE ----------------------------------------------------
// Deterministic weighted score per skill (per spec §3). Higher = more urgent.
// Weights: 35 mastery weakness, 25 recent mistakes, 15 incorrect rate,
// 10 low confidence, 10 recency, 5 time pressure.
const PRIORITY_WEIGHTS = {
  masteryWeakness: 0.35,
  recentMistakes: 0.25,
  incorrectRate: 0.15,
  lowConfidence: 0.10,
  recency: 0.10,
  timePressure: 0.05,
};

export function computePriorities({ mastery, mistakes = [], goal = {}, attempts = [] }) {
  const map = mastery || blankMastery();

  // Normalizers across skills.
  const maxRecentMistakes = Math.max(1, ...ALL_SKILLS.map(({ skill }) => map[skill]?.recentMistakes || 0));

  // Time pressure: fewer days to SAT => higher (0..1). Unknown => neutral 0.3.
  const days = goal.nextSatDate ? Math.max(0, Math.ceil((new Date(goal.nextSatDate) - Date.now()) / 86400000)) : null;
  const timePressure = days == null ? 0.3 : clamp01(1 - days / 120); // within ~4mo ramps up

  const now = Date.now();

  const scored = ALL_SKILLS.map(({ section, skill }) => {
    const r = map[skill] || blankSkill(section, skill);

    // 1) mastery weakness (0..1): lower mastery => higher. Unassessed => 0.6 (worth probing).
    const masteryWeakness = r.mastery == null ? 0.6 : clamp01((100 - r.mastery) / 100);

    // 2) recent mistakes (0..1) normalized across skills.
    const recentMistakes = clamp01((r.recentMistakes || 0) / maxRecentMistakes);

    // 3) incorrect-answer rate (0..1).
    const answered = (r.correct || 0) + (r.incorrect || 0);
    const incorrectRate = answered > 0 ? clamp01(r.incorrect / answered) : 0.3;

    // 4) low confidence (0..1): invert confidenceAvg (1..5). Unknown => neutral 0.4.
    const lowConfidence = r.confidenceAvg == null ? 0.4 : clamp01((5 - r.confidenceAvg) / 4);

    // 5) recency (0..1): longer since practiced => higher. Never practiced => 0.7.
    let recency = 0.7;
    if (r.lastPracticed) {
      const d = (now - new Date(r.lastPracticed).getTime()) / 86400000;
      recency = clamp01(d / 21); // ~3 weeks => fully "stale"
    }

    const raw =
      PRIORITY_WEIGHTS.masteryWeakness * masteryWeakness +
      PRIORITY_WEIGHTS.recentMistakes * recentMistakes +
      PRIORITY_WEIGHTS.incorrectRate * incorrectRate +
      PRIORITY_WEIGHTS.lowConfidence * lowConfidence +
      PRIORITY_WEIGHTS.recency * recency +
      PRIORITY_WEIGHTS.timePressure * timePressure;

    return {
      section, skill,
      priority: Math.round(raw * 100), // 0..100
      mastery: r.mastery,
      status: masteryStatus(r.mastery),
      recentMistakes: r.recentMistakes || 0,
      // Direct adaptive-practice evidence count for this skill. Used by
      // nextBestAction to tell "we have real skill-level evidence somewhere"
      // apart from "we only have a broad section score" (see Fix 3 below).
      attempts: r.attempts || 0,
      factors: { masteryWeakness, recentMistakes, incorrectRate, lowConfidence, recency, timePressure },
    };
  });

  return scored.sort((a, b) => b.priority - a.priority);
}

// ---- NEXT BEST ACTION ---------------------------------------------------
// The top-priority skill becomes the recommendation, with a data-grounded reason.
const START_DIFFICULTY_BY_STATUS = {
  "Needs Review": "easy",
  Developing: "medium",
  Strong: "hard",
  "Not Assessed": "medium", // diagnostic starting point — never "hard" by default
};

export function nextBestAction({ priorities, mistakes = [], attempts = [] }) {
  const enoughData = attempts.length > 0 || mistakes.length > 0;
  if (!enoughData || !priorities || priorities.length === 0) {
    return { kind: "diagnostic", reason: "Complete a diagnostic practice session so SATGene can identify your priorities." };
  }

  // Don't invent a skill weakness from a section score alone. If we have test
  // scores (`attempts`, i.e. Test Tracker records) but no skill-level evidence
  // anywhere — no Mistake Log entry tagged with a skill, and no priority with
  // direct adaptive-practice attempts — a total Math or R&W score is not enough
  // to name a specific SAT domain as "the weakness." Recommend a diagnostic on
  // the weaker section instead, and let normal Next Best Action logic resume
  // once real skill-level evidence exists.
  const hasSkillEvidence =
    mistakes.some((m) => m.skill) || priorities.some((p) => (p.attempts || 0) > 0);
  if (attempts.length > 0 && !hasSkillEvidence) {
    const latestValid = [...attempts]
      .filter((a) => a && a.rw != null && a.math != null)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latestValid) {
      const weakerSection = Number(latestValid.math) <= Number(latestValid.rw) ? "Math" : "Reading & Writing";
      return {
        kind: "sectionDiagnostic",
        section: weakerSection,
        reason: `We have your ${weakerSection} section score, but not enough skill-level evidence yet. Complete a short diagnostic so SATGene can identify the specific area to work on next.`,
        questionCount: 6,
        minutes: 15,
        startDifficulty: "medium",
      };
    }
  }

  const top = priorities[0];

  // Build a concrete, data-grounded "why" from the mistake log.
  const sectionMistakes = mistakes.filter((m) => m.section === top.section);
  const skillMistakes = sectionMistakes.filter((m) => m.skill === top.skill);
  const recentSection = sectionMistakes.slice(-7);
  const inSkill = recentSection.filter((m) => m.skill === top.skill).length;

  let reason;
  if (skillMistakes.length > 0 && recentSection.length > 0) {
    reason = `${inSkill} of your last ${recentSection.length} ${top.section} mistakes were in this skill.`;
  } else if (top.mastery != null) {
    reason = `Your ${top.skill} mastery is ${top.mastery}% (${top.status}), your highest-priority area right now.`;
  } else {
    reason = `${top.skill} hasn't been assessed yet and is a likely gap to probe first.`;
  }

  const estMinutes = 15;
  const questionCount = top.status === "Needs Review" ? 6 : 5;

  return {
    kind: "practice",
    section: top.section,
    skill: top.skill,
    mastery: top.mastery,
    status: top.status,
    minutes: estMinutes,
    questionCount,
    reason,
    startDifficulty: START_DIFFICULTY_BY_STATUS[top.status] || "medium",
  };
}

// ---- TODAY'S MISSION ----------------------------------------------------
// 2–4 practical actions derived from priorities, mistakes, and targets.
export function todaysMission({ priorities, mistakes = [], attempts = [], goal = {}, completed = {} }) {
  const items = [];

  const unresolved = mistakes.filter((m) => !m.mastered);
  if (unresolved.length >= 3) {
    items.push({ id: "review-mistakes", label: `Review ${Math.min(3, unresolved.length)} previous mistakes`, minutes: 10, kind: "review" });
  }

  const top = priorities && priorities[0];
  if (top) {
    items.push({ id: `practice-${top.skill}`, label: `${top.skill} adaptive practice`, minutes: 15, kind: "practice", section: top.section, skill: top.skill });
  }
  const second = priorities && priorities[1];
  if (second && second.section !== (top && top.section)) {
    items.push({ id: `practice-${second.skill}`, label: `${second.skill} timed set`, minutes: 15, kind: "practice", section: second.section, skill: second.skill });
  } else if (second) {
    items.push({ id: `practice-${second.skill}`, label: `${second.skill} adaptive practice`, minutes: 15, kind: "practice", section: second.section, skill: second.skill });
  }

  // Keep it 2–4 items.
  const finalItems = items.slice(0, 4);
  const done = finalItems.filter((it) => completed[it.id]).length;
  return { items: finalItems, done, total: finalItems.length };
}

// ---- helpers ------------------------------------------------------------
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function clamp01(v) { return clamp(v, 0, 1); }