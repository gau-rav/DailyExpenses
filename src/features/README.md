# Feature slices

Feature-owned pages, hooks, services, and domain rules live in their slices. App routes load pages from these feature folders directly. Cross-feature primitives live in `src/shared`, while shared UI remains under `src/components`. `src/pages` and `src/api` retain thin compatibility re-exports because some existing tests still import those paths; migrate those imports before removing the facades.

| Slice | Owns |
| --- | --- |
| `auth` | Registration, sign-in, session and identity UI |
| `dashboard` | Spending overview and primary landing page |
| `expenses` | Expense CRUD, offline queue, expense list and trash workflows |
| `due` | Bills, due payments, and due-date workflows |
| `budgets` | Budget limits and reporting workflows |
| `inbox` | Gmail connection and transaction review |
| `settings` | Currency, profile and account preferences |
| `calendar` | Month/calendar views and date selection |

Keep imports pointed inward: app composition may depend on features; a feature may use shared utilities and its own service/domain modules; shared code must not depend on feature internals. Feature services own API/persistence workflows, and domain modules own deterministic rules such as normalization, budget pace, monthly cycles, and due-date grouping.

See the repository-root `REFACTOR_ROADMAP.md` for phase status, migration sequence, completion criteria, and the deferred test matrix.
