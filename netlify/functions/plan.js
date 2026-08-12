// Netlify Function: POST /api/plan
// Generates a SAT or Practice study plan with Google Gemini. The API key stays
// server-side (set GEMINI_API_KEY in Netlify → Environment variables) and is never
// sent to the browser or logged.
//
// Model selection: defaults to gemini-2.5-flash (gemini-2.0-flash was retired
// June 1, 2026). gemini-2.5-flash is itself scheduled for retirement, so the model
// ID is read from the GEMINI_MODEL env var when present — you can migrate to a newer
// model (e.g. gemini-2.5-flash-lite or a 3.x model) by changing that variable in
// Netlify and redeploying, with NO code change.
//
// Request body:  { planKind, goal:{target,nextDate}, latest, supportingLatest, attempts, mistakes,
//                  mastery, priorities, recentPractice }
// Response body: { summary, focus[], week[], practiceSchedule, nextAction }
//   On upstream failure the frontend shows the error and the student retries.
//   Requires "Authorization: Bearer <Firebase ID token>" — see _verifyAuth.js.

import { verifyRequestAuth } from "./_verifyAuth.js";

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Fix 8: never spend a Gemini call for an unauthenticated caller — except
  // Demo Student mode, which is allowed so the full experience (including AI
  // plans) works without an account. NOTE: the demo flag is client-supplied,
  // so this effectively opens the endpoint to anonymous callers; re-lock it
  // (or rate-limit demo calls) before a public launch.
  let authResult = null;
  let authError = null;
  try {
    authResult = await verifyRequestAuth(req);
  } catch (e) {
    authError = e;
    console.error("[plan] Auth verification unavailable:", e?.message || e);
  }
  const isDemo = body?.demo === true;
  if (!authResult && !isDemo) {
    if (authError) return json({ error: "Sign-in verification is not configured on the server." }, 500);
    return json({ error: "Sign in required." }, 401);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Never log the key; this branch means it's simply absent.
    console.error("[plan] GEMINI_API_KEY is not set on the server");
    return json({ error: "AI service is not configured." }, 500);
  }

  const {
    planKind = "SAT", goal = {}, latest = null, supportingLatest = null, mistakes = [],
    mastery = [], priorities = [], recentPractice = [],
  } = body;
  const isSAT = planKind === "SAT";
  const latestTotal = latest ? (Number(latest.rw) || 0) + (Number(latest.math) || 0) : null;
  const supportTotal = supportingLatest ? (Number(supportingLatest.rw) || 0) + (Number(supportingLatest.math) || 0) : null;
  const daysLeft = goal.nextDate
    ? Math.max(0, Math.ceil((new Date(goal.nextDate) - new Date()) / 86400000))
    : "unknown";

  const kindLabel = isSAT ? "official SAT" : "next practice test";
  const scoreLine = latestTotal != null
    ? `Current ${kindLabel} score: ${latestTotal} (R&W ${latest.rw}, Math ${latest.math}).`
    : isSAT
      ? `No official SAT score yet.${supportTotal != null ? ` Latest practice score ${supportTotal} is context only, NOT an official result.` : ""}`
      : `No practice score recorded yet.`;

  const prompt = `You are an expert SAT tutor writing a ${isSAT ? "SAT improvement" : "practice-test preparation"} plan for one student.

${scoreLine}
Target ${kindLabel} score: ${goal.target}.
Days until ${kindLabel}: ${daysLeft}.
Logged mistakes (skill, section, reason, type): ${JSON.stringify(
    mistakes.map((m) => ({ skill: m.skill, section: m.section, why: m.why, type: m.testType || "Practice" }))
  )}

Current mastery per skill, from direct adaptive-practice evidence only (skills not listed have no direct evidence yet, so treat them as unassessed — never assume a number for them): ${JSON.stringify(mastery)}
Adaptly's own priority ranking, most urgent first (this is the source of truth for what matters most right now — your job is to EXPLAIN and EXPAND on this ranking with a narrative plan, not to re-rank or override it): ${JSON.stringify(priorities)}
Most recent adaptive-practice results (up to 20, chronological): ${JSON.stringify(recentPractice)}

${isSAT
  ? "Both SAT and practice mistakes may inform this plan. If there is no official SAT score, say so clearly and treat any practice score as a baseline only."
  : "Prioritize recent practice-test mistakes. Focus on what to do before the next practice test."}
Your "focus" list should draw from the priority ranking above (highest-priority skills first), not invent a different ordering.

Respond with ONLY a JSON object, no markdown or code fences, exactly:
{
  "summary": "2-3 sentences on where they stand and the gap to target",
  "focus": ["priority topic 1", "priority topic 2", "priority topic 3"],
  "week": ["weekly task 1", "task 2", "task 3", "task 4"],
  "practiceSchedule": "one sentence on ${isSAT ? "full practice tests before the SAT" : "timed drills before the practice test"}",
  "nextAction": "one concrete recommended next action"
}`;

  // Model is configurable via env var; defaults to the current flash model.
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  let aiRes;
  try {
    aiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
      }),
    });
  } catch (e) {
    console.error(`[plan] Network error reaching Gemini (model=${model}):`, e?.message || e);
    return json({ error: "The AI service could not be reached." }, 502);
  }

  if (!aiRes.ok) {
    // Read the full upstream error and log it SERVER-SIDE only. Strip the key defensively
    // in case it ever appears in an echoed URL, and never return the raw body to the client.
    const rawDetail = await aiRes.text().catch(() => "");
    const safeDetail = rawDetail.replace(new RegExp(encodeURIComponent(apiKey), "g"), "[REDACTED]").replace(new RegExp(apiKey, "g"), "[REDACTED]");
    console.error(`[plan] Gemini error ${aiRes.status} (model=${model}): ${safeDetail}`);

    // Model retired / not found: make the model name obvious in the server log.
    if (aiRes.status === 404 || /not\s*found|no longer available|is not supported|deprecated|retired/i.test(rawDetail)) {
      console.error(`[plan] MODEL UNAVAILABLE — the configured model "${model}" may be retired or unsupported. Update the GEMINI_MODEL env var to a current model and redeploy.`);
      return json({ error: "The AI model is currently unavailable." }, 502);
    }

    // Rate limit / quota.
    if (aiRes.status === 429) {
      return json({ error: "The AI service is temporarily unavailable. Please try again in a few minutes." }, 429);
    }

    // Any other upstream error: generic user-facing message, details stay in the log.
    return json({ error: "The AI service returned an error." }, 502);
  }

  let data;
  try {
    data = await aiRes.json();
  } catch {
    console.error(`[plan] Gemini returned unreadable data (model=${model})`);
    return json({ error: "The AI service returned unreadable data." }, 502);
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();

  let plan;
  try {
    plan = JSON.parse(clean);
  } catch {
    console.error(`[plan] Gemini did not return valid JSON (model=${model})`);
    return json({ error: "The AI service returned an unexpected format." }, 502);
  }

  // Basic shape guard so the frontend never crashes.
  const safe = {
    summary: String(plan.summary || "Plan generated."),
    focus: Array.isArray(plan.focus) ? plan.focus.slice(0, 5) : [],
    week: Array.isArray(plan.week) ? plan.week.slice(0, 6) : [],
    practiceSchedule: String(plan.practiceSchedule || ""),
    nextAction: String(plan.nextAction || ""),
  };

  return json(safe, 200);
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
