# getMonthlyCycleRange()

> God node · 7 connections · [D:\Projects\react\paisa_wise\src\utils\appData.js](file:///D:/Projects/react/paisa_wise/src/utils/appData.js#L33)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as getMonthlyCycleRange()
    participant P1 as formatUtcDate()
    participant P2 as cycleDateInMonth()
    participant P3 as previewCycleRange()
    participant P4 as getCycleDateForSettings()
    participant P5 as SettingsPage()
    participant P6 as getPreviousMonthStart()
    participant P7 as App()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P0: calls
    P0-->>- P2: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P1->>+ P3: calls
    P3-->>- P1: return
    P3->>+ P0: calls
    P0-->>- P3: return
    P3->>+ P2: calls
    P2-->>- P3: return
    P3->>+ P1: calls
    P1-->>- P3: return
    P3->>+ P5: calls
    P5-->>- P3: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P6->>+ P1: calls
    P1-->>- P6: return
    P6->>+ P5: calls
    P5-->>- P6: return
    P0->>+ P2: calls
    P2-->>- P0: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P0->>+ P5: calls
    P5-->>- P0: return
    P0->>+ P4: calls
    P4-->>- P0: return
    P0->>+ P7: calls
    P7-->>- P0: return
```

## Connections by Relation

### calls
- [[formatUtcDate()]] `EXTRACTED`
- [[cycleDateInMonth()]] `EXTRACTED`
- [[previewCycleRange()]] `EXTRACTED`
- [[SettingsPage()]] `INFERRED`
- [[getCycleDateForSettings()]] `EXTRACTED`
- [[App()]] `INFERRED`

### contains
- [[appData.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*