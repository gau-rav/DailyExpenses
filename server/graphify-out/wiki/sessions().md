# sessions()

> God node · 6 connections · [D:\Projects\react\paisa_wise\server\db.js](file:///D:/Projects/react/paisa_wise/server/db.js#L62)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as sessions()
    participant P1 as getUserBySession()
    participant P2 as users()
    participant P3 as getUserByEmail()
    participant P4 as createPasswordUser()
    participant P5 as setPasswordHash()
    participant P6 as hashToken()
    participant P7 as createSession()
    participant P8 as deleteSession()
    participant P9 as deleteUserSessions()
    participant P10 as pruneSessions()
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
    P6->>+ P7: calls
    P7-->>- P6: return
    P6->>+ P8: calls
    P8-->>- P6: return
    P0->>+ P7: calls
    P7-->>- P0: return
    P7->>+ P0: calls
    P0-->>- P7: return
    P7->>+ P6: calls
    P6-->>- P7: return
    P0->>+ P8: calls
    P8-->>- P0: return
    P0->>+ P9: calls
    P9-->>- P0: return
    P0->>+ P10: calls
    P10-->>- P0: return
```

## Connections by Relation

### calls
- [[getUserBySession()]] `EXTRACTED`
- [[createSession()]] `EXTRACTED`
- [[deleteSession()]] `EXTRACTED`
- [[deleteUserSessions()]] `EXTRACTED`
- [[pruneSessions()]] `EXTRACTED`

### contains
- [[db.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*