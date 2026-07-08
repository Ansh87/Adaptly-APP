# SATGene AI

A Digital SAT practice **hub, tracker, analytics, and study planner**. It links out to
official and vendor practice — it does not copy their questions.

Built with React + Vite. Right now it's a **pure frontend** (all data lives in React
state), so it deploys as a static site. When you add your Node/Express + SQLite backend,
you can move it to Railway for real persistence.

---

## Run it on your laptop

You need Node 18+ (you already have Node 24).

```bash
npm install      # first time only
npm run dev      # starts http://localhost:5173
```

Open the URL it prints. Edit `src/SATGeneAI.jsx` and the page hot-reloads.

To make a production build:

```bash
npm run build    # outputs to dist/
npm run preview  # serves the built site locally to check it
```

---

## Deploy to Netlify (recommended for now)

Because the app is currently static, Netlify is the simplest path and free.

### Option A — drag & drop (fastest, no Git)
1. Run `npm run build` locally.
2. Go to https://app.netlify.com/drop
3. Drag the `dist` folder onto the page. Done — you get a live URL.

### Option B — connect your Git repo (auto-deploys on every push)
1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo.
3. Netlify reads `netlify.toml` and fills these in automatically:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click **Deploy**. Every `git push` now redeploys.

The `netlify.toml` also adds an SPA redirect so page refreshes don't 404.

---

## Deploy to Railway (use when you add a backend)

Railway is great once SATGene has a server (Express + SQLite for the tracker,
mistake log, and a Gemini-powered planner). Two ways:

### Static-only on Railway (works today, but Netlify is easier for this)
1. Push the repo to GitHub.
2. Railway → **New Project → Deploy from GitHub repo**.
3. Add a start step that serves `dist`. Simplest: add `serve` and a start script:
   ```bash
   npm install --save-dev serve
   ```
   then in package.json scripts add:  `"start": "serve -s dist -l $PORT"`
4. Railway sets `$PORT` automatically. Build command `npm run build`, start `npm start`.

### Full-stack on Railway (the real Phase 1 target)
When you port your Node/Express + SQLite backend:
- Serve the built React `dist/` as static files from Express.
- Put your API routes under `/api/*` (e.g. `/api/plan`, `/api/attempts`).
- Keep your Gemini key in Railway **environment variables**, never in the frontend.
- SQLite via `node:sqlite` works, but note Railway's filesystem is ephemeral on
  redeploy — attach a **Railway Volume** so your SQLite file survives deploys.

---

## Enabling the AI planner (Gemini)

The "Generate AI plan" button calls `POST /api/plan`, which Netlify routes to the
serverless function at `netlify/functions/plan.js`. That function calls Google Gemini
**server-side**, so your key is never exposed to the browser. If the function is missing
or errors, the button falls back to the built-in rule-based plan.

### One-time setup

1. Get a Gemini API key from https://aistudio.google.com/apikey (free tier available).
2. In Netlify: **Site settings → Environment variables → Add a variable**
   - Key: `GEMINI_API_KEY`
   - Value: your key
3. Redeploy the site (Netlify → Deploys → Trigger deploy). The key is picked up at build/runtime.

That's it — "Generate AI plan" now returns a real Gemini-written plan.

### Testing locally

Netlify Functions don't run under `npm run dev` (that's just Vite). To test the function
locally, use the Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev            # serves the site AND the function together
```

Set the key for local runs by creating a `.env` file (already gitignored):

```
GEMINI_API_KEY=your_key_here
```

Never commit `.env`, and never put the key in any file under `src/` — anything in `src/`
ships to the browser.

---

## Where data lives

Today: in-memory React state (resets on refresh). This is intentional for a static
preview. Your backend swap replaces it with SQLite tables:
- `attempts` (test tracker)
- `mistakes` (mistake log)
- `goal` (target score, test date)

Ask and I'll generate the SQLite schema + Express routes next.
