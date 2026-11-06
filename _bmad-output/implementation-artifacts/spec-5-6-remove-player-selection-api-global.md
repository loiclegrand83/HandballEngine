---
title: 'Remove window.PlayerSelectionAPI global, call app.js functions directly'
type: 'refactor'
created: '2026-10-09'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `window.PlayerSelectionAPI = { selectTeam, selectPost, selectDrawMode, hasAnyPlayerPlaced, getState }` exposes `app.js`'s selection mutators as a mutable global object. Any future code could call through it to mutate `state.selectedTeam`/`selectedPost`/`drawMode` from a third location, reopening the exact two-mutator desync bug Story 5.5 just eliminated by deleting the legacy Sidebar.

**Approach:** Delete `window.PlayerSelectionAPI` entirely. `dock.js` calls `app.js`'s functions directly instead — confirmed both files are plain classic `<script src>` tags (no modules), loaded in order `app.js` → `canvas-reflow.js` → `dock.js`, so `app.js`'s top-level `function` declarations (`selectTeam`, `selectPost`, `selectDrawMode`, `hasAnyPlayerPlaced`) are already `window` properties by standard JS scoping — callable as `window.selectTeam(...)` etc. with zero new code in `app.js`. `app.js`'s top-level `const state = {...}` is not a `window` property (only `var`/function declarations attach), but it's still a bare identifier visible to `dock.js` in the same shared global script scope — `dock.js` can reference `state` directly by name, no `window.` prefix.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Select team via Dock | Coach clicks "Équipe B" in Joueurs panel | `window.selectTeam('B')` called directly, `state.selectedTeam` updates, panel re-renders correctly | N/A |
| Select poste via Dock | Coach clicks a poste button | `window.selectPost(...)` called directly, works identically to before | N/A |
| Select trajectory type via Dock | Coach clicks a trajectory type | `window.selectDrawMode(...)` called directly, works identically to before | N/A |
| Open Trajectoires panel, no player placed | Coach opens the panel | `window.hasAnyPlayerPlaced()` called directly, buttons correctly disabled | N/A |
| Open Joueurs panel | Coach opens the panel | Panel reads `state` directly (bare identifier, not `api.getState()`), team/poste selection displays correctly | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/js/app.js` (search `window.PlayerSelectionAPI`) -- delete the entire `window.PlayerSelectionAPI = {...}` assignment
- `web-board/src/js/dock.js:152-155` -- `getTeamCounts(team)`: `const api = window.PlayerSelectionAPI; const state = api ? api.getState() : null;` -- replace with direct reference to the global `state` (no `api`/local `state` shadow needed); the function's existing null-safety (`Array.isArray(state.items)`) already handles `state` being present but `items` possibly not, so the `?.`-style guard collapses to just using `state` directly since it's now guaranteed to exist (same script scope, defined before `dock.js` runs)
- `web-board/src/js/dock.js:171-174` -- `renderPlayersPanel()`: same `api`/local-`state` pattern -- replace with direct `state` reference
- `web-board/src/js/dock.js:209-211` -- `renderTrajectoriesPanel()`: `api.hasAnyPlayerPlaced()` and `api.getState()` -- replace with `window.hasAnyPlayerPlaced()` (or bare `hasAnyPlayerPlaced()`) and direct `state` reference
- `web-board/src/js/dock.js:237,242` -- `handleTrajectoriesPanelClick(e)`: `const api = window.PlayerSelectionAPI; if (!api) return; ... api.selectDrawMode(...)` -- replace with direct `window.selectDrawMode(...)` call; the `if (!api) return` guard becomes unnecessary since the function is now a plain global reference, not an optional object property (verify at implementation: if removing the guard entirely feels too aggressive, keep a minimal `if (typeof selectDrawMode !== 'function') return;` -- but prefer removing it, since `app.js` loads before `dock.js` and this guard only existed to handle the `PlayerSelectionAPI` object possibly not being assigned yet, a condition that no longer applies to a plain function declaration)
- `web-board/src/js/dock.js:249-251,265` -- `handlePlayersPanelClick(e)`: same `api` pattern for `selectTeam`/`selectPost` -- replace with direct calls

## Tasks & Acceptance

**Execution:**
- [ ] `web-board/src/js/app.js` -- delete the `window.PlayerSelectionAPI` assignment -- removes the bypass-surface global object
- [ ] `web-board/src/js/dock.js` -- replace all 5 `const api = window.PlayerSelectionAPI` sites with direct calls to `window.selectTeam`/`window.selectPost`/`window.selectDrawMode`/`window.hasAnyPlayerPlaced` and direct references to the bare `state` identifier -- `dock.js` depends on nothing but the standard global scope all non-module scripts share

**Acceptance Criteria:**
- Given `window.PlayerSelectionAPI` is removed, when I search `app.js` for its declaration, then it does not exist
- Given the Dock's Joueurs/Trajectoires panels are exercised (team, poste, trajectory-type selection), when each action runs, then it works identically to before this story with zero console errors
- Given I search `dock.js`, when I grep for `PlayerSelectionAPI`, then no reference remains

## Implementation Notes

Both planned tasks applied as Code Map specified, with one simplification: instead of removing the local `state`/`api` variable pattern entirely from each function, kept the local `state`-style usage but pointed directly at the bare global `state` identifier (no `const state = ...` shadow declaration needed at all, since `state` from `app.js` is already visible by name in `dock.js`'s scope). The `if (!api) return` guards were removed as planned — they only existed to handle `PlayerSelectionAPI` possibly not being assigned yet, a condition that doesn't apply to plain global function declarations already defined before `dock.js` runs.

Verified via Playwright: zero console errors across page load and the full Dock flow (Joueurs: team + poste + placement, Assets: select + place, Trajectoires: type selection + draw with a placed player, Animation button) — same regression suite as Story 5.5, all still passing after this refactor.

Review found a real documentation gap: removing `PlayerSelectionAPI` also removed the only explicit signal that `dock.js` depends on `app.js`'s globals and their load order. Patched with two short comments (one near `app.js`'s selection functions, one at the top of `dock.js`'s IIFE) documenting the dependency and load-order requirement, so a future refactor (e.g. wrapping `app.js` in a module) won't silently break `dock.js` with no compile-time signal.

## Verification

**Manual checks (if no CLI):**
- Load the board, open browser devtools console
- Exercise Joueurs panel (team + poste), Trajectoires panel (type selection, with/without a placed player) — confirm all work with zero console errors
- `grep -rn "PlayerSelectionAPI" web-board/src/js/` -- expect zero matches

## Review Triage Log

- **low, patch** — removing `PlayerSelectionAPI` also removed the only explicit marker documenting that `dock.js` depends on `app.js`'s globals (`state`, `selectTeam`, `selectPost`, `selectDrawMode`, `hasAnyPlayerPlaced`) and their load order. Confirmed real: a future refactor (module conversion, IIFE wrapping) would silently break `dock.js` with no compile-time signal. Patched: added a short comment near the relevant `app.js` functions and at the top of `dock.js`'s IIFE documenting the dependency and required load order.
- **false** — removing the `if (!api) return` guards flagged as a fail-silent-to-fail-loud behavioral change worth documenting. Verified: the guards only ever protected against `PlayerSelectionAPI` not being assigned yet — a condition specific to that object pattern, not a general app.js-failed-to-load scenario (script tags execute in document order unconditionally; if app.js threw a syntax error, the whole page would already be broken regardless of this guard). Not a meaningful present risk; no action taken.
- **false** — dropped `'A'`/`null`/`false` fallback defaults (e.g. `state ? state.selectedTeam : 'A'` → `state.selectedTeam`) flagged as a robustness loss. Confirmed `state.selectedTeam` is already initialized to `'A'` in the state object literal (`app.js:76`) at module-load time, before any Dock panel can possibly render (panels only render on user click, which can't happen before both scripts finish loading) — the removed ternaries were dead defensive code duplicating an invariant that already held, not a genuine safety net.
- **low, rejected** — no test/regression check mentioned for the cross-file refactor. Addressed: the same Playwright regression suite from Story 5.5 (page load, Joueurs/Assets/Trajectoires flows, Animation) was re-run after this change and confirmed zero console errors — already covered, just not yet logged at review time.
