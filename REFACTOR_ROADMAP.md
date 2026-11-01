# PaisaWise Architecture Refactor Roadmap

This roadmap records the planned feature-slice and service-layer restructuring. The migration is incremental: preserve current behavior, keep compatibility paths where useful, and verify each phase before removing legacy code.

## Status summary

- Phase 1 — Architecture audit: complete.
- Phase 2 — Feature-slice structure: complete; feature pages and service boundaries are in their owning slices, with legacy re-export paths retained for compatibility.
- Phase 3 — Frontend service layer: complete; expense, budget, settings, and inbox services use feature-owned modules.
- Phase 4 — Feature hooks/state: complete; feature data loading, CRUD, and settings state now live in feature hooks.
- Phase 5 — Domain rules/validation: complete; expense, budget, monthly-cycle, due-date, and ingest rules have explicit domain ownership.
- Phase 6 — Auth and account settings: complete; password handling and account settings have domain/service/controller boundaries.
- Phase 7 — Backend layers: complete for auth, account settings, expenses, and inbox APIs; domain repository facades sit over the shared Mongo adapter.
- Phase 8 — Feature migration: complete; feature pages use slices, while compatibility exports remain for existing test imports.
- Phase 9 — Documentation and non-test validation: complete; README and ownership notes are updated, lint/build pass.
- Post-refactor unit test pass: complete; all 208 tests across 22 files pass.

## Phase 1: Audit the current architecture — complete

**Purpose:** identify the highest-cost boundaries before changing code.

**Findings:**
- `src/App.jsx` owns app shell concerns alongside authentication, expenses, budgets, settings, offline state, and several feature workflows.
- At the start of the refactor, `src/api/expensesApi.js` combined HTTP requests, normalization, browser cache, and queued offline writes; Phase 3 has since separated those responsibilities.
- `server/db.js` groups database operations from multiple domains.
- Feature pages and some API wrappers already exist, so the migration can build on them rather than rewrite the product.

**Exit criteria:** current boundaries and the incremental migration order are documented.

## Phase 2: Establish feature-slice structure — complete

**Goal:** make domain ownership visible without moving every existing module at once.

**Frontend destination:**

```text
src/
  app/                       # app bootstrap, providers, route composition, shell
  features/
    auth/
    dashboard/
    expenses/                 # includes trash and transaction workflows
    budgets/
    inbox/                    # Gmail-ingest review workflow
    settings/
    calendar/
    due/                      # due payments and bills
  shared/
    components/
    hooks/
    utils/
  services/                   # cross-feature infrastructure only
    api/
    storage/
    sync/
```

**Completed:** App routes now lazy-load feature-owned pages for auth, dashboard, expenses/trash, budgets, inbox, settings, calendar, due, and bills. Feature services/hooks are colocated with their domains. Thin re-exports remain under `src/pages` and `src/api` to preserve compatibility for older imports and tests. Legal information remains app-level. Shared UI and utilities remain in their current shared locations.

**Rules:**
- Feature-specific UI, hooks, selectors, tests, and service calls belong with the feature.
- `shared/` is for code genuinely used across features; do not make it a generic dumping ground.
- `services/` is for cross-feature infrastructure, not domain business rules.
- Do not relocate files without updating their import paths and verifying the feature tests.

**Exit criteria:** feature ownership is clear, routes use feature pages, and legacy compatibility imports remain only as thin re-exports until the post-roadmap test pass.

## Phase 3: Extract the frontend service layer — complete (tests deferred)

**Goal:** keep transport, persistence, normalization, and synchronization details out of page components and the app shell.

**Completed:**
- Expense API, cache, and queued offline writes live in `src/features/expenses/services/expensesService.js`; normalization lives in `src/features/expenses/domain/expenseNormalization.js`; `src/api/expensesApi.js` is a compatibility re-export.
- Shared response parsing and error handling live in `src/services/api/requestJson.js`.
- Budget persistence and legacy-cache migration live in `src/features/budgets/services/budgetService.js`.
- Currency and monthly-cycle account persistence live in `src/features/settings/services/settingsService.js`.
- Gmail and ingest API operations live under `src/features/inbox/services/`; old `src/api` entry points remain compatible.
- App and feature pages now call feature services rather than implementing these request workflows inline.

**Exit criteria:** service boundaries and compatibility paths are in place. Unit tests for these boundaries are intentionally deferred until after Phase 9, per the requested sequence.

## Phase 4: Move feature state into hooks and containers — complete

**Goal:** reduce `App.jsx` to bootstrap, shared shell, and route composition.

**Completed:** `useAuth`, `useExpenses`, `useBudgets`, `useMonthlyCycle`, `useCurrencyPreference`, and `useIngestStatus` own auth bootstrap/logout, expense loading/cache and CRUD/trash/export/restore actions, budget state, cycle state, currency preference, and Gmail ingest status. Feature pages are colocated under domain folders. App-global theme, toast, install prompt, profile, and route composition remain in `App.jsx` by design; these are cross-feature shell concerns rather than feature state.

**Exit criteria:** feature state/actions are owned by the relevant feature; route components do not depend on unrelated feature state.

## Phase 5: Isolate domain rules and validation

**Goal:** centralize rules that must behave consistently across frontend and backend.

**Completed:** expense normalization lives in `src/features/expenses/domain/expenseNormalization.js`; shared India-date and date-math helpers live in `src/shared/utils/`; budget pace/threshold/progress rules, monthly-cycle calculations, and bill grouping live in their owning feature domains. Server auth and settings validation live under `server/domain/`, and Gmail transaction parsing remains a pure domain module under `server/domain/ingestParser.js`. Compatibility exports remain where older imports need them.

**Post-refactor checks:** added and ran unit coverage for expense date/amount/split normalization; budget thresholds, zero-budget, and pace behavior; month-end cycle rules; overdue/today/soon bill grouping; and auth/settings validation. Existing tests also cover the Gmail parser and ingest workflows, API wrappers, UI flows, and related services. All 208 tests across 22 files pass.

**Exit criteria:** domain rules have explicit inputs/outputs; UI components do not define persistence-critical validation; test cases are listed for the post-roadmap test pass.

## Phase 6: Separate auth and account settings

**Goal:** give authentication and profile/settings workflows clear boundaries.

**Completed:** password validation and email normalization are in `server/domain/authRules.js`; password hashing/verification is in `server/services/passwordService.js`; account lifecycle operations are in `server/services/authService.js`; auth HTTP handlers/routes are under `server/controllers/` and `server/routes/`. Account settings validation, persistence service, controller, and router are similarly separated. OAuth callback flows remain app-composed because they coordinate provider state, redirects, and cookies.

**Guardrail:** cookie/session behavior, OAuth protections, and account scoping were preserved; no auth semantics were intentionally changed.

**Exit criteria:** auth and settings changes have isolated service boundaries and can be verified independently from expense and Gmail workflows.

## Phase 7: Split backend into layers

**Goal:** replace the multi-domain `server/db.js` and route-heavy `server/index.js` with explicit boundaries.

**Target:**

```text
server/
  app.js
  routes/
  controllers/
  services/
  repositories/
  domain/
```

**Completed:** runtime startup is separated into `server/index.js` and app/middleware composition into `server/app.js`. Auth, account settings, expenses, and inbox HTTP endpoints now use route -> controller -> service -> domain repository boundaries. Domain-specific repository entry points (`authRepository`, `settingsRepository`, `expensesRepository`, `ingestRepository`, and `gmailRepository`) delegate to the centralized `databaseRepository` connection/query adapter, keeping connection/index setup centralized while creating safe seams for future physical repository extraction. Thin root compatibility modules preserve existing imports. Gmail OAuth callback routes remain app-composed, while Gmail synchronization and token operations are in services.

**Exit criteria:** layered boundaries exist for the primary API slices and API URLs/response shapes are preserved. Unit tests are deferred until after Phase 9.

## Phase 8: Complete feature migration and compatibility cutover

**Goal:** move remaining page UI, hooks, and feature-owned styles from legacy folders into their slices, then retire temporary compatibility facades safely.

**Completed:** auth, dashboard, expenses/trash, budgets, inbox, settings, calendar, due, and bills pages have moved into their feature folders and App routes load them directly. Feature callers use feature-owned services and domain modules. No legacy page imports are required by the app routes. Thin `src/pages`, `src/api`, and backend re-exports remain because current tests still import those compatibility paths; migrate those imports before removing the facades.

**Compatibility cutover:** tests confirm the facades continue working; retire them only after migrating remaining test and external imports. Keep changes feature-scoped.

**Exit criteria:** each route is owned by a feature slice; no stale legacy imports remain; compatibility files are removed only when no callers depend on them.

## Phase 9: Documentation and architecture completion

**Goal:** finish the structure and ensure the documentation matches the final code organization.

**Completed:** updated the README project tree and backend/frontend architecture notes, documented feature ownership, recorded the deferred test matrix, reviewed import direction, and ran ESLint plus a production build. Backend JavaScript syntax and server module loading were also checked. Unit testing remains a separate follow-up after the nine restructuring phases.

**Exit criteria:** the refactored architecture and documentation are in sync, lint/build pass, and the post-refactor unit test pass is complete.

## Recommended execution order

1. Complete Phase 2 feature ownership and page migration.
2. Complete Phase 3 services for expenses, budgets/monthly cycle, settings, and inbox.
3. Finish Phase 4 hooks and reduce app-shell responsibilities.
4. Isolate domain rules and validation boundaries.
5. Separate auth/settings backend responsibilities.
6. Split backend repositories/services/controllers/routes.
7. Complete Phase 8 compatibility cutover.
8. Finish Phase 9 docs and non-test validation.
9. After all restructuring phases are complete, run the focused and full unit/integration test suites as a separate follow-up — complete (208 tests pass).

## Refactor guardrails

- Preserve routes, API payloads, local-storage keys, and visible behavior unless a separate behavior change is explicitly requested.
- Make small feature-scoped changes and verify with lint/build during restructuring; defer unit-test authoring/execution until after Phase 9 as requested.
- Keep server-side validation authoritative for persisted data and user ownership.
- Do not add a state-management library unless the existing React state/hooks prove inadequate.
- Do not split files solely to hit a line-count target; split by responsibility and dependency direction.
