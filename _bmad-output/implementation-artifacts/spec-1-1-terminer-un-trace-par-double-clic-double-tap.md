---
title: 'Terminer un tracé par double-clic/double-tap'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ending a trajectory trace (course, tir, passe, croisé, fixation) on the Board currently requires clicking the dedicated `#finishPath` "Terminer traj." button, which breaks the coach's drawing flow on both mouse and tablet.

**Approach:** Detect a double-click (mouse) or double-tap (touch) on the canvas via `pointerdown` timing/distance, and when a trajectory is in progress (`state.currentPath` set), end it the same way the `finishPath` button currently does. Remove the now-redundant `#finishPath` button and its listener. Leave the existing `dblclick`-based asset rotation working when no trajectory is in progress.

</frozen-after-approval>

## Implementation Notes

- `web-board/src/js/app.js`: added a unified double-click/double-tap detector on `pointerdown` (mouse and touch fire the same pointer events on this canvas, so no `pointerType` branching was needed). Tracks `lastPointerDown {time, x, y}` in a module-level variable (kept out of `state` — `state` is partially persisted to the backend and this is transient UI-only data). Threshold: 350ms / 20px. When a double-tap is detected and `state.currentPath` is set, ends the trace exactly like the removed `finishPath` button did (`state.currentPath = null; saveLocal(); render(); setStatus(...)`) and returns before the trajectory-point-adding logic runs, so the second click's point is not added — the trace ends at the last single-clicked point, matching the AC.
- Left the existing `dblclick` listener (asset 90° rotation) untouched — it only fires for `ai >= 0` (an asset was hit) and is independent of `state.currentPath`, so it keeps working for mouse users when not mid-trace. Since the new double-tap detector only acts when `state.currentPath` is truthy, there's no collision: while tracing, double-click/tap always ends the trace; asset rotation via native `dblclick` is unaffected outside of tracing.
- Removed the `#finishPath` button from `web-board/pages/board.html` and its `finishPathButton` reference/listener from `app.js` — no other code referenced it.
- No behavior change to trajectory types, postes, équipements, animation, or the explanation page — confirmed by inspection, nothing else touches `state.currentPath` or the removed button.
- **Review finding fixed:** the first implementation checked for a double-tap at the top of `pointerdown`, before the point was added — this caused a false positive when a user added two path points quickly and close together (the second point would be misread as "finish", silently dropping it instead of extending the trace). Redesigned to let the point-adding logic run first, then, on a confirmed double-tap, pop the just-added duplicate point and finish — mirroring how a native `dblclick` naturally follows two already-processed clicks. Also reset `lastPointerDown` on every `selectDrawMode()` call so a click in one mode can never be misread as half of a double-tap after switching modes.
- **Review finding fixed:** `Documentation-et-Guide.md` §4.5 referenced the removed "Terminer traj." button; updated to describe the double-click/double-tap gesture.

## Review Triage Log

- `Documentation-et-Guide.md:121` still referenced the removed button — verdict: high (docs would mislead users). Fixed.
- Pre-add double-tap check caused false-positive early finish on two fast, nearby path points — verdict: high (breaks core drawing flow). Found during self-check while addressing the reviewer's related "stale reference" note; fixed by moving the check to run after the point add (pop-and-finish) and resetting `lastPointerDown` on mode change.
- "No keyboard/accessibility fallback for ending a trace" — verdict: false. The story's own requirement (epic context, Requirements & Constraints) explicitly says the dedicated button must be removed once double-click/tap replaces it, not left in place; keeping a keyboard path would reintroduce the duplicated mechanism the spec forbids.
- "Double-tap check fires in any draw mode (select/asset), could terminate an unrelated in-progress path" — verdict: false. `selectDrawMode()` always resets `state.currentPath = null` on every mode change, and it's the only place `state.drawMode` is assigned, so `state.currentPath` can never be truthy while in `select`/`asset` mode.
- "`lastPointerDown` staleness could misread a fast triple-click" — verdict: false as stated (it's reset every `pointerdown`), but investigating it surfaced the real pre-add-vs-post-add bug above, which was fixed.
- "`DOUBLE_TAP_DIST` doesn't account for zoom/devicePixelRatio" — verdict: false. The canvas has no zoom/scale transform (`ctx.scale`/`devicePixelRatio` not used anywhere in `app.js`), so canvas pixels are the only relevant unit.
- "`.claude/settings.local.json` bundles unrelated broad permission grants" — verdict: false for this spec. Pre-existing local tooling config, untouched by and unrelated to this change's diff.

