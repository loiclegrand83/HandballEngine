# Epic 3 Context: Placement des Assets

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The coach selects an asset type (plots, cones, haies, targets, etc.) via the Dock's "Assets" context and places it freely on the terrain to define drills and delimitations — the same click-to-place interaction pattern already proven for players in Epic 2, but for non-player equipment. Each placed asset shows a distinct icon and an on-hover label. This epic is independent of Epic 2 (Players) and Epic 4 (Trajectories) — a coach can build an exercise using only assets, only players, or both, in any order.

## Stories

- Story 3-1: Sélection d'un type d'asset
- Story 3-2: Placement d'un asset sur le terrain
- Story 3-3: Feedback visuel des assets (icône, label au survol)

## Requirements & Constraints

- Asset types (from the PRD's predefined list): Plots, Cônes, Haies, Cibles, Swiss Balls, Coupelles, Cerceaux, Échelles, Mannequins, Murs, Zones — a fixed, predefined library; no custom asset creation in v1.
- Placement is click-to-place: select an asset type, then click the terrain; each click places one instance at that spot. Repeatable placement of the same asset type is expected (e.g. 5 plots in a line) — no cap, no uniqueness restriction (unlike players, which have Epic 2's 6+1 team cap).
- Each placed asset shows an icon/symbol distinguishing its type (e.g. plot = circle, cone = triangle) and an optional hover label naming the type.
- No move/delete story exists yet for assets in this epic's scope (Epic 2's Story 2-3 covered player move/delete specifically) — investigate during Story 3-1/3-2 whether the existing generic item infrastructure (shared by players and other assets, per Epic 1/2 investigation) already gives assets the same move/right-click-delete behavior "for free," since `addItem`/`getItemIndexAt`/`deleteItemAt` operate on `state.items` generically, not just player items.

## Technical Decisions

- Reuses the same Hybrid Rendering paradigm as players: assets are entries in the same `state.items` array as players, drawn via the same canvas rendering pipeline (`drawItems`/`drawShape`) — not a separate asset-specific data structure or rendering path, unless investigation finds otherwise.
- The Dock's "Assets" context needs the same treatment as "Joueurs" got in Story 2-1: populate the Dock panel's asset-tool branch with real selection UI (asset type buttons), reusing whatever existing asset-selection state/logic already exists in `app.js` (there was pre-existing "Haies" palette functionality mentioned in early board.html investigation — `#assetPalette` in the old bottom-controls — verify what's already wired vs what the Dock panel needs to add).
- No new framework, no build step — same vanilla JS constraint as the rest of the project.
- No cap/count logic for assets (unlike Story 2-1's player cap) — the PRD does not mention any limit on asset placement.

## Cross-Story Dependencies

- Story 3-1 (selection) must exist before Story 3-2 (placement) has anything to place, mirroring Epic 2's 2-1→2-2 relationship.
- Story 3-3 (visual feedback) can largely piggyback on whatever rendering already exists for generic items (assets may already render with a shape/icon today, similar to how Epic 2 discovered players already had color/label rendering before Story 2-4 was scoped) — investigate before assuming net-new rendering work is needed.
- This epic does not depend on Epic 2 or Epic 4 — assets can be placed on a completely empty terrain with no players present.
- Epic 4 (Trajectories) does not depend on assets existing — trajectories link to players only, per the PRD (FR4.1: "Coach selects a trajectory type + a player").
