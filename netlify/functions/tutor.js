// Netlify Function: POST /api/tutor
// Powers the "Explain" side of the Socratic tutor in adaptive practice. The
// four Socratic hint levels ("Guide Me") are answered entirely from the local
// question bank (src/questionBank.js) — this function is
// only reached when the student asks for a fuller, personalized explanation.
//
// Mirrors netlify/functions/plan.js's security pattern exactly: the Gemini API
// key stays server-side (GEMINI_API_KEY env var), is never sent to the browser
// or logged, and upstream errors are redacted before being summarized for the
// client. On any failure the frontend falls back to the question's own
// hand-written "explanation" field — this endpoint is an enhancement, not a
// dependency.
//
// Request body:  { section, skill, difficulty, prompt, choices, correctIndex, studentAnswerIndex }
// Response body: { explanation }
//   On upstream failure the frontend falls back to the bank's own explanation text.
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
  // Demo Student mode (see the matching note in plan.js: client-supplied flag,
  // re-lock before a public launch).
  let authResult = null;
  let authError = null;
  try {
    authResult = await verifyRequestAuth(req);
  } catch (e) {
    authError = e;
    console.error("[tutor] Auth verification unavailable:", e?.message || e);
  }
  const isDemo = body?.demo === true;
  if (!authResult && !isDemo) {
    if (authError) return json({ error: "Sign-in verification is not configured on the server." }, 500);
    return json({ error: "Sign in required." }, 401);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Never log the key; this branch means it's simply absent.
    console.error("[tutor] GEMINI_API_KEY is not set on the server");
    return json({ error: "AI tutor is not configured." }, 500);
  }

  const {
    section = "",
    skill = "",
    difficulty = "medium",
    prompt: questionPrompt = "",
    choices = [],
    correctIndex = null,
    studentAnswerIndex = null,
  } = body;

  if (!questionPrompt || !Array.isArray(choices) || choices.length !== 4 || correctIndex == null) {
    return json({ error: "Missing question data." }, 400);
  }

  const correctText = choices[correctIndex];
  const studentText = studentAnswerIndex != null ? choices[studentAnswerIndex] : null;
  const gotItRight = studentAnswerIndex === correctIndex;

  const prompt = `You are a warm, encouraging, patient SAT tutor helping one student understand a practice question they just answered.

Section: ${section}
Skill: ${skill}
Difficulty: ${difficulty}
Question: ${questionPrompt}
Answer choices: ${choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`).join("  ")}
Correct answer: ${String.fromCharCode(65 + correctIndex)}) ${correctText}
${studentText != null ? `Student's answer: ${String.fromCharCode(65 + studentAnswerIndex)}) ${studentText}${gotItRight ? " (correct)" : " (incorrect)"}` : "Student has not answered yet."}

Write a short (3-5 sentence), plain-language explanation of why the correct answer is right.
${!gotItRight && studentText != null ? "Also briefly explain why the student's specific choice is a common but incorrect reasoning path, without being discouraging." : ""}
Do not use markdown formatting, headers, or bullet lists — plain sentences only. Speak directly to the student ("you").

Respond with ONLY a JSON object, no markdown or code fences, exactly:
{ "explanation": "your explanation here" }`;

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
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
    });
  } catch (e) {
    console.error(`[tutor] Network error reaching Gemini (model=${model}):`, e?.message || e);
    return json({ error: "The AI tutor could not be reached." }, 502);
  }

  if (!aiRes.ok) {
    const rawDetail = await aiRes.text().catch(() => "");
    const safeDetail = rawDetail
      .replace(new RegExp(encodeURIComponent(apiKey), "g"), "[REDACTED]")
      .replace(new RegExp(apiKey, "g"), "[REDACTED]");
    console.error(`[tutor] Gemini error ${aiRes.status} (model=${model}): ${safeDetail}`);

    if (aiRes.status === 404 || /not\s*found|no longer available|is not supported|deprecated|retired/i.test(rawDetail)) {
      console.error(`[tutor] MODEL UNAVAILABLE — the configured model "${model}" may be retired or unsupported. Update the GEMINI_MODEL env var to a current model and redeploy.`);
      return json({ error: "The AI tutor is currently unavailable." }, 502);
    }
    if (aiRes.status === 429) {
      return json({ error: "The AI tutor is temporarily unavailable. Please try again shortly." }, 429);
    }
    return json({ error: "The AI tutor returned an error." }, 502);
  }

  let data;
  try {
    data = await aiRes.json();
  } catch {
    console.error(`[tutor] Gemini returned unreadable data (model=${model})`);
    return json({ error: "The AI tutor returned unreadable data." }, 502);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    console.error(`[tutor] Gemini did not return valid JSON (model=${model})`);
    return json({ error: "The AI tutor returned an unexpected format." }, 502);
  }

  return json({ explanation: String(parsed.explanation || "").slice(0, 2000) }, 200);
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
