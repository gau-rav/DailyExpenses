# users()

> God node · 5 connections · [D:\Projects\react\paisa_wise\server\db.js](file:///D:/Projects/react/paisa_wise/server/db.js#L57)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as users()
    participant P1 as getUserBySession()
    participant P2 as sessions()
    participant P3 as createSession()
    participant P4 as deleteSession()
    participant P5 as deleteUserSessions()
    participant P6 as pruneSessions()
    participant P7 as hashToken()
    participant P8 as getUserByEmail()
    participant P9 as createPasswordUser()
    participant P10 as setPasswordHash()
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
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P7->>+ P1: calls
    P1-->>- P7: return
    P7->>+ P3: calls
    P3-->>- P7: return
    P7->>+ P4: calls
    P4-->>- P7: return
    P0->>+ P8: calls
    P8-->>- P0: return
    P8->>+ P0: calls
    P0-->>- P8: return
    P0->>+ P9: calls
    P9-->>- P0: return
    P0->>+ P10: calls
    P10-->>- P0: return
```

## Connections by Relation

### calls
- [[getUserBySession()]] `EXTRACTED`
- [[getUserByEmail()]] `EXTRACTED`
- [[createPasswordUser()]] `EXTRACTED`
- [[setPasswordHash()]] `EXTRACTED`

### contains
- [[db.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*