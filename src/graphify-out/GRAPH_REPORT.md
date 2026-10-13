# Graph Report - D:\Projects\react\paisa_wise\src  (2026-10-10)

## Corpus Check
- 16 files · ~8,782 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 100 nodes · 127 edges · 13 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `queue()` - 8 edges
2. `request()` - 7 edges
3. `getMonthlyCycleRange()` - 7 edges
4. `SettingsPage()` - 5 edges
5. `formatUtcDate()` - 5 edges
6. `cycleDateInMonth()` - 5 edges
7. `previewCycleRange()` - 5 edges
8. `money()` - 5 edges
9. `normalizeExpense()` - 4 edges
10. `addExpense()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `ExpenseRow()` --calls--> `money()`  [INFERRED]
  D:\Projects\react\paisa_wise\src\components\PageComponents.jsx → D:\Projects\react\paisa_wise\src\utils\appData.js
- `BudgetsPage()` --calls--> `money()`  [INFERRED]
  D:\Projects\react\paisa_wise\src\pages\BudgetsPage.jsx → D:\Projects\react\paisa_wise\src\utils\appData.js
- `DuePage()` --calls--> `money()`  [INFERRED]
  D:\Projects\react\paisa_wise\src\pages\DuePage.jsx → D:\Projects\react\paisa_wise\src\utils\appData.js
- `App()` --calls--> `getMonthlyCycleRange()`  [INFERRED]
  D:\Projects\react\paisa_wise\src\App.jsx → D:\Projects\react\paisa_wise\src\utils\appData.js
- `App()` --calls--> `cycleRangeLabel()`  [INFERRED]
  D:\Projects\react\paisa_wise\src\App.jsx → D:\Projects\react\paisa_wise\src\utils\appData.js

## Communities

### Community 0 - "Community 0"

Cohesion: 0.16
Nodes (21): addExpense(), API_URL, CACHE_KEY, DATA_MODE, dateOnly(), deleteExpense(), fetchExpenses(), isApiConfigured (+13 more)

### Community 1 - "Community 1"

Cohesion: 0.16
Nodes (19): App(), categories, categoryMeta, cycleDateInMonth(), cycleRangeLabel(), dateOffset(), defaultBudgets, formatUtcDate() (+11 more)

### Community 2 - "Community 2"

Cohesion: 0.14
Nodes (8): AuthPage, BudgetsPage, CalendarPage, DashboardPage, DuePage, ExpensesPage, SettingsPage, TrashPage

### Community 3 - "Community 3"

Cohesion: 0.18
Nodes (2): formatDate(), ExpenseRow()

### Community 4 - "Community 4"

Cohesion: 0.22
Nodes (6): cycleHeaderLabel(), indiaGreeting(), money(), BudgetsPage(), DashboardPage(), DuePage()

### Community 5 - "Community 5"

Cohesion: 0.4
Nodes (4): pageByPath, pagePaths, primaryNavigation, routeLabels

### Community 6 - "Community 6"

Cohesion: 0.67
Nodes (1): morePages

### Community 7 - "Community 7"

Cohesion: 0.67
Nodes (1): isIosDevice

### Community 8 - "Community 8"

Cohesion: 0.67
Nodes (1): PAGE_SIZE

### Community 9 - "Community 9"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Community 10"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **29 isolated node(s):** `AuthPage`, `DashboardPage`, `ExpensesPage`, `DuePage`, `CalendarPage` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (2 nodes): `AuthPage()`, `AuthPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (2 nodes): `CalendarPage()`, `CalendarPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (2 nodes): `TrashPage.jsx`, `TrashPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.