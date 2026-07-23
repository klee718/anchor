# Anchor — Scripture & Doubt, Honestly

A scripture-grounded AI chat companion built for people who are **skeptical, lapsed, or drifting from faith** — not for people who already want devotional comfort. Anchor treats doubt as legitimate, grounds every Bible quote in a local verse database, and short-circuits any crisis message with real help before it ever reaches the AI.

---

## ✨ Features

- **Duolingo-style learning path** — 5 units, 15 structured lessons exploring Thomas's doubt, Psalms of Lament, the Sermon on the Mount, Pauline tensions, and Ecclesiastes
- **Daily Challenge** — a rotating daily verse with a guided opening conversation (+10 XP)
- **Free Conversation mode** — open-ended chat, capped at 3 messages/day for free users
- **XP, levels, and streaks** — gamified progress synced to Cloud Firestore across devices
- **Firebase Auth** — email/password and Google Sign-In
- **Stripe subscriptions** — free tier (Unit 1) and Premium ($5.99/mo) unlock (Units 2–5)
- **Paywall modal** — non-intrusive Stripe Checkout redirect on locked content
- **Haven-inspired UI** — warm parchment light mode, Playfair Display serif headings, Inter body text

---

## 🛡️ Safety Architecture

Three layers of safety run on every chat turn, server-side:

| Layer | Location | What it does |
|---|---|---|
| **Crisis short-circuit** (Layer 1) | `chat.ts` | Deterministic regex. If the message contains self-harm or suicidal language, Gemini is never called. The user immediately receives the 988 Lifeline and Crisis Text Line. |
| **Crisis system prompt** (Layer 2) | `chat.ts` | Instructs Gemini to detect more nuanced distress signals and apply the same response. |
| **Verbatim verse check** (Guardrail B) | `chat.ts` | After every `lookup_verse` tool call, the model's final answer must contain the exact verse text verbatim. If it doesn't, the response is blocked and the user is asked to try again — preventing hallucinated scripture quotes. |
| **Tool-failure guardrail** (Guardrail A) | `chat.ts` | If `lookup_verse` reports the reference is not found, the model is instructed not to proceed with the citation at all. |
| **Rate limiter** | `chat.ts` | Per-IP sliding window: 60 messages per hour. |

---

## 🗂️ Project Structure

```
anchor/
├── chat.ts              # Core AI logic: system prompt, guardrails, tool loop
├── server.ts            # Express API: /api/chat, /api/progress, /api/stripe
├── verses.ts            # Local verse lookup (WEB + KJV from bundled JSON)
├── firebase-admin.ts    # Firebase Admin SDK init + requireAuth middleware
├── progress-store.ts    # Firestore read/write for XP, streaks, lessons
├── stripe-admin.ts      # Stripe checkout session + webhook event handling
├── dry-run-store.ts     # In-memory progress store for DRY_RUN mode
├── dev-mock.ts          # Fake Gemini client (returns stub responses, no API calls)
├── firestore.rules      # Deny-by-default Firestore rules (server uses Admin SDK)
├── api/
│   └── index.ts         # Vercel serverless entry point (wraps the Express app)
├── data/                # Bundled WEB + KJV Bible JSON files
├── evals/
│   ├── dry-run.ts       # 12 offline safety checks (no API key required)
│   ├── run.ts           # Live eval suite against real Gemini API
│   ├── cases.ts         # Eval test case definitions
│   └── mock-gemini.ts   # Mock Gemini client for evals
└── src/
    ├── App.tsx           # Root: auth gate, view router, progress sync
    ├── store.ts          # fetchProgress / completeLessonRemote (calls /api/progress)
    ├── curriculum.ts     # 5 units × 3 lessons: titles, verse refs, opening prompts
    ├── firebase.ts       # Firebase client SDK init + onAuthStateChanged
    └── components/
        ├── AuthScreen.tsx     # Sign up / Log in UI
        ├── Dashboard.tsx      # Home screen: streak, XP bar, daily challenge, course map
        ├── LessonNode.tsx     # Circular path node (completed / available / locked)
        ├── LessonChat.tsx     # Scoped chat view for a lesson or free conversation
        ├── PaywallModal.tsx   # Paywall overlay → Stripe Checkout redirect
        ├── PreviewAuthModal.tsx # Email/password gate shown when VERCEL_HOSTING=true
        └── XPToast.tsx        # Floating +XP animation on lesson completion
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/)
- *(For full auth + payments)* A Firebase project and Stripe account

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```dotenv
# Required for all real AI responses
GEMINI_API_KEY=your_key_here

# Vercel preview gating (optional) — see "Vercel Preview Access" below
VERCEL_HOSTING=
ALLOWED_USERS=

# Firebase (client)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Firebase (server Admin SDK)
FIREBASE_SERVICE_ACCOUNT_JSON=   # paste the full JSON as one line

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
VITE_STRIPE_PUBLISHABLE_KEY=     # only needed for client-side Stripe.js elements
```

### 3. Run in Development

```bash
npm run dev
```

Starts the Express server (with Vite middleware) on `http://localhost:3001`.

### 4. Run Without Any API Keys (Dry Run)

```bash
npm run dev:dry-run
```

Launches the full UI with:
- Real verse lookups from the local database
- Fake Gemini responses (no API key, no cost, no quota)
- Firebase Auth bypassed (auto-signed in as `dry-run-user`)
- In-memory progress store instead of Firestore

---

## 🧪 Evals

### Offline (No API Key Required)

```bash
npm run eval:dry-run
```

Runs 12 deterministic safety checks covering all guardrails:
- Happy path verbatim citation
- Out-of-range verse (Guardrail A)
- Misquote blocking (Guardrail B)
- False-positive check on correct verbatim quotes
- Crisis short-circuit (Layer 1)
- Crisis + scripture mixed message
- Gemini failure → clean `gemini_unavailable` response
- Gemini timeout → clean `gemini_timeout` response
- Infinite tool-loop guard
- Crisis keyword coverage
- False-positive on ordinary doubt language
- Rate limiter per-key cap

**Expected output**: `12/12 PASS`

### Live (Requires `GEMINI_API_KEY`)

```bash
npm run eval
```

Runs the full eval suite against the real Gemini API. Uses quota.

---

## 🏗️ Build & Deploy

### Production Build

```bash
npm run build
```

Outputs:
- `dist/` — Vite-built React frontend (static files)
- `dist/server.cjs` — esbuild-bundled Express server

### Run Production Server

```bash
npm start
```

### Deploy to Google Cloud

**Frontend**: Deploy `dist/` via Firebase Hosting:
```bash
firebase deploy --only hosting
```

**Backend**: Containerize and deploy to Google Cloud Run:
```bash
gcloud run deploy anchor \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Deploy to Vercel

`vercel.json` routes `/api/*` to the serverless function in `api/index.ts` (which wraps the same Express `app` used by `server.ts`) and everything else to the static SPA build. Just connect the repo in the Vercel dashboard or run `vercel --prod`; no separate server process is needed.

### Vercel Preview Access

Preview deployments are public URLs by default, so Anchor supports an optional email/password gate for `/api/*` routes when `VERCEL_HOSTING=true`. Requests are checked against two sources of truth, in order:

1. `ALLOWED_USERS` env var — comma-separated `email:password` pairs (e.g. `ALLOWED_USERS=you@example.com:somepassword,friend@example.com:otherpassword`)
2. A `users.txt` file in the project root — one `email:password` pair per line, `#` for comments

> **Do not commit real credentials in `users.txt`.** Unlike `.env`, `users.txt` is not currently gitignored — add it to `.gitignore` before committing, and prefer `ALLOWED_USERS` set directly in the Vercel project settings for anything beyond local testing.

The `PreviewAuthModal` component shows the login form; a successful check sets the `anchor_preview_auth` cookie the middleware in `server.ts` looks for on subsequent requests.

---

## 💳 Stripe Webhooks (Local Testing)

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhook events during development:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Copy the signing secret it outputs and set it as `STRIPE_WEBHOOK_SECRET` in your `.env`.

---

## 🔐 Firestore Security Rules

All Firestore reads and writes go through the Express backend using the Firebase Admin SDK, which bypasses client-side rules entirely. Direct client access is denied:

```
// firestore.rules
allow read, write: if false;
```

The Admin SDK's service account credentials (`FIREBASE_SERVICE_ACCOUNT_JSON`) are the only path to the database.

---

## 📚 Curriculum Overview

| Unit | Theme | Key Passages |
|---|---|---|
| 🌱 1 — First Questions | What is faith? Does God care about doubt? | John 20:27, Hebrews 11:1, Proverbs 3:5 |
| 😤 2 — Psalms of Lament | Grief, abandonment, prayer without resolution | Psalm 22, Lamentations 3, Psalm 88 |
| ⛰️ 3 — The Sermon on the Mount | The Beatitudes, loving enemies, the Lord's Prayer | Matthew 5–6 |
| ⚖️ 4 — Paul vs. Jesus | Tensions between Paul and the Gospels | Galatians 1, James 2, 1 Corinthians 14 |
| 🔦 5 — Doubt & Faith | Ecclesiastes, Job, half-in/half-out belief | Ecclesiastes 1, Job 3, Mark 9:24 |

---

## 📖 Scripture Licensing

- **World English Bible (WEB)**: Public domain. No restrictions.
- **King James Version (KJV)**: Public domain globally. (Crown copyright applies in the UK but does not affect digital commercial distribution outside the UK.)

---

## ⚠️ Disclaimer

Anchor is not a licensed counseling service, pastoral service, or medical resource. It is an AI-powered study companion. In any situation involving distress or crisis, users are directed to the **988 Suicide & Crisis Lifeline** (call or text 988) and the **Crisis Text Line** (text HOME to 741741).
