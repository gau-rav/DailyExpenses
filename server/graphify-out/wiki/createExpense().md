# createExpense()

> God node · 4 connections · [D:\Projects\react\paisa_wise\server\db.js](file:///D:/Projects/react/paisa_wise/server/db.js#L243)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as createExpense()
    participant P1 as expenses()
    participant P2 as updateExpense()
    participant P3 as normalizeExpense()
    participant P4 as publicExpense()
    participant P5 as deleteExpense()
    participant P6 as restoreExpense()
    participant P7 as listExpenses()
    participant P8 as purgeExpense()
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
    P1->>+ P5: calls
    P5-->>- P1: return
    P5->>+ P1: calls
    P1-->>- P5: return
    P5->>+ P4: calls
    P4-->>- P5: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P6->>+ P1: calls
    P1-->>- P6: return
    P6->>+ P4: calls
    P4-->>- P6: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P7->>+ P1: calls
    P1-->>- P7: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P0->>+ P4: calls
    P4-->>- P0: return
```

## Connections by Relation

### calls
- [[expenses()]] `EXTRACTED`
- [[normalizeExpense()]] `EXTRACTED`
- [[publicExpense()]] `EXTRACTED`

### contains
- [[db.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*