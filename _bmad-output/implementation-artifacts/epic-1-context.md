# Epic 1 Context: Board — Ergonomie & Nettoyage

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic removes two sources of friction from the Board editor's daily use. First, ending a trajectory trace (course, tir, passe, croisé, fixation) currently requires an explicit click on a dedicated "Terminer traj." button, which breaks the coach's drawing flow — a double-click (mouse) or double-tap (tablet) should end the trace instead, with no extra step. Second, the Temps mort module (half-time tactical board) is not part of this product's direction and must be fully removed — not hidden or disabled — from the home screen, navigation, and the repository itself, so it doesn't linger as dead code or reappear by mistake.

## Stories

- Story 1.1: Terminer un tracé par double-clic/double-tap
- Story 1.2: Suppression du module Temps mort

## Requirements & Constraints

- Ending a trajectory: double-click/double-tap must close the trace at the last single-clicked point before the double action, with no confirmation button. Must behave identically across the 5 trajectory types and across mouse (PC) and touch (Android tablet/Chromebook).
- The dedicated "end trajectory" button is removed from the UI once double-click/double-tap replaces it — don't leave both mechanisms active/duplicated.
- Temps mort removal is a full deletion: no home-screen card/link, no navigation entry pointing to the module, and its dedicated files deleted from the repo (not commented out or feature-flagged).
- No other Board behavior changes — trajectory types, postes, équipements, phase animation, colored halo, and the auto-generated exercise explanation page are all unaffected and must keep working.
- General app constraint applicable here: no network dependency — nothing this epic touches may load any resource from a non-localhost origin.

## Technical Decisions

- No new architecture decision record governs FR-1 (double-click end-of-trace); it's a board-local UX change contained to `web-board/pages/board.html` and `web-board/src/js/app.js`.
- FR-2 (Temps mort removal) is governed by AD-6, adopted: delete `pages/timeout.html`, its dedicated JS/CSS, and its card on `index.html`. Do not feature-flag or comment out.
- Relevant existing code (read, not modified by this doc):
  - `web-board/pages/board.html:55` — the `#finishPath` "Terminer traj." button to be removed.
  - `web-board/src/js/app.js:1506` — existing `pointerup` handler on the canvas (trace/drawing interaction).
  - `web-board/src/js/app.js:1566` — existing `dblclick` listener on the canvas; likely the point to extend/verify for both mouse and touch (double-tap) trace termination.
  - `web-board/pages/timeout.html`, `web-board/src/js/timeout.js`, and its dedicated CSS — to be deleted entirely.
  - `web-board/index.html:165,272` — `.card--timeout` style block and the `<a class="card card--timeout" href="pages/timeout.html">` link on the landing page — to be removed.
- Double-tap on touch devices needs its own handling since `dblclick` is a mouse-oriented DOM event; verify it fires reliably on the target tablets (Android/Chromebook) or implement an equivalent touch-based double-tap detection alongside the existing `dblclick` listener.

## UX & Interaction Patterns

- The interaction goal is "draw without hunting for a button": double-click/double-tap during an in-progress trace ends it at the last single-click point, mirroring common canvas-drawing conventions (e.g., polygon tools).
- This must feel identical whether the coach is on a mouse (PC) or touchscreen (tablet) — no divergent behavior or extra steps on either input method.
