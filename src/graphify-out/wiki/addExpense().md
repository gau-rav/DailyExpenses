# addExpense()

> God node · 4 connections · [D:\Projects\react\paisa_wise\src\api\expensesApi.js](file:///D:/Projects/react/paisa_wise/src/api/expensesApi.js#L100)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as addExpense()
    participant P1 as queue()
    participant P2 as updateExpense()
    participant P3 as request()
    participant P4 as normalizeExpense()
    participant P5 as writeQueue()
    participant P6 as syncQueuedActions()
    participant P7 as readQueue()
    participant P8 as deleteExpense()
    participant P9 as restoreExpense()
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
    P1->>+ P5: calls
    P5-->>- P1: return
    P5->>+ P1: calls
    P1-->>- P5: return
    P5->>+ P6: calls
    P6-->>- P5: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P7->>+ P1: calls
    P1-->>- P7: return
    P7->>+ P6: calls
    P6-->>- P7: return
    P1->>+ P8: calls
    P8-->>- P1: return
    P8->>+ P1: calls
    P1-->>- P8: return
    P8->>+ P3: calls
    P3-->>- P8: return
    P1->>+ P9: calls
    P9-->>- P1: return
    P1->>+ P10: calls
    P10-->>- P1: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P0->>+ P4: calls
    P4-->>- P0: return
```

## Connections by Relation

### calls
- [[queue()]] `EXTRACTED`
- [[request()]] `EXTRACTED`
- [[normalizeExpense()]] `EXTRACTED`

### contains
- [[expensesApi.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*