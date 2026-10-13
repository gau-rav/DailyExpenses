# normalizeExpense()

> God node · 4 connections · [D:\Projects\react\paisa_wise\src\api\expensesApi.js](file:///D:/Projects/react/paisa_wise/src/api/expensesApi.js#L57)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as normalizeExpense()
    participant P1 as addExpense()
    participant P2 as queue()
    participant P3 as updateExpense()
    participant P4 as writeQueue()
    participant P5 as readQueue()
    participant P6 as deleteExpense()
    participant P7 as restoreExpense()
    participant P8 as purgeExpense()
    participant P9 as request()
    participant P10 as syncQueuedActions()
    participant P11 as dateOnly()
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
    P2->>+ P8: calls
    P8-->>- P2: return
    P1->>+ P9: calls
    P9-->>- P1: return
    P9->>+ P1: calls
    P1-->>- P9: return
    P9->>+ P3: calls
    P3-->>- P9: return
    P9->>+ P10: calls
    P10-->>- P9: return
    P9->>+ P6: calls
    P6-->>- P9: return
    P9->>+ P7: calls
    P7-->>- P9: return
    P9->>+ P8: calls
    P8-->>- P9: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P0->>+ P11: calls
    P11-->>- P0: return
```

## Connections by Relation

### calls
- [[addExpense()]] `EXTRACTED`
- [[updateExpense()]] `EXTRACTED`
- [[dateOnly()]] `EXTRACTED`

### contains
- [[expensesApi.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*