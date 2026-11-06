# Epic 4 Context: Trajectoires Liées aux Joueurs

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The coach draws trajectories (course, passe, tir, croisé, fixation) always linked to a specific placed player — never free-floating — visualized as color-coded lines/arrows showing the player's path or action. This is the last interactive placement epic before Epic 5 (Save); it depends on Epic 2's players existing but not on Epic 3's assets. A coach must be able to place players, then draw trajectories for them, entirely independent of whether any assets are on the terrain.

## Stories

- Story 4-1: Sélection type de trajectoire + joueur lié
- Story 4-2: Dessiner une trajectoire sur le terrain
- Story 4-3: Visualisation codée par couleur/type des trajectoires

## Requirements & Constraints

- Trajectory types: Course (player runs), Passe (player passes), Tir (shot), Croisé (cross), Fixation (fixation) — 5 types total, matching the PRD's FR4.1 exactly.
- A trajectory is ALWAYS linked to a specific already-placed player — no free-floating trajectories unlinked to a player (an explicit PRD assumption). If no player is placed yet, trajectory drawing must be unavailable (not silently broken).
- Selection UI lives in the Dock's "Trajectoires" context, following the same pattern established in Epic 2 (Joueurs) and Epic 3 (Assets): populate the Dock panel with real controls, reusing whatever existing trajectory infrastructure already exists in `app.js`.
- Drawing is click+drag (or multi-click waypoints — verify existing behavior) on the terrain, producing a polyline path associated with the selected player.
- Visualization: color-coded by trajectory type (e.g. blue = course, red = passe), with a clear start point (the linked player) and path/end.
- Multiple trajectories can coexist on the same exercise (e.g. one player's pass + another's run).

## Technical Decisions

- Given the pattern established across Epic 2 (players) and Epic 3 (assets), the Dock's "Trajectoires" tool almost certainly already opens an empty generic panel placeholder (per the original Dock UI v1 investigation: "only 'assets' tool actually renders content... all other tools just open the panel shell with a title") — expect Story 4-1 to be a wiring story similar to Story 2-1/3-1, not a from-scratch build, PENDING investigation to confirm what trajectory-drawing infrastructure already exists in `app.js` (the old sidebar's `#drawModeButtons` had Course/Tir/Passe/Croisé/Fixation buttons visible in early board.html investigation — this is likely the old pre-Dock UI analogous to `#postButtons`/`#assetPalette`).
- No new framework, no build step — same vanilla JS constraint as the rest of the project.
- Reuses the same `state.items`-adjacent pattern where relevant, but trajectories are a structurally different data type (a path/polyline linked to a player id, not a point-placed item) — likely stored in a separate `state.paths` array (mentioned in Epic 2/3 investigations: `state.selectedPathIndex`, `getPathHit`, `state.paths[hit.pathIndex].points` already exist per Story 2-3's investigation of drag/hit-testing).

## Cross-Story Dependencies

- Story 4-1 (selection: type + player) must exist before Story 4-2 (drawing) has a linked player/type to draw for.
- Story 4-3 (color-coded visualization) may already be substantially satisfied by existing rendering, similar to how Epic 2/3's "visual feedback" stories often found existing code already covered most of the requirement — investigate before assuming new rendering work is needed.
- This epic depends on Epic 2 (Players) — a player must be placed before a trajectory can link to it. It does NOT depend on Epic 3 (Assets) — trajectories never link to assets, only players, per the PRD.
- Epic 5 (Save) depends on this epic's trajectory data structure being finalized, since saved exercise data must include trajectories (PRD FR6.2).
