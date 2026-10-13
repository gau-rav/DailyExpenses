# getUserBySession()

> God node · 4 connections · [D:\Projects\react\paisa_wise\server\db.js](file:///D:/Projects/react/paisa_wise/server/db.js#L158)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as getUserBySession()
    participant P1 as sessions()
    participant P2 as createSession()
    participant P3 as hashToken()
    participant P4 as deleteSession()
    participant P5 as deleteUserSessions()
    participant P6 as pruneSessions()
    participant P7 as users()
    participant P8 as getUserByEmail()
    participant P9 as createPasswordUser()
    participant P10 as setPasswordHash()
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
    P1->>+ P4: calls
    P4-->>- P1: return
    P4->>+ P1: calls
    P1-->>- P4: return
    P4->>+ P3: calls
    P3-->>- P4: return
    P1->>+ P5: calls
    P5-->>- P1: return
    P5->>+ P1: calls
    P1-->>- P5: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P6->>+ P1: calls
    P1-->>- P6: return
    P0->>+ P7: calls
    P7-->>- P0: return
    P7->>+ P0: calls
    P0-->>- P7: return
    P7->>+ P8: calls
    P8-->>- P7: return
    P7->>+ P9: calls
    P9-->>- P7: return
    P7->>+ P10: calls
    P10-->>- P7: return
    P0->>+ P3: calls
    P3-->>- P0: return
```

## Connections by Relation

### calls
- [[sessions()]] `EXTRACTED`
- [[users()]] `EXTRACTED`
- [[hashToken()]] `EXTRACTED`

### contains
- [[db.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*