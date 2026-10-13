# budgets()

> God node · 3 connections · [D:\Projects\react\paisa_wise\server\db.js](file:///D:/Projects/react/paisa_wise/server/db.js#L67)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as budgets()
    participant P1 as getBudgetLimits()
    participant P2 as saveBudgetLimits()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P0->>+ P2: calls
    P2-->>- P0: return
    P2->>+ P0: calls
    P0-->>- P2: return
```

## Connections by Relation

### calls
- [[getBudgetLimits()]] `EXTRACTED`
- [[saveBudgetLimits()]] `EXTRACTED`

### contains
- [[db.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*