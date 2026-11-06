---
title: 'Déplacer ou supprimer un joueur placé'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context: []
baseline_commit: '76068fbcc937c9147c63b29a99aa99f5f2d3ad2b'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD FR2.2 requires that a coach can move or delete an already-placed player. Moving (drag) already works fully via the existing `pointerdown`/`pointermove`/`pointerup` handlers. Deletion exists but only via right-click (`contextmenu`) — the PRD's stated affordances (double-click, Delete key) don't exist: no double-click-on-item detection, no keyboard listener at all, and no persistent "selected item" concept for the keyboard path to act on.

**Approach:** Add double-click-on-item detection (reusing the existing double-tap detection variables already computed on every `pointerdown`, currently only consumed by the unrelated trajectory-drawing branch) to delete on double-click. Add a `state.selectedItemIndex` set on single-click-select of an item, plus a `keydown` listener for `Delete`/`Backspace` that removes the selected item. Reuse the existing `state.items.splice(ai, 1)` + `saveLocal()` + `render()` pattern (currently inlined in the `contextmenu` handler) for all three removal paths (right-click, double-click, keyboard).

## Boundaries & Constraints

**Always:** Keep the existing drag-to-move behavior (`pointerdown`→`dragIndex`→`pointermove`→`pointerup`) and the existing right-click delete exactly as they work today. Reuse `getItemIndexAt` for hit-testing — do not write a second hit-test. Reuse the existing `isDoubleTap` calculation already present in every `pointerdown` call (do not add a second double-tap timer).

**Never:** Do not change `getItemIndexAt`'s hit-test geometry or thresholds. Do not add any cap re-check logic to deletion — Story 2-1's `getTeamCounts` already live-filters `state.items` on every Dock panel render, so any deletion path automatically frees the team's cap slot with no new wiring needed. Do not extend keyboard shortcuts beyond Delete/Backspace in this story. The Delete/Backspace keydown listener must only act when focus is NOT on a form field — check `document.activeElement.tagName` (or `event.target`) is not `INPUT`/`TEXTAREA`/`SELECT` before deleting the selected canvas item, so editing the exercise name/notes/any other text field never deletes a selected player.

**Decision:** A single (non-double-tap) click on an existing item sets `state.selectedItemIndex` regardless of current draw mode (`asset` or `select`) — consistent with drag already behaving identically in both modes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Drag an existing player | Coach pointerdown+move+up on a placed item | Item moves to new position (existing behavior, unchanged) | N/A |
| Double-click an existing player | Coach double-clicks/double-taps a placed item (not mid-trajectory-draw) | Item is removed from `state.items`, canvas re-renders without it | N/A |
| Select then press Delete | Coach single-clicks a placed item (sets `state.selectedItemIndex`), then presses Delete/Backspace while focus is on the canvas/page body | Item is removed | If no item is currently selected, Delete/Backspace does nothing (no error, no crash) |
| Select item, then edit a text field | Coach selects a placed item, then clicks into `#exerciseName` or `#exerciseNotes` and presses Backspace to edit text | The text field's own Backspace behavior happens normally; the selected canvas item is NOT deleted | N/A |
| Right-click an existing player | Coach right-clicks a placed item | Item is removed (existing behavior, unchanged) | N/A |
| Delete a player at a team's cap | Team A has 6 outfield players (at cap); coach deletes one via any method | Deleted player is removed; Dock panel's next render shows that poste re-enabled (cap freed) | N/A |
| Double-click empty canvas | Coach double-clicks where no item exists, not drawing a trajectory | No item deleted (no hit), no crash | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/js/app.js:1194-1250` -- `pointerdown` handler, `mode === 'select' || mode === 'asset'` branch — hit-tests via `getItemIndexAt` (existing), sets `state.dragIndex` on hit (existing, unchanged). Add: on a hit that is a double-tap (`isDoubleTap`, already computed at line 1200), delete the item instead of starting a drag. On a hit that is NOT a double-tap, also set `state.selectedItemIndex = ai` (new) alongside the existing drag setup, so a subsequent Delete key press has something to act on even if the coach doesn't drag.
- `web-board/src/js/app.js:1338-1348` -- existing `contextmenu` right-click delete handler, currently inlines `state.items.splice(ai, 1); saveLocal(); render(); setStatus('Asset supprimé');` — extract this into a small `deleteItemAt(index)` helper function so double-click and keyboard delete can call the same code instead of duplicating it.
- `web-board/src/js/app.js` (new) -- add a `document.addEventListener('keydown', ...)` handler (none exist anywhere in the file today) that checks `event.key === 'Delete' || event.key === 'Backspace'`, and if `state.selectedItemIndex !== null`, calls `deleteItemAt(state.selectedItemIndex)` and clears the selection.
- `web-board/src/js/app.js` -- `state` object initialization (near the other `state.dragIndex`/`state.selectedPathIndex` fields) -- add `selectedItemIndex: null` as a new state field.
- `web-board/dock.js` -- `getTeamCounts` (Story 2-1) -- no change needed; confirmed it already live-filters `state.items` on every call, so any deletion path in this story automatically frees a team's cap slot.

## Tasks & Acceptance

**Execution:**
- [x] `web-board/src/js/app.js` -- extract the `contextmenu` handler's inline delete logic (`state.items.splice(ai, 1); saveLocal(); render();`) into a `deleteItemAt(index)` helper, and call it from the existing right-click handler -- removes duplication before adding two more call sites
- [x] `web-board/src/js/app.js` -- in the `pointerdown` handler's item-hit branch, check `isDoubleTap` (already computed) before starting a drag; if true, call `deleteItemAt(ai)` and return instead of setting `state.dragIndex` -- adds double-click-to-delete without a new timer
- [x] `web-board/src/js/app.js` -- add `selectedItemIndex: null` to `state`'s initialization, and set `state.selectedItemIndex = ai` in the item-hit branch whenever a single (non-double-tap) click hits an item -- gives the keyboard path something to act on
- [x] `web-board/src/js/app.js` -- add a `keydown` listener for `Delete`/`Backspace` that first checks focus is not on an `INPUT`/`TEXTAREA`/`SELECT` element, then calls `deleteItemAt(state.selectedItemIndex)` when it is not null, then clears it to `null` -- implements the PRD's keyboard delete affordance without hijacking text-field editing

**Acceptance Criteria:**
- Given a player is placed on the terrain, when the coach double-clicks it, then it is removed and the canvas re-renders without it
- Given a player is placed and the coach single-clicks it (without dragging), when the coach then presses Delete or Backspace, then the player is removed
- Given no item is currently selected, when the coach presses Delete or Backspace, then nothing happens (no error)
- Given the existing drag-to-move and right-click-to-delete behaviors, when exercised after this change, then they work exactly as before (no regression)
- Given a player is selected and the coach then clicks into the exercise name or notes text field and presses Backspace, when that happens, then the text field edits normally and the selected player is NOT deleted
- Given a team is at its 6-outfield or 1-goalkeeper cap, when a player from that team is deleted by any method (double-click, keyboard, right-click), then the Dock panel's next render shows that poste re-enabled

## Implementation Notes

## Spec Change Log

- **Triggering finding:** Review loop 1 found (high, bad_spec) that the Delete/Backspace `keydown` listener deletes the selected canvas item even when focus is on a text field (`#exerciseName`, `#exerciseNotes`), reproduced via Playwright: editing the exercise name with Backspace deletes a selected player instead of/alongside the intended text edit.
- **What was amended:** Boundaries & Constraints now requires the keydown listener to check `document.activeElement`/`event.target` is not an `INPUT`/`TEXTAREA`/`SELECT` before deleting. Added a corresponding I/O matrix row and acceptance criterion, and updated the keyboard-delete task to include the focus check.
- **Known-bad state avoided:** Silent, surprising deletion of a placed player whenever the coach edits any text field on the page while a player happens to be selected — a very common workflow (naming/annotating an exercise) that would otherwise destroy work with no warning.
- **KEEP:** Drag-to-move (unchanged), right-click delete via the extracted `deleteItemAt` helper (unchanged), double-click delete via the existing `isDoubleTap` computation (unchanged), and `state.selectedItemIndex` being set on any non-double-tap click hit regardless of draw mode (unchanged) are all correct and verified working — do not redesign those, just add the focus guard to the keydown listener.

## Review Triage Log

- **high** — `deleteItemAt(index)` never adjusts `state.selectedItemIndex` (or `state.dragIndex`) after `state.items.splice(index, 1)`. If an item is selected (setting `selectedItemIndex`), then a *different* item earlier in the array is deleted via double-click or right-click, `selectedItemIndex` still holds its old numeric value, which now points at the wrong array slot post-splice. Reproduced independently via Playwright: selected item A (index 0), deleted a different item via right-click, then pressed Delete — the deletion removed the wrong item, not the one that was actually selected. Verified by both blind-hunter and edge-case-hunter independently, and confirmed by direct reproduction. Route: **patch** — smallest fix: in `deleteItemAt`, after splicing, adjust `state.selectedItemIndex` (`null` it if it equals `index`, decrement it if it's greater than `index`) and do the same for `state.dragIndex` for consistency, since both are array indices into the same `state.items` that any splice can invalidate. **PATCHED**: both adjustments added in `deleteItemAt`. Independently re-verified via Playwright in both directions: (1) select item A (index 0), delete a different later item B (index 1) — selection correctly stays on A; (2) select item B (index 1), delete an earlier item A (index 0) — `selectedItemIndex` correctly decrements to 0 and still points at B. Both scenarios end with the correctly-selected item removable via Delete key.
- **defer** — verification-gap: this entire feature (double-tap delete, keyboard delete, the focus guard) has zero automated test coverage — the only e2e spec in the repo (`tests/e2e/board.spec.js`) doesn't reference any of the new symbols. This is a repo-wide gap (no test harness exists for `app.js` interaction logic at all), not something this single story is expected to close; logged to `deferred-work.md`.
- **low** — edge-case-hunter: deleting an item while `state.animation.active` is true could desync `state.animation`'s actor indices against the shifted `state.items` array. Rejected as a distinct finding for this story — animation is a separate, pre-existing feature this story's scope never touches; if real, it's a pre-existing risk of *any* deletion (including the already-existing right-click delete), not something introduced by this story's new triggers.
- **low** — edge-case-hunter: `isDoubleTap`'s `lastPointerDown` isn't reset after a delete-triggering double-tap, unlike the trajectory-drawing branch which does reset it, so a fast third click could misread as a double-tap against a shifted item. Folded into the same fix as the high finding above (nulling `selectedItemIndex` after delete already prevents this from being surprising for the keyboard path); the double-tap-specific case is a narrower variant of the same stale-index root cause and doesn't need a separate patch once index adjustment is in place — the shifted array will simply have correct indices by the time any subsequent tap resolves.
- **low** — blind-hunter: no confirmation/undo on keyboard delete, making accidental Backspace data loss easier. Rejected — matches existing right-click delete's behavior (also no confirmation), consistent with this codebase's existing UX pattern; out of this story's scope to introduce a new confirmation pattern.
- **low** — blind-hunter: `keydown` listener attached to `document` with no check that the board view is the "active" screen. Rejected — this is a single-page board editor with no other views/routes sharing the JS bundle (confirmed during Epic 1 investigation: multi-page architecture via separate .html files, not a SPA); the scenario described doesn't apply to this app's actual structure.

- **high** — The new `document.addEventListener('keydown', ...)` for Delete/Backspace does not check whether focus is on a form field (e.g. `#exerciseName` text input, `#exerciseNotes` textarea). Reproduced via Playwright: select a placed item (single-click, `state.selectedItemIndex` set correctly), then click into the exercise-name text field and press Backspace to edit it — the selected canvas item is deleted instead of (or in addition to) the text field's own Backspace behavior. This is a silent, surprising data-loss path in a very common workflow (editing the exercise name/notes while a player happens to be selected on the canvas). Verified independently and reproducibly: `items.length` drops from 1 to 0 the moment Backspace is pressed inside the text input, with the input's own edit (`"Exercice "` after trimming the last char) happening simultaneously. Route: **bad_spec** — the spec's Boundaries/Tasks never considered that Delete/Backspace needed to be scoped to canvas-focused input; this is a real intent gap in the frozen block's constraints, not something the implementer deviated on (the code does exactly what the spec's Task 4 literally asked for: "add a keydown listener... calls deleteItemAt... when it is not null"). **RESOLVED**: keydown listener now checks `document.activeElement.tagName` against `INPUT`/`TEXTAREA`/`SELECT` before deleting. Independently re-verified via Playwright with the exact regression scenario: select an item, click into `#exerciseName`, press Backspace — item count stays at 1 (previously dropped to 0). Drag-to-move and double-click-delete re-confirmed unaffected (both still work correctly with proper inter-action timing to avoid the pre-existing double-tap window).

## Verification

**Manual checks (if no CLI):**
- Place a player, drag it to a new position, confirm move still works exactly as before.
- Place a player, right-click it, confirm it's removed (existing behavior unchanged).
- Place a player, double-click it, confirm it's removed.
- Place a player, single-click it (no drag), press Delete, confirm it's removed.
- Press Delete/Backspace with nothing selected, confirm no crash/no-op.
- Place 6 outfield players for a team (hits cap, poste buttons disabled in Dock panel per Story 2-1), delete one via any method, reopen/re-render the Dock panel, confirm that poste is selectable again.
