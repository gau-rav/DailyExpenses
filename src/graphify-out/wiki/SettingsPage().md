# SettingsPage()

> God node · 5 connections · [D:\Projects\react\paisa_wise\src\pages\SettingsPage.jsx](file:///D:/Projects/react/paisa_wise/src/pages/SettingsPage.jsx#L7)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as SettingsPage()
    participant P1 as getMonthlyCycleRange()
    participant P2 as formatUtcDate()
    participant P3 as cycleDateInMonth()
    participant P4 as previewCycleRange()
    participant P5 as getPreviousMonthStart()
    participant P6 as getCycleDateForSettings()
    participant P7 as App()
    participant P8 as cycleRangeLabel()
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
    P1->>+ P3: calls
    P3-->>- P1: return
    P3->>+ P1: calls
    P1-->>- P3: return
    P3->>+ P2: calls
    P2-->>- P3: return
    P3->>+ P4: calls
    P4-->>- P3: return
    P3->>+ P6: calls
    P6-->>- P3: return
    P1->>+ P4: calls
    P4-->>- P1: return
    P4->>+ P1: calls
    P1-->>- P4: return
    P4->>+ P3: calls
    P3-->>- P4: return
    P4->>+ P2: calls
    P2-->>- P4: return
    P4->>+ P0: calls
    P0-->>- P4: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P6: calls
    P6-->>- P1: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P0->>+ P4: calls
    P4-->>- P0: return
    P0->>+ P8: calls
    P8-->>- P0: return
    P0->>+ P5: calls
    P5-->>- P0: return
```

## Connections by Relation

### calls
- [[getMonthlyCycleRange()]] `INFERRED`
- [[previewCycleRange()]] `INFERRED`
- [[cycleRangeLabel()]] `INFERRED`
- [[getPreviousMonthStart()]] `INFERRED`

### contains
- [[SettingsPage.jsx]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*