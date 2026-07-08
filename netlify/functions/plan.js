// Netlify Function: POST /api/plan
// Generates an SAT study plan with Google Gemini. The API key stays server-side
// (set GEMINI_API_KEY in Netlify → Site settings → Environment variables).
//
// Request body:  { goal, attempts, mistakes }
// Response body: { summary, focus[], today, week[], retake }

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

  const { goal = {}, attempts = [], mistakes = [] } = body;
  const latest = attempts.length ? attempts[attempts.length - 1] : null;
  const latestTotal = latest ? latest.rw + latest.math : goal.current;
  const daysLeft = goal.testDate
    ? Math.max(1, Math.ceil((new Date(goal.testDate) - new Date()) / 86400000))
    : "unknown";

  const prompt = `You are an expert SAT tutor writing a study plan for one student.

Data:
- Target score: ${goal.target}
- Most recent total: ${latestTotal}
- Days until test: ${daysLeft}
- Logged mistakes (skill and reason): ${JSON.stringify(
    mistakes.map((m) => ({ skill: m.skill, section: m.section, why: m.why }))
  )}

Write a concise, specific, encouraging plan. Focus on the student's weakest skills
(the ones appearing most in their mistakes). Respond with ONLY a JSON object, no
markdown, no code fences, in exactly this shape:
{
  "summary": "one or two sentences on where they stand",
  "focus": ["skill 1", "skill 2", "skill 3"],
  "today": "one concrete action for today",
  "week": ["task 1", "task 2", "task 3", "task 4"],
  "retake": "one sentence on whether the test date/goal looks realistic"
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
    today: String(plan.today || ""),
    week: Array.isArray(plan.week) ? plan.week.slice(0, 6) : [],
    retake: String(plan.retake || ""),
  };

  return json(safe, 200);
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
