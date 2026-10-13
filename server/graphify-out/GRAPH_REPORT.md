# Graph Report - D:\Projects\react\paisa_wise\server  (2026-10-10)

## Corpus Check
- 2 files · ~3,031 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 69 nodes · 102 edges · 8 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
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

## God Nodes (most connected - your core abstractions)
1. `expenses()` - 7 edges
2. `sessions()` - 6 edges
3. `users()` - 5 edges
4. `normalizeExpense()` - 5 edges
5. `publicExpense()` - 5 edges
6. `getUserBySession()` - 4 edges
7. `createExpense()` - 4 edges
8. `updateExpense()` - 4 edges
9. `hashToken()` - 4 edges
10. `budgets()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `getUserBySession()` --calls--> `users()`  [EXTRACTED]
  D:\Projects\react\paisa_wise\server\db.js → D:\Projects\react\paisa_wise\server\db.js  _Bridges community 4 → community 3_

## Communities

### Community 0 - "Community 0"

Cohesion: 0.07
Nodes (23): { action, expense, id }, app, bodyText, currentPassword, deleted, distPath, dummyEmail, dummyPassword (+15 more)

### Community 1 - "Community 1"

Cohesion: 0.25
Nodes (11): createExpense(), dateOnly(), deleteExpense(), expenses(), listExpenses(), normalizeExpense(), publicExpense(), purgeExpense() (+3 more)

### Community 2 - "Community 2"

Cohesion: 0.36
Nodes (7): connectDatabase(), connectionPromise, database, getMonthlyCycle(), initializeDatabase(), saveMonthlyCycle(), userSettings()

### Community 3 - "Community 3"

Cohesion: 0.38
Nodes (7): createSession(), deleteSession(), deleteUserSessions(), getUserBySession(), hashToken(), pruneSessions(), sessions()

### Community 4 - "Community 4"

Cohesion: 0.5
Nodes (4): createPasswordUser(), getUserByEmail(), setPasswordHash(), users()

### Community 5 - "Community 5"

Cohesion: 0.67
Nodes (3): budgets(), getBudgetLimits(), saveBudgetLimits()

### Community 6 - "Community 6"

Cohesion: 0.67
Nodes (3): clearCookie(), cookieOptions(), setCookie()

### Community 7 - "Community 7"

Cohesion: 0.67
Nodes (3): hashPassword(), scrypt, verifyPassword()

## Knowledge Gaps
- **25 isolated node(s):** `database`, `connectionPromise`, `app`, `port`, `isProduction` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.