---
title: 'Sélection de la vue terrain (Demi-terrain / Terrain Complet)'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '89b118deb0d3f38eb1fcff9d60acb75c05b1c075'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The PRD (FR5.1) calls for exactly two terrain view options (Demi-terrain / Terrain Complet). The sidebar already has a fully working "Vue" toggle with `full`/`half`/`perspective` modes — `full`/`half` already satisfy FR5.1, but the third `perspective` option is out of scope and its dead surface area (button, coordinate-transform functions, dedicated draw path) should not linger once this story closes it out.

**Approach:** Remove the `perspective` option and its supporting code entirely, keeping the existing `full`/`half` toggle and its working coordinate-transform logic untouched.

## Boundaries & Constraints

**Always:** Keep `selectViewMode`, `updateModeButtons`, the `full`/`half` coordinate-transform math (`fieldToCanvas`/`canvasToField`, the `fw`/`halfOnly` branching in `drawCourt`), and the existing button-click wiring exactly as they are for the two remaining modes. Keep `board.viewMode` defaulting to `'full'`.

**Never:** Do not touch canvas sizing/reflow (`canvas-reflow.js`) — view mode changes coordinate math only, not canvas pixel dimensions, and that separation must not change. Do not remove or rename `data-mode="full"`/`data-mode="half"` — other code may reference these values.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Toggle to Terrain Complet | Coach clicks "Terrain complet" button | `board.viewMode = 'full'`, court redraws full-field, button shows active state | N/A |
| Toggle to Demi-terrain | Coach clicks "Demi-terrain" button | `board.viewMode = 'half'`, court redraws half-field per existing `halfOnly`/`fw` logic, button shows active state | N/A |
| Stale saved exercise with `viewMode: 'perspective'` | An exercise saved before this change is reloaded via `loadExerciseFromData` | `selectViewMode`'s existing validation (mode not in the allowed set falls back to `'full'`) already handles this — verify it still does after `perspective` is removed from the allowed set | Falls back to `'full'`, no crash |

</frozen-after-approval>

## Code Map

- `web-board/pages/board.html:34-45` -- `#viewModeButtons` group with three buttons (`full`/`half`/`perspective`); remove the `data-mode="perspective"` button, keep the other two.
- `web-board/src/js/app.js` -- `selectViewMode(mode)` (validates against `{full,half,perspective}`, defaults to `'full'` otherwise) -- narrow the allowed set to `{full,half}`.
- `web-board/src/js/app.js` -- `fieldToCanvasPerspective`/`canvasToFieldPerspective` (coordinate transforms), `drawCourtPerspective` (dedicated draw path), `sampleArcPerspective` -- dedicated perspective-only functions to remove; confirm no other mode's code path calls into them before deleting.
- `web-board/src/js/app.js:1934-1938` -- `viewModeButtons` click listener reading `button.dataset.mode` -- no change needed, it already works generically off whatever buttons exist in the DOM.

## Tasks & Acceptance

**Execution:**
- [x] `web-board/pages/board.html` -- remove the `<button type="button" data-mode="perspective">Perspective</button>` element from `#viewModeButtons` -- leaves only the two PRD-required options visible
- [x] `web-board/src/js/app.js` -- narrow `selectViewMode`'s valid-mode check from `{full,half,perspective}` to `{full,half}` -- prevents any leftover code path from setting an invalid/removed mode
- [x] `web-board/src/js/app.js` -- remove `fieldToCanvasPerspective`, `canvasToFieldPerspective`, `drawCourtPerspective`, `sampleArcPerspective` and any other perspective-only helper functions, and the perspective branch inside `fieldToCanvas`/`canvasToField`/`drawCourt` that dispatches to them -- eliminates dead code for the removed mode
- [x] Confirm no other file references `viewMode === 'perspective'` or the removed function names -- prevents leaving an unreachable/broken reference behind

**Acceptance Criteria:**
- Given the coach is in Exercise Builder, when they view the "Vue" section, then only "Terrain complet" and "Demi-terrain" buttons are present
- Given the coach clicks "Terrain complet" or "Demi-terrain", when the court redraws, then behavior is identical to before this change (no regression to the working full/half logic)
- Given an exercise saved with `viewMode: 'perspective'` from before this change is loaded, when `selectViewMode` runs, then it falls back to `'full'` without throwing

## Implementation Notes

- Found and removed one perspective code path not listed in the Code Map: `getItemScale(item)` had a `board.viewMode === 'perspective'` branch referencing `PERSP_TOP_SCALE`. Left in place, it would have thrown a `ReferenceError` once `PERSP_TOP_SCALE` was deleted (unreachable after the mode was removed from `selectViewMode`'s valid set, but still live dead code). Simplified to its non-perspective behavior (`return sc.s;`), unchanged for `full`/`half`.
- `getItemScale`'s `item` parameter is now unused after simplification; left as-is (harmless, matches existing unused-param style elsewhere in the file) rather than widen the diff beyond this story's scope.
- 237 lines removed total (perspective coordinate-transform and draw functions, the button, the `PERSP_TOP_SCALE` constant, and the branch above).

## Spec Change Log

## Review Triage Log

- **low** — Blind-hunter: no in-code comment/changelog explaining the perspective removal is intentional. Rejected — the story spec and commit message already document intent; an additional in-code comment would be redundant for a clean deletion with zero remaining references.
- **false** — Blind-hunter: unverified whether `sampleArcPerspective` and other removed functions have zero remaining references. Disproven: edge-case-hunter's repo-wide `grep -rni "perspective"` (independently corroborated) found zero remaining code references anywhere in the tree — only two stale saved-exercise JSON fixtures and two doc files contain the string, none executable.
- **false** — Blind-hunter: no sanitization shown for a persisted `viewMode: 'perspective'` on load, risking a crash if other code assumes only full/half. Disproven: traced the actual load path — `loadExerciseFromData` sets `board.viewMode = d.viewMode || board.viewMode` (app.js:1471) but immediately calls `selectViewMode(board.viewMode)` (app.js:1475), which contains the narrowed `{full,half}` guard and reassigns `board.viewMode` to the safe value before any render occurs. No window exists where an invalid value reaches `drawCourt` or other rendering code.
- **low** — Blind-hunter: no test/doc updates accompany the removal. Rejected — verification-gap independently confirmed no test ever exercised the perspective mode (`tests/e2e/board.spec.js` only touches `data-mode="shot"`), so there is nothing stale to update; adding tests for a removed feature is not in this story's scope.
- **false** — Blind-hunter: possible orphaned blank-line/comment artifacts at the excision boundary. Disproven: checked directly for runs of 3+ consecutive blank lines in `app.js` — none found.

## Verification

**Manual checks (if no CLI):**
- Load `board.html`, confirm the Vue section shows exactly two buttons.
- Click each of the two remaining buttons, confirm the court redraws correctly for both (full field, then half field) with no console errors.
- Search the codebase for `perspective` (case-insensitive) after the change and confirm no remaining references to the removed functions or mode value.
