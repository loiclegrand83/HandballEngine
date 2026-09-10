---
title: 'Vue mensuelle/hebdomadaire'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `web-board/src/js/planning.js` only implements a month view (`renderCalendar()`, month prev/next/today navigation). There is no week view and no toggle between granularities.

**Approach:** Replace the month-only `viewYear`/`viewMonth` state with a single `viewDate` anchor (a `Date`) plus a `viewMode` (`'month'|'week'`). `renderCalendar()` branches on `viewMode`: month mode keeps today's 42-cell grid (unchanged logic, derived from `viewDate`'s year/month); week mode renders the 7 days of the Monday-start week containing `viewDate`, reusing the same day-cell/event-chip rendering so both views read from the same `events` array and show identical events for their respective period. Prev/next step by month or by 7 days depending on the active mode; "Aujourd'hui" resets `viewDate` to today in either mode. Add a Mois/Semaine toggle to the toolbar.

</frozen-after-approval>

## Implementation Notes

- `web-board/src/js/planning.js`: replaced `viewYear`/`viewMonth` with `viewDate` (a `Date` anchor) + `viewMode`. Added `mondayOf(d)` (reuses the same Monday-start convention already used for the month grid's leading offset). `renderCalendar()` now branches: month mode unchanged in behavior (42-cell grid, other-month dimming), week mode renders exactly 7 cells for the Monday-start week containing `viewDate`, no other-month dimming (no such concept in week view), and a date-range label instead of a month name. Both branches share the identical event-filtering/chip-rendering code, so month and week are guaranteed to show the same events for any date by construction (same `events` array, same `e.date === iso` match), not by convention.
- Prev/next step by month or by 7 days depending on `viewMode`; "Aujourd'hui" resets `viewDate` to today in either mode.
- `web-board/pages/planning.html`: added a Mois/Semaine toggle to the toolbar. `web-board/src/css/planning.css`: added `.view-toggle`/`.btn--toggle` styles (active-state highlight) and a `.calendar-grid--week` rule giving week-mode cells more vertical room (260px min-height vs the month grid's 110px) since a week has far fewer cells to fit on screen.
- Verified: `node -c`; unit-tested the date math directly in Node (Monday-of-week derivation for several days of the week, week navigation across a month boundary, month navigation across a year boundary — all correct); confirmed both toggle button ids exist in the HTML; confirmed structurally that month and week views share the same event-matching code path (not just spot-checked with sample dates).
- **Review findings fixed:** week-mode prev/next now reassigns a new `Date` (`viewDate = d` after `d.setDate(...)`) instead of mutating `viewDate` in place, for consistency with the month-mode branch and to remove the latent aliasing risk a future edit could introduce; added `aria-pressed` to both toggle buttons, kept in sync with the `.active` class on every render; the week label now includes the start date's year when it differs from the end date's (e.g. "29 Décembre 2025 – 4 Janvier 2026" instead of the ambiguous "29 Décembre – 4 Janvier 2026"); added a mobile (`max-width: 700px`) override for `.calendar-grid--week .day-cell` — without it, the new `.calendar-grid--week` rule's higher CSS specificity would have silently defeated the existing mobile-compact `.day-cell` override.
- Re-verified: `node -c`; re-ran the Monday-of-week Node check including the Sunday case (`getDay() === 0` → offset 6, confirmed correct) and the year-boundary label construction.

## Review Triage Log

- **`viewDate` mutated in place in week mode vs. reassigned in month mode — latent aliasing risk** — verdict: real, low current impact but simple fix. Patched: week mode now reassigns too.
- **Toggle buttons had no `aria-pressed`/similar, only a visual `.active` class** — verdict: real accessibility gap, simple fix. Patched.
- **Week label ambiguous when spanning a year boundary (start date shows no year)** — verdict: real, simple fix. Patched.
- "`btnPrevMonth`/`btnNextMonth`/`monthLabel` element ids still read month-specific even though they now drive week nav too" — verdict: real naming debt but purely cosmetic (internal ids, no functional or accessibility impact). Deferred — not worth the id-rename churn across HTML+JS for this story.
- "No keyboard focus-visible styling added for the new toggle buttons" — verdict: false. No global `outline: none` reset exists for `.btn`/`.btn--toggle` anywhere in this stylesheet — the browser's default focus ring is preserved.
- **`.calendar-grid--week .day-cell` (260px) has higher CSS specificity than the existing mobile `.day-cell` override (72px) inside `@media (max-width: 700px)`, so it would silently defeat the mobile-compact sizing on small screens** — verdict: real, caused by this change. Fixed: added a `.calendar-grid--week .day-cell` override inside the same media query (140px).
- "No test coverage confirming `mondayOf` handles Sunday correctly" — verdict: real gap in the original verification, closed by re-testing explicitly (see Implementation Notes) — confirmed correct.

