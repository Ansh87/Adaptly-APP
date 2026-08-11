# SATGene: Track. Adapt. Score.

Every result becomes your next best action.

**Live demo:** https://satgene.netlify.app/ (click "Try Demo Student" to explore instantly. No account, no setup, sample data only.)

SATGene is not a chatbot bolted onto a study app. It's a deterministic agent that
watches a student's real evidence, SAT scores, practice scores, and logged
mistakes, and decides on its own what they should work on next. It then guides
them through that practice, measures the result, and re-decides automatically the
next time it sees new evidence. No student ever has to ask it what to do.

```
MY RESULTS  →  SATGENE AGENT  →  HOME              →  PRACTICE            →  PROGRESS
scores +        analyzes           picks Next Best      adaptive Qs +          measures
mistakes        mastery/weakness   Action + Mission      Socratic tutor         improvement
                                                                                      ↓
                                                                            SATGENE AGENT
                                                                         updates mastery,
                                                                         repeats the loop
```

## Why this counts as an agent, not a chatbot

Everything below runs with **zero AI calls**. It's plain, deterministic, unit-testable
logic in [`src/agent.js`](src/agent.js). That's the point: the agent's judgment doesn't
depend on an API being up, a key being funded, or a model being available.

- **Mastery model.** Every skill starts "Not assessed." A percentage only appears once
  there's direct evidence (an adaptive-practice attempt on that specific skill). A single
  section test score is never used to invent a per-skill number.
- **Priority engine.** A weighted score per skill (mastery weakness, recent mistakes,
  incorrect-answer rate, low confidence, recency, time pressure to the SAT date) ranks
  what matters most right now.
- **Next Best Action.** The top-priority skill becomes a concrete recommendation with a
  data-grounded reason ("2 of your last 2 Math mistakes were in Advanced Math"), a
  question count, a time estimate, and a starting difficulty.
- **Today's Mission.** 2 to 4 bite-sized actions pulled from the same priorities.
- **Auto-reassessment.** Every time new evidence lands (a score, a mistake, a practice
  answer), the agent recomputes mastery and priorities on its own and surfaces what
  changed: "SATGene Noticed" and "Why did my plan change?" No button press required.

AI (Google Gemini) is used in exactly two optional, server-side spots: generating a
richer study plan narrative, and the "Explain differently" tutor step. Both have a
built-in non-AI fallback ("Instant Plan," the local hint/explanation bank) so the app
**never breaks and never requires an API key to function.**

## What's inside

| Area | What it does |
|---|---|
| **Home** | The agent dashboard: Next Best Action, Today's Mission, SATGene Noticed, a mastery snapshot, and the active study plan. |
| **My Results** | Log official SAT scores, practice scores, and mistakes, the evidence the agent reasons over. Section scores are validated to 200 to 800; totals are always derived. |
| **Practice** | Agent-directed adaptive practice (original question bank, difficulty adjusts per answer, 4-level Socratic "Guide Me" hints, AI "Explain differently" with instant fallback), a full-length timed SAT-structure simulation, and links to trusted official/paid SAT resources. |
| **Progress** | Score and section trends, the full mastery model, SAT readiness, and recommended next steps. Answers "am I improving?" |
| **More** | Profile, settings, data export/import/delete, help guide, and a Demo Student mode that runs entirely on local sample data and never touches a real account. |

## Why it matters for underserved students

- **Costs nothing to run.** The Instant fallback means a school with no AI budget still
  gets a working adaptive tutor. The agent's core decisions never depend on a paid API.
- **No paywall.** Practice content is either original (SATGene's own question bank) or
  links straight to free official resources (Bluebook, the Student Question Bank, Khan
  Academy), never a proprietary content lock-in.
- **No barrier to try it.** Demo Student mode gives any student (or judge) the full
  experience with realistic sample data in one click. No account, no setup, nothing saved.
- **Accessible by default.** Keyboard navigation, `aria-live` regions, and no color-only
  signaling throughout.

## Tech stack

React 18 + Vite (frontend), Firebase Auth + Firestore (per-user accounts and data,
isolated by security rules; see `firestore.rules`), Netlify Functions (server-side
Gemini calls so the API key never reaches the browser), deployed on Netlify.

---

## Run it locally

Requires Node 18+.

```bash
npm install
npm run dev      # http://localhost:5173
```

Edit `src/SATGeneAI.jsx` (UI) or `src/agent.js` (agent logic) and it hot-reloads.

```bash
npm run build     # production build, outputs to dist/
npm run preview   # serve the build locally
```

### Firebase (accounts + persistence)

1. Create a project at https://console.firebase.google.com.
2. **Build → Authentication → Sign-in method**: enable **Google** and **Email/Password**.
3. **Build → Firestore Database → Create database**, then paste `firestore.rules` into
   the Rules tab and publish.
4. **Project settings → General → Your apps → Web**: register an app and copy the config.
5. **Authentication → Settings → Authorized domains**: add your deployed domain.
6. Copy `.env.example` to `.env` and fill in the six `VITE_FIREBASE_*` values for local
   dev (the same six go into Netlify's environment variables for deploys).

Without Firebase configured, the app still runs. Real sign-in is disabled with a clear
message, and Demo Student mode works fully offline.

### Gemini (optional: AI plan text + tutor explanations)

The app works completely without this; it only enables the two AI-enhanced touches
described above.

1. Get a key at https://aistudio.google.com/apikey.
2. Add `GEMINI_API_KEY` in Netlify → Site settings → Environment variables (never commit
   it, never put it under `src/`, anything there ships to the browser).
3. To test the serverless functions locally: `npm install -g netlify-cli && netlify dev`.

## Deploy

Connected to Netlify via GitHub, every push to `main` redeploys automatically.
`netlify.toml` sets the build command (`npm run build`), publish dir (`dist`), the
`/api/plan` and `/api/tutor` function redirects, and the SPA fallback.

## Where data lives

Every signed-in user's profile, scores, mistakes, mastery, plans, and mission state are
stored under `users/{uid}` in Firestore, isolated by security rules. Demo Student mode
never reads or writes Firestore. It's local-only, sample data, by design.
