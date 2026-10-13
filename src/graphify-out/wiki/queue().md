# queue()

> God node · 8 connections · [D:\Projects\react\paisa_wise\src\api\expensesApi.js](file:///D:/Projects/react/paisa_wise/src/api/expensesApi.js#L42)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as queue()
    participant P1 as addExpense()
    participant P2 as request()
    participant P3 as updateExpense()
    participant P4 as syncQueuedActions()
    participant P5 as deleteExpense()
    participant P6 as restoreExpense()
    participant P7 as purgeExpense()
    participant P8 as normalizeExpense()
    participant P9 as dateOnly()
    participant P10 as writeQueue()
    participant P11 as readQueue()
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
    P0->>+ P3: calls
    P3-->>- P0: return
    P3->>+ P0: calls
    P0-->>- P3: return
    P3->>+ P2: calls
    P2-->>- P3: return
    P3->>+ P8: calls
    P8-->>- P3: return
    P0->>+ P10: calls
    P10-->>- P0: return
    P0->>+ P11: calls
    P11-->>- P0: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P0->>+ P6: calls
    P6-->>- P0: return
    P0->>+ P7: calls
    P7-->>- P0: return
```

## Connections by Relation

### calls
- [[addExpense()]] `EXTRACTED`
- [[updateExpense()]] `EXTRACTED`
- [[writeQueue()]] `EXTRACTED`
- [[readQueue()]] `EXTRACTED`
- [[deleteExpense()]] `EXTRACTED`
- [[restoreExpense()]] `EXTRACTED`
- [[purgeExpense()]] `EXTRACTED`

### contains
- [[expensesApi.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*