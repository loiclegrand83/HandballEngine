---
title: 'Gardien is a real poste, correctly capped'
type: 'bugfix'
created: '2026-10-09'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Gardien lives in `assets[]` (`app.js:65`) instead of `HANDBALL_POSTS`, so it's placed via the Assets panel, not Joueurs — a real discoverability bug (QA-confirmed, screenshot-confirmed 2026-10-08). Worse, the existing `isGoalkeeper` cap computation keys off `post === 'AG'` (Ailier Gauche / Left Wing), so the 1-per-team Gardien cap has never actually fired on a real Gardien placement.

**Approach:** Add Gardien (`G`) as a 7th poste alongside the 6 outfield postes in both `HANDBALL_POSTS` (app.js) and `POSTES` (dock.js), routed through the exact same `selectPost`/`addItem` placement path outfield postes already use (not the separate Assets/`selectAsset` flow Gardien currently uses). Fix `isGoalkeeper` to key off `post === 'G'`. Remove the stray `'Demi'` entry from `dock.js`'s `POSTES` (never in `HANDBALL_POSTS`, not in the PRD's final poste list — leftover from an earlier draft).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Place Gardien via Joueurs panel | Team A, 0 Gardien placed, coach selects "G" poste then clicks terrain | Item placed with `post: 'G'`, `isGoalkeeper: true`, `team: 'A'`; displayLabel shows "G" (not numbered) | N/A |
| 2nd Gardien attempt | Team A already has 1 Gardien placed | "G" button disabled in Joueurs panel — cap now actually fires | N/A |
| 6 outfield + 0 Gardien | Team A has 6 outfield players, 0 Gardien | Outfield poste buttons disabled, "G" remains selectable | N/A |
| Load a saved exercise with legacy `id: 'G-...'` Gardien item, no `post` field | Pre-fix saved data | `detectPoste` falls back to id-prefix check (`item.id.startsWith('G')`), still resolves to "Gardien" — no regression on old data | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/js/app.js:65` -- `assets[]` entry `{id: 'G', label: 'Gardien', ...}` -- remove this entry; Gardien no longer placed via the Assets/`selectAsset` flow
- `web-board/src/js/app.js:1086` -- `HANDBALL_POSTS = ['AG', 'ARG', 'DC', 'PIV', 'ARD', 'AD']` -- add `'G'` as 7th entry
- `web-board/src/js/app.js:1161` -- `isGoalkeeper: isPlayer && post === 'AG'` -- change to `post === 'G'`
- `web-board/src/js/app.js:1148-1150` -- `addItem`'s displayLabel logic: `post === 'AG' ? post : getPosteLabel(...)` -- this AG-special-case was actually meant for Gardien (no instance numbering); change condition to `post === 'G'`
- `web-board/src/js/app.js:2000-2001` -- `POST_LABELS` object (no `AG`/`AD` full-name confusion here, just missing entry) -- add `G: 'Gardien'` so `detectPoste`'s `item.post` priority branch resolves correctly for newly-placed items
- `web-board/src/js/dock.js:18-25` -- `POSTES` array -- add `{ id: 'G', label: 'Gardien' }`, remove the `{ id: 'Demi', label: 'Demi' }` entry
- `web-board/src/js/dock.js:182` -- `isGoalkeeperPoste = poste.id === 'AG'` -- change to `poste.id === 'G'`

## Tasks & Acceptance

**Execution:**
- [ ] `web-board/src/js/app.js` -- remove Gardien from `assets[]`, add `'G'` to `HANDBALL_POSTS`, fix `isGoalkeeper` and displayLabel logic to key off `'G'` not `'AG'`, add `G: 'Gardien'` to `POST_LABELS` -- moves Gardien into the poste system and fixes the cap bug
- [ ] `web-board/src/js/dock.js` -- add Gardien to `POSTES`, remove stray `'Demi'` entry, fix `isGoalkeeperPoste` check to `'G'` -- Joueurs panel now shows and correctly caps Gardien

**Acceptance Criteria:**
- Given the Joueurs panel is open, when I view the poste list, then I see exactly 7 postes: AG, ARG, DC, PIV, ARD, AD, G — no "Demi"
- Given Team A has 1 Gardien placed, when I open the Joueurs panel, then the "G" button is disabled
- Given Team A has 6 outfield players and 0 Gardien, when I open the Joueurs panel, then outfield buttons are disabled but "G" remains enabled
- Given I place a Gardien, when I inspect the placed item, then `post === 'G'` and `isGoalkeeper === true`

## Implementation Notes

All 7 planned edits applied exactly as Code Map specified — no surprises, no scope growth. `assets[]` entry removed, `HANDBALL_POSTS` gained `'G'`, `isGoalkeeper`/`displayLabel`/`POST_LABELS` all keyed off `'G'`, `POSTES`/`isGoalkeeperPoste` in dock.js updated, stray `'Demi'` removed. Verified no other `'AG'`-as-goalkeeper or `'Demi'` references remain anywhere in either file. Both files pass `node -c` syntax check.

## Verification

**Manual checks (if no CLI):**
- Open the Joueurs panel in the running app, confirm 7 postes shown (no Demi), G present
- Place 1 Gardien for Team A, confirm G button becomes disabled
- Place 6 outfield players for Team A, confirm outfield buttons disabled, G still enabled
- Inspect `state.items` after placing a Gardien via browser devtools or `window.PlayerSelectionAPI.getState()` (if still present at this point in the epic — Story 5.5 removes it later) -- confirm `post: 'G'`, `isGoalkeeper: true`

## Review Triage Log

- **high, patch** — `deleteItemAt` (app.js:1396) still checked `deleted.post !== 'AG'` to skip re-numbering on deletion — same bug class as this story's fix, missed in the original migration. Confirmed by reading the function. Fixed: changed to `!== 'G'`.
- **high, patch** — `sanitizeItem` (app.js:1088) never restored `raw.isGoalkeeper` on load, so the Gardien cap silently stopped being enforced for any item surviving a page reload (cap check in dock.js reads `item.isGoalkeeper`). Confirmed by reading the function and its single call site (app.js:1546). Pre-existing bug, but directly exposed by this change's cap-check work — smallest fix is a simple one-liner, so patched rather than deferred: `isGoalkeeper: Boolean(raw.isGoalkeeper) || raw.post === 'G'`.
- **low, rejected** — `getItemIndexAt` (app.js:1170) still has `item.id.startsWith('G')` in its human-detection check. Confirmed dead now (no item id can start with 'G' since the `assets[]` entry was removed), but harmless — never matches, no behavior change. Not worth touching in this story.
- **false** — `detectPoste`'s `item.id.startsWith('G') || item.id.startsWith('GK')` fallback (app.js:2013) was flagged as dead/stale code. Disproven: this is the intentional backward-compat path for pre-fix saved exercises with legacy `id: 'G-...'` items and no `post` field — explicitly specified in this story's own I/O & Edge-Case Matrix ("Load a saved exercise with legacy `id: 'G-...'` Gardien item"). Working as designed.
- **low, rejected** — suggestion to add a code comment distinguishing `AG` (Ailier Gauche) from `G` (Gardien) near `HANDBALL_POSTS`/`POSTES` to prevent regression. Reasonable but cosmetic — no functional defect, not required by the spec.
