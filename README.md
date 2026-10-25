# PaisaWise

**Track every paisa wisely.**

PaisaWise is a personal expense tracker built as an installable web app (PWA) that feels native on mobile and works as a full dashboard on desktop. It handles daily spending, upcoming/due payments, budgets, calendar views, and reports — with email authentication, MongoDB persistence, and an offline-first sync layer.

> Repo: [github.com/gau-rav/DailyExpenses](https://github.com/gau-rav/DailyExpenses)

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [API reference](#api-reference)
- [MongoDB data model](#mongodb-data-model)
- [PWA & mobile behaviour](#pwa--mobile-behaviour)
- [Testing & linting](#testing--linting)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Related docs](#related-docs)

---

## Features

### Expenses
- Add / edit / delete expenses with title, amount, category, payment method, date, due date, and notes.
- **4 statuses:** `Paid`, `Upcoming`, `Overdue`, `Due Today`.
- **Recurring** flag and **split expenses** (split one bill across people with named payments).
- Full-text search across title/category/payment, plus category and status filters and sorting by date, amount, or category.
- Multi-select with bulk delete, soft-delete to **Trash**, restore, and permanent purge.
- One-click **CSV export**.

### Email auto-capture
- **Connect Gmail** with OAuth: scheduled sync reads bank and card alerts, reuses the parser, and never stores raw email bodies.
- **Review inbox** collects parsed transactions; edit, add, or ignore each one. The nav badge shows how many need review.
- Optional **Add automatically** mode: high-confidence INR debits are added as `Paid`, while foreign-currency or low-confidence messages wait for review.
- Deduplicated by Gmail message ID; raw email bodies are parsed in memory and never stored.
- Recognises debit alerts from major Indian banks and cards (HDFC, ICICI, SBI, Axis, Kotak, IDFC FIRST, and more); OTP, promotional, credited, refunded, reversed, and failed emails are ignored.
- Gmail refresh tokens are encrypted with AES-256-GCM. See [`GOOGLE_GMAIL_OAUTH_SETUP.md`](./GOOGLE_GMAIL_OAUTH_SETUP.md).

### Budgets & reports
- Daily, weekly, and monthly budget limits, saved to your account (with migration from older localStorage-only budgets).
- Budget health vs. actual spending on the dashboard and budget pages.
- Category breakdown charts: grouped **bar chart** on desktop, **donut chart** on mobile.
- Spending trend chart across the current cycle.

### Due payments
- "Due today" dashboard section and a dedicated Due page with a count badge in navigation.
- Mark as paid, or postpone until tomorrow, straight from the delete/confirm sheet.
- Upcoming payments for the next 7 days.

### Calendar
- Month navigation with per-day spending and budget context.
- Add an expense for a specific day directly from the calendar.
- Day detail opens in a bottom sheet on mobile.

### Custom monthly cycle
- Default cycle = calendar month, or set your own cycle start day (e.g. salary-day cycle) in Settings.
- All monthly totals, budgets, and reports follow your cycle.
- Cycle start must be from the first of last month onward (validated on the server).

### Currency (display-only)
- Switch between **INR, USD, EUR, GBP** in Settings.
- Amounts are always **stored and synced in INR**; conversion happens at render time with fixed rates, so changing currency never rewrites your data.
- Preference is saved to your account and mirrored to the device.

### Accounts & theming
- Email/password registration and sign-in, password change/reset, session-based auth (7-day cookie).
- Light and dark theme with `theme-color` meta kept in sync.
- Google OAuth exists in the codebase but is **temporarily disabled**.

### Mobile / PWA
- Installable (manifest + service worker), offline app-shell fallback.
- Bottom tab bar with a **More** menu (Trash, Settings), floating **+** FAB, sticky blurred top bar, bottom sheets, bottom toasts, safe-area insets, 44px touch targets, and 16px inputs (stops iOS auto-zoom).
- Back-navigation exit confirmation on mobile.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, React Router 7, lucide-react icons |
| Charts | Recharts 3 |
| Build | Vite 8, `@vitejs/plugin-react` |
| Backend | Express 5 (Node), `serverless-http` for Netlify |
| Database | MongoDB (official `mongodb` driver) |
| Auth | Session cookie + `crypto.scrypt` password hashing |
| Lint | ESLint 10 (`eslint.config.js`, flat config) |
| Styling | Plain CSS, one stylesheet per concern under `src/styles/` |

---

## Getting started

### Prerequisites
- Node.js **22+** (uses global `fetch`, modern ESM)
- A MongoDB instance — local `mongod` or a free MongoDB Atlas cluster
- npm

### 1. Install

```bash
git clone https://github.com/gau-rav/DailyExpenses.git
cd DailyExpenses
npm install
```

### 2. Configure the environment

Copy an example env file and edit it:

```bash
cp .env.example .env.local
```

Minimum you need:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=penny_expenses
```

> The server loads `.env.local` in development and `.env.production` when `NODE_ENV=production`, then falls back to `.env`. `.env*` files are gitignored — never commit real secrets.

### 3. Run

```bash
npm run dev:full
```

This starts both processes:

| Process | URL | Purpose |
| --- | --- | --- |
| API (`server/index.js`) | http://localhost:8787 | Express + MongoDB |
| Vite dev server | http://localhost:5173 | Frontend with HMR |

Open **http://localhost:5173** and register an account — the app is gated behind sign-in.

Run them separately if you prefer:

```bash
npm run server   # terminal 1 — API (no hot reload; restart after editing server/*)
npm run dev      # terminal 2 — Vite
```

Vite proxies `/api` and `/health` to `:8787`, so the browser only ever talks to `:5173` in dev.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run server` | Start the Express API on `:8787` |
| `npm run dev:full` | Start API + Vite together (`concurrently`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint over the repo (`dist/` ignored) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with V8 coverage (HTML + text) |
| `npm run gmail:sync` | Run one Gmail sync pass (cron/Render job) |

---

## Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `MONGODB_URI` | — | **Required.** Mongo connection string |
| `MONGODB_DB_NAME` | `penny_expenses` | Database name |
| `AUTH_PORT` / `PORT` | `8787` | API port |
| `APP_URL` | — | Frontend origin (CORS/redirects, deploy) |
| `NODE_ENV` | `development` | `production` enables secure cookies + reads `.env.production` |
| `AUTH_DUMMY_EMAIL` / `AUTH_DUMMY_PASSWORD` | — | Optional: migrate a legacy demo account to password auth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | — | Google sign-in OAuth (button hidden when unset) |
| `GOOGLE_GMAIL_CLIENT_ID` / `GOOGLE_GMAIL_CLIENT_SECRET` | — | **Required for Gmail OAuth.** Dedicated client (or reuse the same client values) |
| `GOOGLE_GMAIL_REDIRECT_URI` | `http://localhost:8787/api/integrations/gmail/callback` | Gmail OAuth callback; must match Google Cloud exactly |
| `TOKEN_ENCRYPTION_KEY` | — | **Required for Gmail OAuth.** Base64-encoded 32-byte AES key |
| `GMAIL_SYNC_SECRET` | — | Bearer secret for `POST /api/internal/gmail/sync` |
| `GMAIL_INITIAL_LOOKBACK_DAYS` | `7` | First-sync lookback window (1–30 days) |
| `GMAIL_QUERY` | Bank-alert query | Optional Gmail search query override |

See `.env.example` for the full set of supported variables.

---

## Project structure

```
paisa_wise/
├── index.html                  # PWA meta, manifest link, #root
├── vite.config.js              # React plugin + /api,/health proxy → :8787
├── eslint.config.js
├── public/
│   ├── manifest.webmanifest    # Installable app manifest
│   ├── sw.js                   # Service worker (offline shell)
│   └── icons/ logo.jpg ...
├── src/
│   ├── main.jsx                # React root + BrowserRouter
│   ├── App.jsx                 # Auth gate, state, routing, layout, global modals
│   ├── routes.js               # Path ↔ page maps, nav definitions, labels
│   ├── api/
│   │   ├── expensesApi.js      # Fetch/cache/queue/sync layer
│   │   ├── gmailApi.js         # Gmail sync/disconnect calls
│   │   └── ingestApi.js        # Email capture inbox/settings calls
│   ├── pages/
│   │   ├── AuthPage.jsx        # Sign in / register / password flows
│   │   ├── DashboardPage.jsx   # Overview KPIs, trend, categories, insights
│   │   ├── ExpensesPage.jsx    # Search/filter/sort/bulk/CSV table
│   │   ├── InboxPage.jsx       # Review captured bank emails
│   │   ├── DuePage.jsx         # Due today, mark paid, postpone
│   │   ├── CalendarPage.jsx    # Month grid + day details
│   │   ├── BudgetsPage.jsx     # Budget limits + reports
│   │   ├── TrashPage.jsx       # Restore / purge
│   │   └── SettingsPage.jsx    # Theme, currency, cycle, Gmail, password, install
│   ├── components/
│   │   ├── MobileBottomNav.jsx # 6-tab bottom nav with More menu
│   │   ├── PageComponents.jsx  # Shared cards/charts (bar + donut)
│   │   ├── SpendingTrendChart.jsx
│   │   ├── PwaInstallButton.jsx
│   │   └── Modal/              # ExpenseModal, DeleteModal (bottom sheets)
│   ├── hooks/
│   │   └── useIsMobile.js      # Viewport switch (donut vs bars, etc.)
│   ├── utils/
│   │   ├── appData.js          # Categories, seed data, date/cycle helpers
│   │   └── currency.js         # Display-only INR → selected currency
│   ├── styles/                 # 20+ focused CSS modules (responsive.css last)
│   └── index.css               # Import order matters — see below
├── server/
│   ├── index.js                # Express app: auth, budgets, expenses, settings, Gmail
│   ├── db.js                   # MongoDB connection, collections, queries, Gmail accounts
│   ├── gmailAuth.js            # Gmail OAuth client, consent URL, token refresh/revoke
│   ├── gmailCron.js            # Standalone sync job for cron/Render
│   ├── gmailExtract.js         # Gmail payload body/header extraction
│   ├── gmailSync.js            # Gmail list/fetch sync pipeline
│   ├── gmailTokenCrypto.js     # AES-256-GCM refresh-token encryption
│   ├── ingest.js               # Gmail ingest flow, accept/ignore actions
│   ├── ingestParser.js         # Pure bank email parser (amount/date/merchant/category)
│   ├── ingestParser.test.js    # Parser unit tests
│   ├── gmail*.test.js          # Gmail crypto, extraction, and query tests
├── netlify/functions/api.mjs   # serverless-http wrapper for Netlify
├── render.yaml                 # Render deploy config
└── netlify.toml                # Netlify build + redirects
```

---

## How it works

### Frontend routing & auth gate
`src/routes.js` maps paths to pages: `/` (Overview), `/expenses`, `/inbox`, `/due`, `/calendar`, `/budgets`, `/trash`, `/settings`. Anything else redirects to `/`.

`App.jsx` is the single stateful shell:
1. On mount it calls `GET /api/auth/me`. While the response is pending it shows a loading screen; if unauthenticated it renders `AuthPage` (tabbed **Sign in / Register / Reset password**) instead of the app.
2. Once authenticated it loads budgets, the monthly cycle, user settings (currency), and email-capture status for that account.
3. It renders the layout (sidebar + top bar on desktop, bottom nav + FAB on mobile) and the routed page inside `.content`.
4. Global modals (expense form, delete/confirm sheet) and the toast live at the shell level so every page can open them.

Pages are **lazy-loaded** (`React.lazy` + `Suspense`) for code splitting.

### Data flow & offline sync
The expenses API layer (`src/api/expensesApi.js`) sits between the UI and the server:

- **Reads:** `fetchExpenses()` pulls from `/api/expenses` and caches to `localStorage` (`penny-expenses`). If the network fails it serves the cache and reports the source as `cache`.
- **Writes:** add/update/delete/restore/purge POST to `/api/expenses` with an `action` field. On failure the payload is pushed onto an **offline queue** (`penny-expense-sync-queue`).
- **Sync:** the queue is replayed on app load, on the browser `online` event, or when you click the status pill in the header. Unqueued failures stay queued until the next attempt.
- **Status pill:** shows `Synced` / `Connecting…` / `Offline`. Clicking it while offline forces a sync.

Optimistic UI: the list updates immediately, then reconciles with the server response.

**First run:** with no cache and no saved data, the app seeds a handful of demo expenses (`seedExpenses` in `appData.js`) so the dashboard, charts, and due list aren't empty. Your own data replaces them as soon as you add/edit anything.

Trash is soft-delete — expenses get a `deletedAt` timestamp and are filtered out of normal reads; `GET /api/expenses?includeDeleted=true` returns them for the Trash page.

### Auth & sessions
- Register/login create a session and set an **httpOnly** `penny_session` cookie (7 days, `sameSite=lax`, `secure` in production).
- The server stores only a **hash** of the token (`token_hash`, unique index); cookies never leave the browser unhashed.
- Passwords are `scrypt`-hashed as `scrypt:<salt>:<hex>` and compared with `timingSafeEqual`.
- Sessions expire via a TTL index and are pruned hourly.
- Password change/reset re-hash the password, invalidate all existing sessions, and issue a fresh one.

### Dates, cycles, currency
- All dates are computed in the **Asia/Kolkata** timezone and stored as `YYYY-MM-DD` strings (`indiaDate()` in `appData.js`).
- `getMonthlyCycleRange(cycleStartDate)` resolves the active cycle: without a custom start day it's the calendar month; with one, it walks back to the most recent cycle containing today.
- Currency conversion (`currency.js`) is **render-time only**: `fromINR()` / `toINR()` use fixed rates, `formatMoney()` formats via `Intl.NumberFormat`. Input fields convert back to INR before saving.

---

## API reference

All routes accept JSON (and legacy `text/plain` JSON). Auth is via the `penny_session` cookie. Errors return `{ ok: false, error }`.

### Auth
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create account (`email`, `password`, `verifyPassword`, `firstName`, `lastName`) → sets session |
| `POST` | `/api/auth/login` | Sign in (`email`, `password`) → sets session |
| `POST` | `/api/auth/logout` | Destroy session, clear cookie |
| `GET`  | `/api/auth/me` | Current user, or `{ authenticated: false }` |
| `POST` | `/api/auth/password/change` | Change password while signed in (requires `currentPassword`) |
| `POST` | `/api/auth/password/reset` | Reset by email + current password (legacy path) |

### Expenses
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/expenses` | List active expenses; add `?includeDeleted=true` for trash |
| `POST` | `/api/expenses` | `{ action, expense?, id? }` where `action` is `add` \| `update` \| `delete` \| `restore` \| `purge` |

### Budgets & settings
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/budgets` | Read daily/weekly/monthly limits |
| `PUT` | `/api/budgets` | Save limits (validated: 0 … 1e9) |
| `GET` | `/api/current-monthly-cycle` | Read custom cycle start date (aliases: `/current-monthly-cycle`, `/api/settings/monthly-cycle`, …) |
| `POST` | `/api/current-monthly-cycle` | Save cycle start date (`null` restores calendar month) |
| `GET` | `/api/user-settings` | Read display currency |
| `PUT` | `/api/user-settings` | Save display currency |
| `GET` | `/health` | `{ ok: true }` liveness check |

### Email integrations
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/integrations/gmail/connect` | Start Gmail OAuth with incremental `gmail.readonly` consent |
| `GET` | `/api/integrations/gmail/callback` | OAuth callback; stores the encrypted refresh token |
| `GET` | `/api/integrations/gmail/status` | Gmail connection status and last sync |
| `POST` | `/api/integrations/gmail/sync` | Sync the signed-in user's Gmail now |
| `DELETE` | `/api/integrations/gmail` | Revoke Google access and delete stored credentials |
| `POST` | `/api/internal/gmail/sync` | Cron endpoint protected by `GMAIL_SYNC_SECRET` |
| `GET` | `/api/integrations/status` | Capture settings, Gmail state, and pending review count |
| `GET` | `/api/integrations/messages?status=pending` | List captured emails (`pending` \| `added` \| `ignored` \| `all`) |
| `POST` | `/api/integrations/messages/:id` | `{ action: 'accept', expense? }` or `{ action: 'ignore' }` |
| `PUT` | `/api/integrations/settings` | Save `{ enabled?, autoAdd? }` |

Unknown `/api/*` requests return a JSON 404.

---

## MongoDB data model

Database: `MONGODB_DB_NAME` (default `penny_expenses`), connected in `server/db.js`.

| Collection | Key fields | Indexes |
| --- | --- | --- |
| `users` | `id`, `email`, `first_name`, `last_name`, `password_hash`, `google_sub?` | unique `email`; unique partial `google_sub` |
| `sessions` | `token_hash`, `user_id`, `expires_at` | unique `token_hash`; TTL on `expires_at` |
| `expenses` | `user_id`, `id`, `title`, `amount`, `category`, `payment`, `date`, `dueDate`, `status`, `recurring`, `splitExpense`, `deletedAt?` | unique (`user_id`,`id`); (`user_id`,`deletedAt`) |
| `budgets` | `user_id`, `daily`, `weekly`, `monthly` | unique `user_id` |
| `user_settings` | `user_id`, `currency`, `monthly_cycle_start`, `ingest_enabled`, `ingest_auto_add` | unique `user_id` |
| `ingest_messages` | `id`, `user_id`, `external_id` (Gmail message ID), `sender`, `subject`, `received_at`, `parsed` (title/amount/category/payment/date), `confidence`, `warnings`, `bank`, `status` (`pending`\|`added`\|`ignored`), `expense_id?` | unique (`user_id`,`external_id`); (`user_id`,`status`,`created_at`) |
| `gmail_accounts` | `user_id`, `google_sub`, `gmail_email`, `refresh_token_enc`, `scopes`, `status` (`connected`\|`needs_reauth`\|`error`), `last_internal_date`, `last_sync_at`, `last_error`, `sync_lock_until?` | unique `user_id`; unique partial `google_sub`; (`status`,`last_sync_at`) |

**Categories:** Food, Grocery, Transport, Bills, Shopping, Entertainment, Health, Rent, Education, Other.
**Default budgets (INR):** daily 1,500 · weekly 6,500 · monthly 24,000.

---

## PWA & mobile behaviour

- **Manifest** (`public/manifest.webmanifest`): `display: standalone`, 192/512 icons, cream theme colour.
- **Service worker** (`public/sw.js`): caches the app shell (`/`) on install; navigations try the network first and fall back to the cached shell when offline.
- **Install flow:** `beforeinstallprompt` is captured and surfaced as a banner/button on the dashboard and in Settings; installed state is detected via `display-mode: standalone`.
- **Breakpoints:** `720px` (mobile layout) and `380px` (small phones).
- **Mobile shell:** bottom nav = Home · Expenses · Due · Calendar · Budgets · More → (Email inbox, Trash, Settings); floating **+** FAB opens the expense sheet; sticky blurred top bar; content padding reserves space for the nav + safe area; toasts appear bottom-centre; filter/calendar/delete pickers open as bottom sheets with a backdrop.
- **Desktop shell:** fixed sidebar with counts, breadcrumb top bar, sync status pill, notifications, avatar menu; independently scrolling content pane.
- **Theming:** `data-theme` on `<html>` persisted to `penny-theme`; `<meta name="theme-color">` switches `#fdf8f0` / `#0f172a`.

CSS import order in `src/index.css` matters — `responsive.css` loads near the end so mobile overrides win ties.

---

## Testing & linting

Unit tests use **Vitest** (jsdom environment) via the `test` block in `vite.config.js`:

```bash
npm test              # run the suite once
npm run test:watch    # watch mode
npm run test:coverage # V8 coverage report for src/utils and src/api
npm run lint          # ESLint across src/ and server/
npm run build         # production build must succeed
```

Tests live next to the code as `*.test.js`; shared setup is in `src/test/setup.js`. The suite covers the pure utils (`src/utils/`), the data/sync layer (`src/api/expensesApi.js`), the email parser (`server/ingestParser.test.js`), and the Gmail token, extraction, and query helpers.

---

## Deployment

### Render (single Node service)
`render.yaml` is configured:

- **Build:** `npm install --include=dev && npm run build`
- **Start:** `node server/index.js`
- **Cron:** `dailyexpenses-gmail-sync` runs `node server/gmailCron.js` every 15 minutes
- **Env:** `NODE_ENV=production`, `APP_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`, plus `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`, `GOOGLE_GMAIL_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, and `GMAIL_SYNC_SECRET` for Gmail OAuth

In production the Express server serves the built `dist/` folder directly with an SPA fallback to `index.html`, so one process serves both the API and the UI. Configure the same Gmail environment variables on the cron service; the sync job connects to MongoDB directly.

### Netlify (static + serverless function)
`netlify.toml`:

- **Build:** `npm install --include=dev && npm run build`, publish `dist/`
- `/api/*` and `/health` → `/.netlify/functions/api/*` (the Express app wrapped by `serverless-http` in `netlify/functions/api.mjs`)
- `/*` → `/index.html` for client-side routing

Set `MONGODB_URI` (and friends) in the Netlify environment.

### Manual
```bash
npm run build
NODE_ENV=production npm run server   # serves dist/ on :8787
```

---

## Security notes

- Passwords hashed with **scrypt** (16-byte random salt, 64-byte key), verified in constant time.
- Session tokens are hashed at rest; cookies are **httpOnly**, `SameSite=Lax`, `Secure` in production.
- Request bodies capped at **32kb**; input validation on email format, password length (8–128), name length, budget bounds, and cycle dates.
- All expense/settings routes resolve the user from the session cookie — no user-supplied IDs are trusted.
- Gmail refresh tokens are encrypted at rest with AES-256-GCM using `TOKEN_ENCRYPTION_KEY`; access tokens are held only in memory. Disconnecting revokes the token at Google. Raw email bodies are never persisted.
- Gmail OAuth uses `gmail.readonly`, `state`, PKCE, and HTTP-only cookies. The internal sync endpoint requires a timing-safe bearer secret.
- `.env` files are gitignored.

---

## Related docs

| File | Covers |
| --- | --- |
| [`AUTH_SETUP.md`](./AUTH_SETUP.md) | Authentication setup details |
| [`GOOGLE_GMAIL_OAUTH_SETUP.md`](./GOOGLE_GMAIL_OAUTH_SETUP.md) | Gmail OAuth setup, Google verification, cron, and operations |

---

## License

See [`package.json`](./package.json) for repository and license details.
