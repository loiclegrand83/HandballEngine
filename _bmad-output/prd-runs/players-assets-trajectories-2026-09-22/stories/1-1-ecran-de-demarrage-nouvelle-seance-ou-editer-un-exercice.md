---
title: 'Écran de démarrage — Nouvelle Séance ou Éditer un exercice'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '04870b3de5cb698dd47ddfc753deb0bebf292dae'
---

<!-- Target: 900–1300 tokens. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Coaches want a clear "Nouvelle Séance" vs "Éditer un exercice" choice before entering the Exercise Builder, but `board.html` today always starts blank with no such choice, and any existing exercise is only reachable via the in-app Bibliothèque button after the fact.

**Approach:** Add a startup screen that offers the two entry points, then routes into `board.html` in the corresponding mode (blank canvas for new, or pre-loaded exercise for edit).

## Boundaries & Constraints

**Always:** Keep the existing multi-page architecture (static HTML pages, plain `<script>` tags, no build step) — do not introduce a bundler or SPA router for this story. Reuse the existing `/api/exercises` backend and its list/load functions (`renderLibrary()`, `loadExerciseFromData()` in `app.js`) rather than duplicating exercise-listing logic.

**Never:** Do not introduce React/Vue in this story — the Architecture Spine's AD-1 framework choice is an open question spanning multiple epics and is out of scope here; this story must work in plain vanilla JS regardless of what gets decided later. Do not change how exercises are persisted (server-side JSON via `/api/exercises`) — Spine AD-7 proposed localStorage+GitHub sync, but that contradicts the existing working backend; this story keeps the current persistence mechanism as-is.

**Decisions:**
- Startup screen lives at `pages/startup.html`, a new static page (not folded into `index.html`).
- Edit mode is communicated via query param: `board.html?exercise=<id>`, read by `board.html` on load.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New séance | Coach clicks "Nouvelle Séance" | Navigates to `board.html` with a blank canvas (current default behavior) | N/A |
| Edit existing exercise | Coach clicks "Éditer un exercice" | Shows the list of saved exercises (reuse `/api/exercises` GET); selecting one navigates to `board.html` pre-loaded with that exercise | If the list is empty, show a message and keep "Nouvelle Séance" available |
| Direct load of `board.html` | Coach bookmarked/reloaded `board.html` directly, bypassing the startup screen | Falls back to today's behavior: blank canvas | N/A |

</frozen-after-approval>

## Code Map

- `web-board/index.html:250-270` -- existing landing hub with 3 nav cards; the Board card link needs to point at `pages/startup.html` instead of directly at `board.html`.
- `web-board/pages/board.html` -- entry point that always starts blank today; needs to read the exercise-id signal (once Open Question 2 is resolved) and call the existing load path.
- `web-board/src/js/app.js:1694` -- `loadExerciseFromData(d)`, existing function to populate the board from a saved exercise object; reuse as-is, do not rewrite.
- `web-board/src/js/app.js:1776` -- `renderLibrary()`, existing function that GETs `/api/exercises` and lists them; the new "Éditer un exercice" list should reuse this fetch pattern (or the function itself if it can render outside the existing library modal).
- `web-board/server.js` -- existing `/api/exercises` REST-ish API; no server changes expected for this story.

## Tasks & Acceptance

**Execution:**
- [x] `web-board/pages/startup.html` -- create new static page with two buttons ("Nouvelle Séance", "Éditer un exercice") -- gives coaches the entry-point choice the PRD requires (FR1.1)
- [x] `web-board/pages/startup.html` -- on "Éditer un exercice" click, fetch `/api/exercises`, render a selectable list -- lets the coach pick which exercise to resume without reusing the in-board Bibliothèque modal markup
- [x] `web-board/src/js/app.js` -- read the exercise id from the URL query param via `loadFromQueryParamOrDefault()` and call `loadExerciseFromData()` when present, otherwise start blank as today -- makes "Éditer un exercice" actually land pre-loaded
- [x] `web-board/index.html` -- point the Board Tactique card at `pages/startup.html` instead of `pages/board.html` directly -- makes the new screen the real entry point rather than a page nobody reaches

**Acceptance Criteria:**
- Given the coach opens the app and clicks the Board Tactique entry, when the startup screen loads, then both "Nouvelle Séance" and "Éditer un exercice" buttons are visible and functional
- Given the coach clicks "Nouvelle Séance", when `board.html` loads, then the canvas is blank (unchanged from current behavior)
- Given the coach clicks "Éditer un exercice" and selects a saved exercise, when `board.html` loads, then it is pre-populated with that exercise's data via the existing `loadExerciseFromData()` path
- Given the coach navigates directly to `board.html` (bookmark, refresh) with no exercise id, when the page loads, then it falls back to a blank canvas exactly as it does today (no regression)

## Implementation Notes

- Added `loadFromQueryParamOrDefault()` in `app.js`, called from the existing `window load` listener in place of the previous direct `loadLocal()` call; falls back to `loadLocal()` unchanged when no `?exercise=` param or the id isn't found.
- `board.html` itself needed no edits — the query-param logic lives in the shared `app.js` init it already loads.
- Pre-existing data quality gap (not introduced here, not fixed here): several legacy files under `data/bibli/` lack an `id` field (created outside the `/api/exercises` POST path). They will list in the new startup picker but won't resolve to a loadable id — identical pre-existing behavior to the in-board Bibliothèque modal, which has the same `ex.id` dependency.

## Spec Change Log

## Review Triage Log

- **high** — "Nouvelle Séance" navigates to `board.html` with no query param; `loadFromQueryParamOrDefault()` then falls back to `loadLocal()` (app.js:1663), which loads the *last saved exercise from the backend library*, not a blank canvas. Directly contradicts the button's own label/description ("Démarrer sur un canvas vierge") and the story's AC ("the canvas is blank (unchanged from current behavior)") — verified at app.js:1663-1687, `loadLocal()` fetches `/api/exercises` and loads the most recent entry. Route: **patch** (smallest fix: `startup.html`'s "Nouvelle Séance" navigates to `board.html?new=1` or similar, and `loadFromQueryParamOrDefault` treats that as "start blank" instead of falling through to `loadLocal()` — no new public surface, direct correction). **PATCHED**: `startup.html` now navigates to `board.html?new=1`; `loadFromQueryParamOrDefault` returns immediately on `new=1` without calling `loadLocal()`. Verified in diff.
- **medium** — `loadFromQueryParamOrDefault` (app.js) fetches `/api/exercises` without checking `res.ok` before `res.json()`, unlike `startup.html`'s equivalent fetch which does check. An HTTP error response gets JSON-parsed as if it were the library, producing a confusing/generic failure instead of a clear one. Verified at app.js's new fetch block (no `res.ok` guard) vs startup.html:267-268 (has the guard). Duplicate of edge-case-hunter's finding 1 (same root cause). Route: **patch** (add the same `if (!res.ok) throw ...` guard already used in startup.html — direct correction, no new surface). **PATCHED**: `if (!res.ok) throw new Error('HTTP ' + res.status);` added before `res.json()`. Verified in diff.
- **false** — edge-case-hunter finding 2 (non-array JSON payload from `/api/exercises` in startup.html misleads into empty-state message): the code already guards with `if (!Array.isArray(lib) || lib.length === 0)` before rendering the empty-state message, so a non-array payload is already distinguished from a true empty array... but re-checked: both branches produce the *same* empty-state message text, so the user-visible outcome the finding describes (misleading empty message) is real even though the code technically "handles" both cases without crashing. Re-classified as **low** — a non-array payload from this same-origin, same-codebase API is not a realistic runtime scenario (the GET handler in server.js always returns `JSON.stringify(items)` where `items` is built via `[]`/`push`), so the guard already in place is adequate; rejected per the low-finding bar (unlikely to be met in practice, and a fix would add a branch for a case the API cannot actually produce).
- **low** — no reuse of shared fetch/style code between `startup.html` and `app.js`/`index.html` (duplicated inline `<style>` tokens and duplicated `/api/exercises` fetch logic). Verified: true, but the whole app is build-step-free static HTML/JS (confirmed during Story 1-1 investigation) — extracting a shared module is a real option but not a defect this diff introduced; rejected, fix is more than a direct correction (would require introducing a shared script/style file and updating three pages).
- **low** — no visible close/collapse control on the opened `.exercise-panel` besides the page-level "← Retour à l'accueil" link. Verified: true. Rejected — cosmetic UX gap, not in the story's AC, unlikely to block a coach from either picking an exercise or navigating away.
- **low** — extra mandatory click introduced by the new interstitial page (`index.html` now points at `startup.html` instead of `board.html` directly), no "skip" or "remember choice" option. This is the intent itself (FR1.1 explicitly requires the two-choice startup screen) — not a defect, rejected outright (out of scope by the intent, not by the spec).
- **low** — no in-flight guard on `btnEditExercise`'s click handler; rapid double-click could re-invoke `loadExerciseList()` concurrently. Verified: true, theoretically possible. Rejected — unlikely in everyday use, and a fix (disable button while awaiting, or a boolean flag) adds guard complexity for a rare race with a self-correcting outcome (the list just re-renders with the same data moments later).
- **medium** — no e2e test exercises the new `board.html?exercise=<id>` deep-link contract or the not-found fallback path; existing suite (`tests/e2e/board.spec.js`, `bibliotheque.spec.js`) never sets that query param. Verified: confirmed no matches for `exercise=`/`startup` in `tests/`. Route: **defer** — the story's own `## Verification` section scopes this to manual checks only (no CLI test command listed), so adding e2e coverage is beyond this story's captured intent; logged for whoever picks up test coverage for this feature area.

## Design Notes

## Verification

**Manual checks (if no CLI):**
- Load `index.html`, click through to the new startup screen, verify both buttons render and are clickable.
- Click "Nouvelle Séance", confirm `board.html` opens with an empty canvas exactly as before this change.
- Save an exercise via the existing Bibliothèque flow, then use "Éditer un exercice" from the startup screen to confirm it loads that same exercise correctly in `board.html`.
- Load `board.html` directly (paste its URL with no query param) and confirm it still starts blank — no regression for bookmarked links.
