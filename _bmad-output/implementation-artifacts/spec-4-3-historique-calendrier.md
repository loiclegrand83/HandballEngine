---
title: 'Historique du Calendrier'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** This story is a verification pass, not new construction (same pattern as Story 3.3): month/week prev/next navigation (`web-board/src/js/planning.js`) is pure date arithmetic with no lower bound, and `loadEvents()` fetches the entire `/api/planning` directory unfiltered — nothing in the current code imposes a depth limit on past navigation. The requirement is to confirm this holds and that past events actually render correctly, not to build new bounding logic.

**Approach:** Verify end-to-end against the real server: create events on several past dates (including a very old one, e.g. several years back, and one spanning a year/month boundary), navigate back to each via prev/next in both month and week modes, and confirm they render. Confirm no code path in `planning.js` clamps `viewDate`, filters `events` by recency, or otherwise limits history depth.

</frozen-after-approval>

## Implementation Notes

- No code changes — confirmed by inspection that nothing in `planning.js` clamps `viewDate`, filters `events` by recency, or otherwise limits history depth: prev/next is pure `Date` arithmetic (`getMonth() - 1`/`getDate() - 7`, no lower bound check anywhere), and `loadEvents()`/`GET /api/planning` (via the generic `handleCrudRoute`) reads and returns every file in `data/planning/` unfiltered — there is no date-range query parameter or server-side windowing to hit a limit against.
- Verified end-to-end against the real server: created a Match on 2019-03-15 (several years back) and an Entraînement on the year-boundary date 2025-12-31, confirmed both are returned unfiltered by `GET /api/planning` (2 of 2 events present), then simulated the actual client navigation and rendering logic — stepping `viewDate` back via the exact same `new Date(y, m-1, 1)` arithmetic the "prev" button uses reached March 2019 in 90 clicks with no limit encountered, and both events correctly landed in their respective month-grid and week-grid cells using the app's own grid-start/cell-matching logic.
- Test data cleaned up after verification; no data was left in `web-board/data/planning/`.

