# expenses()

> God node · 7 connections · [D:\Projects\react\paisa_wise\server\db.js](file:///D:/Projects/react/paisa_wise/server/db.js#L233)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as expenses()
    participant P1 as createExpense()
    participant P2 as normalizeExpense()
    participant P3 as updateExpense()
    participant P4 as dateOnly()
    participant P5 as timestamp()
    participant P6 as publicExpense()
    participant P7 as deleteExpense()
    participant P8 as restoreExpense()
    participant P9 as listExpenses()
    participant P10 as purgeExpense()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
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
    P1->>+ P6: calls
    P6-->>- P1: return
    P6->>+ P1: calls
    P1-->>- P6: return
    P6->>+ P3: calls
    P3-->>- P6: return
    P6->>+ P7: calls
    P7-->>- P6: return
    P6->>+ P8: calls
    P8-->>- P6: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P3->>+ P0: calls
    P0-->>- P3: return
    P3->>+ P2: calls
    P2-->>- P3: return
    P3->>+ P6: calls
    P6-->>- P3: return
    P0->>+ P7: calls
    P7-->>- P0: return
    P0->>+ P8: calls
    P8-->>- P0: return
    P0->>+ P9: calls
    P9-->>- P0: return
    P0->>+ P10: calls
    P10-->>- P0: return
```

## Connections by Relation

### calls
- [[createExpense()]] `EXTRACTED`
- [[updateExpense()]] `EXTRACTED`
- [[deleteExpense()]] `EXTRACTED`
- [[restoreExpense()]] `EXTRACTED`
- [[listExpenses()]] `EXTRACTED`
- [[purgeExpense()]] `EXTRACTED`

### contains
- [[db.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*