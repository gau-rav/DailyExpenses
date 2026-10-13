# publicExpense()

> God node · 5 connections · [D:\Projects\react\paisa_wise\server\db.js](file:///D:/Projects/react/paisa_wise/server/db.js#L309)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as publicExpense()
    participant P1 as createExpense()
    participant P2 as expenses()
    participant P3 as updateExpense()
    participant P4 as deleteExpense()
    participant P5 as restoreExpense()
    participant P6 as listExpenses()
    participant P7 as purgeExpense()
    participant P8 as normalizeExpense()
    participant P9 as dateOnly()
    participant P10 as timestamp()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P2->>+ P5: calls
    P5-->>- P2: return
    P2->>+ P6: calls
    P6-->>- P2: return
    P2->>+ P7: calls
    P7-->>- P2: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P8->>+ P1: calls
    P1-->>- P8: return
    P8->>+ P3: calls
    P3-->>- P8: return
    P8->>+ P9: calls
    P9-->>- P8: return
    P8->>+ P10: calls
    P10-->>- P8: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P0->>+ P4: calls
    P4-->>- P0: return
    P0->>+ P5: calls
    P5-->>- P0: return
```

## Connections by Relation

### calls
- [[createExpense()]] `EXTRACTED`
- [[updateExpense()]] `EXTRACTED`
- [[deleteExpense()]] `EXTRACTED`
- [[restoreExpense()]] `EXTRACTED`

### contains
- [[db.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*