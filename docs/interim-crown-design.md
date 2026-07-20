# Interim Crown Feature — Design Document

## Overview
Add UFC-style interim championship belts to the Catan crown system. When the current crown holder is absent from a match, the winner earns an interim title. Two consecutive interim wins promote the interim champ to full champion.

## Rules

### Match Processing Logic

When a match is played, the first check is: **Is the current crown holder in this match?**

#### Crown Holder IS Playing
- Normal crown logic applies (defend or lose the belt)
- **Any existing interim status is cleared** — the real belt is on the line, so interim becomes irrelevant
- This includes "unification" matches where both the real champ and interim champ are present

#### Crown Holder is ABSENT
- The match winner becomes the **interim champion**
- If the winner is **already the interim champ** → increment their consecutive wins counter
  - At **2 consecutive wins** → promoted to **full champion** (replaces the absent champ, old champ's reign ends)
- If the winner is **someone new** (or a different interim champ lost) → they become the new interim champ with 1 consecutive win
- Previous interim status is always replaced by the new winner

### Edge Cases (Confirmed)

| Scenario | Outcome |
|----------|---------|
| Interim champ loses (no real champ present) | New winner becomes new interim champ |
| Real champ plays without interim champ | Interim status is cleared |
| Both real + interim champ play together | Normal crown logic; interim cleared |
| Interim wins need to be consecutive? | **Yes** — losing resets the count |
| Applies to all divisions? | **Yes** — 4, 5, and 6-player divisions |

## Data Model Changes

### `crown_state` document (per division)
Add these fields to the existing document:

```js
{
  // ...existing fields (id, partitionKey, type, division, currentHolderId, etc.)...
  
  interimHolderId: null,          // player ID of interim champion
  interimHolderName: null,        // player name of interim champion  
  interimAcquiredAt: null,        // date interim status was earned
  interimConsecutiveWins: 0       // consecutive wins toward promotion (promote at 2)
}
```

### `crown_reign` documents
- Interim promotions should end the previous champ's reign and start a new one
- Consider adding a `wasInterim: true` flag to reigns that started as interim promotions

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/crownService.js` | Core logic in `processMatchCrown()` — add interim branch; update `rebuildCrownTimeline()` |
| `src/server.js` | No changes needed (existing endpoints cover it) |
| `public/app.js` | Update `renderCrownsAndLineage()` to display interim badges |
| `public/index.html` | May need interim badge styling in crown section |
| `public/style.css` | Interim crown badge styling (different color/icon from full crown) |

## Frontend Display

- Interim crowns should be visually distinct from full crowns (e.g., different icon like ⚔️ instead of 👑, different badge color)
- Crown badge should show "INTERIM" label
- Lineage timeline should note interim reigns vs full reigns
