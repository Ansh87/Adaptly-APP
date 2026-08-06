// Netlify Function: POST /api/plan
// Generates a SAT or Practice study plan with Google Gemini. The API key stays
// server-side (set GEMINI_API_KEY in Netlify → Environment variables).
//
// Request body:  { planKind, goal:{target,nextDate}, latest, supportingLatest, attempts, mistakes }
// Response body: { summary, focus[], week[], practiceSchedule, nextAction }

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: "GEMINI_API_KEY is not set on the server" }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { planKind = "SAT", goal = {}, latest = null, supportingLatest = null, mistakes = [] } = body;
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

${isSAT
  ? "Both SAT and practice mistakes may inform this plan. If there is no official SAT score, say so clearly and treat any practice score as a baseline only."
  : "Prioritize recent practice-test mistakes. Focus on what to do before the next practice test."}

Respond with ONLY a JSON object, no markdown or code fences, exactly:
{
  "summary": "2-3 sentences on where they stand and the gap to target",
  "focus": ["priority topic 1", "priority topic 2", "priority topic 3"],
  "week": ["weekly task 1", "task 2", "task 3", "task 4"],
  "practiceSchedule": "one sentence on ${isSAT ? "full practice tests before the SAT" : "timed drills before the practice test"}",
  "nextAction": "one concrete recommended next action"
}`;

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let aiRes;
  try {
    aiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
      }),
    });
  } catch (e) {
    return json({ error: "Could not reach Gemini" }, 502);
  }

  if (!aiRes.ok) {
    const detail = await aiRes.text().catch(() => "");
    return json({ error: `Gemini error ${aiRes.status}: ${detail.slice(0, 200)}` }, 502);
  }

  let data;
  try {
    data = await aiRes.json();
  } catch {
    return json({ error: "Gemini returned unreadable data" }, 502);
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();

  let plan;
  try {
    plan = JSON.parse(clean);
  } catch {
    return json({ error: "Gemini did not return valid JSON" }, 502);
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
