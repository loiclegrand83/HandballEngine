---
title: 'Sélection type de trajectoire + joueur lié'
type: 'feature'
created: '2026-09-26'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '538b860e3b941479b3b39fd4b1e321b1bbdf1bc7'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD FR4.1 requires trajectories always be linked to a specific placed player. Investigation confirmed this is a genuinely new concept: the existing path infrastructure (`state.paths`, `state.currentPath`, `selectDrawMode`) creates purely geometric paths with no player reference field at all, and the Dock's "Trajectoires" tool is an unwired empty placeholder (same state Players/Assets were in before their respective bridge stories). Trajectory drawing is also currently available unconditionally, with no gate on whether any player exists.

**Approach:** Populate the Dock's "Trajectoires" panel with the 5 trajectory-type buttons (Course, Passe, Tir, Croisé, Fixation), reusing the existing `selectDrawMode()` mode-switching logic. Link a trajectory to a player by making the path's start point be a click ON an existing placed player (using the existing `getItemIndexAt` hit-test from Epic 2) — the player hit at path-start becomes the path's linked player, stored as a new `linkedItemId` field on the path object. If no player exists on the terrain, the Dock's trajectory-type buttons are disabled (mirroring Story 2-1's cap-disabling pattern), since there would be nothing to link to.

## Boundaries & Constraints

**Always:** Reuse `selectDrawMode()` and the existing path-creation/point-pushing logic in the pointerdown/pointermove handlers exactly as they work today for the 5 trajectory modes — this story adds the player-link field and the Dock panel, not a rewrite of path drawing mechanics (Story 4-2's scope). Reuse `getItemIndexAt` (Epic 2) for player hit-testing at path start — do not write a second hit-test.

**Never:** Do not implement the actual drag-to-draw polyline interaction in this story (Story 4-2's scope) — this story is selection (type + player-at-start) only. Do not touch `state.items`/`addItem`/`deleteItemAt` (player/asset placement) — trajectories are additive, read-only with respect to items. Do not allow a trajectory to be created with no linked player — if the coach's first click/drag doesn't land on an existing player, no path should start (per PRD's "no free-floating trajectories" assumption).

**Decision:** The linked player is determined by where the trajectory drawing STARTS — the coach selects a trajectory type via the Dock, then clicks/drags beginning ON a placed player; that player's item id becomes the path's `linkedItemId`. No separate player-picker list UI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Select trajectory type with players present | Coach opens Dock "Trajectoires" panel, at least 1 player is placed | All 5 type buttons (Course, Passe, Tir, Croisé, Fixation) are enabled/selectable | N/A |
| Select trajectory type with NO players placed | Coach opens Dock "Trajectoires" panel, zero players placed anywhere | All 5 type buttons are disabled | N/A |
| Start drawing on a placed player | Coach selects "Course", then pointerdowns on an existing player's position | A new path begins with `linkedItemId` set to that player's `id`; existing path-creation logic proceeds as today | N/A |
| Start drawing on empty terrain (no player under cursor) | Coach selects "Course", then pointerdowns on empty terrain (no player there) | No path is created; no crash; status message clarifies a player must be clicked to start | N/A |
| Last player deleted while a trajectory tool is selected | Coach has "Course" selected, Dock panel open, then deletes the only placed player (Story 2-3's delete) | Dock panel's trajectory buttons become disabled on next render (mirroring Story 2-1's live cap re-check pattern) | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/js/app.js:143-149` -- `selectDrawMode(mode)`, existing mode-switching logic (sets `state.drawMode`, resets `state.currentPath`) — reuse as-is for the 5 trajectory modes, called from the new Dock panel buttons the same way Story 2-1/3-1 called `selectTeam`/`selectAsset`.
- `web-board/src/js/app.js:1294-1334` -- pointerdown/path-creation branch for `course`/`shot`/`pass`/`croise`/`fixation` modes — currently creates `state.currentPath = {id, kind: mode, color, step, points: [pt]}` unconditionally; add a check here (or immediately before) using `getItemIndexAt(pt.x, pt.y)` to require a player hit before creating the path, and set the new `linkedItemId` field on the created path object.
- `web-board/src/js/app.js` -- `getItemIndexAt` (Epic 2, reused as-is) -- the hit-test to determine which player (if any) is under the initial pointerdown position.
- `web-board/src/js/dock.js:119-138` -- `setPanelContent`, currently falls through to the generic placeholder for `toolName === 'trajectories'` — add a `trajectories`-specific branch analogous to Story 2-1's `renderPlayersPanel()`, rendering the 5 type buttons and disabling them when `state.items` has no player entries (live-checked, mirroring `getTeamCounts`'s pattern of reading fresh state each render).
- `web-board/src/js/app.js` -- expose a `window.PlayerSelectionAPI`-style bridge (or extend the existing one) so `dock.js` can call `selectDrawMode()` and read `state.items` for the "any players placed?" check, consistent with the existing cross-file API pattern from Story 2-1.

## Tasks & Acceptance

**Execution:**
- [ ] `web-board/src/js/app.js` -- add a `hasAnyPlayerPlaced()` helper (checks `state.items.some(i => i.team)`) -- gives the Dock panel a simple check for whether trajectory tools should be enabled
- [ ] `web-board/src/js/app.js` -- extend the exposed bridge API (or `window.PlayerSelectionAPI`) with `selectDrawMode` and `hasAnyPlayerPlaced` so `dock.js` can call/read them -- connects the new Dock panel to existing app.js logic without duplicating it
- [ ] `web-board/src/js/dock.js` -- add a `trajectories`-specific case in `setPanelContent` that renders the 5 trajectory-type buttons (Course, Passe, Tir, Croisé, Fixation), disabling all of them when `hasAnyPlayerPlaced()` is false, live-rechecked on each panel render/open (mirroring Story 2-1's cap-disabling approach) -- gives the coach a working type-selection UI
- [ ] `web-board/src/js/app.js` -- in the pointerdown path-creation branch, require `getItemIndexAt(pt.x, pt.y) >= 0` (a player hit) before creating `state.currentPath`; when the requirement fails, do not create a path and show a status message instead -- enforces "no free-floating trajectories"
- [ ] `web-board/src/js/app.js` -- add `linkedItemId: state.items[hitIndex].id` to the created path object -- records which player the trajectory is linked to, for Story 4-2/4-3 and Epic 5's save format to use

**Acceptance Criteria:**
- Given zero players are placed, when the coach opens the Dock "Trajectoires" panel, then all 5 type buttons are disabled
- Given at least one player is placed, when the coach opens the Dock "Trajectoires" panel, then all 5 type buttons are enabled and selectable
- Given "Course" is selected and a player is placed, when the coach pointerdowns on that player's position, then a new path is created with `linkedItemId` set to that player's id
- Given "Course" is selected, when the coach pointerdowns on empty terrain (no player there), then no path is created and no crash occurs
- Given a trajectory tool is selected and the coach deletes the only placed player, when the Dock panel next renders, then the trajectory buttons become disabled

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Manual checks (if no CLI):**
- With zero players placed, open the Dock "Trajectoires" panel and confirm all 5 buttons are disabled.
- Place a player, open the panel, confirm all 5 buttons are now enabled.
- Select "Course", pointerdown directly on the placed player, confirm a path starts (verify via inspecting `state.paths`/`state.currentPath` for the new `linkedItemId` field).
- Select "Course", pointerdown on empty terrain away from any player, confirm no path is created and no console error appears.
- Delete the only placed player while a trajectory type is still selected, reopen the Dock panel, confirm buttons are now disabled.
