# Epic 5 Context: Dock-Only Selection, Fixed

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Coach selects players, assets, and trajectory types entirely through the Dock — no desync, no dead clicks, no vanished Gardien, icons that make sense at a glance. This epic fixes 7 QA-confirmed production regressions in an existing Dock-based selection UI without introducing new architecture (pub/sub, event bus) beyond what's strictly needed.

## Stories

- Story 5.1: Gardien is a real poste, correctly capped
- Story 5.2: Poste selection stays active on reclick
- Story 5.3: Dock panel pushes the canvas, never covers it
- Story 5.4: Dock icons are real, recognizable symbols
- Story 5.5: Legacy Sidebar selection controls are removed
- Story 5.6: Dock panels never poll for freshness

## Requirements & Constraints

- Dock is the single source of truth for player/asset/trajectory selection; Sidebar may only show exercise metadata, never duplicate selection controls (except the terrain-view toggle, out of scope here).
- Joueurs panel exposes 7 postes: 6 outfield (AG, ARG, DC, PIV, ARD, AD) + 1 Gardien (G). 6+1 cap per team, outfield and Gardien tracked independently. Any poste selectable any number of times (sticky selection, not a toggle).
- Each placed player shows: poste label, team color, instance number for repeated outfield postes, distinct non-numbered marker for Gardien.
- Assets panel: fixed 10-item list (Plot, Cône, Haie, Cible, Swiss Ball, Coupelle, Cerceau, Mannequin, Mur, Zone), sole selection surface.
- Trajectoires panel: 5 fixed types (Course, Passe, Tir, Croisé, Fixation), sole selection surface.
- Terrain must stay centered/maximized; no panel may obscure the Dock bar or swallow canvas clicks.
- Out of scope (already implemented, do not touch): startup screen, player move/delete, per-asset canvas rendering, trajectory line/color rendering, save/load, terrain-view toggle, all performance/accessibility NFRs.

## Technical Decisions

- **Single mutator principle**: `selectTeam`/`selectPost`/`selectDrawMode`/`selectAsset` are the only functions allowed to mutate `state.selectedTeam`/`selectedPost`/`drawMode`/`selectedAssetIndex`. They must be called exclusively from Dock panel click handlers (`dock.js`), never from a second surface.
- **Deletion, not sync**: the legacy Sidebar selection controls (`#postButtons`, `#teamButtons`, `#drawModeButtons`, `#assetPalette`) and the `window.PlayerSelectionAPI` global that exposes the mutators are deleted entirely — not hidden, not kept in sync. This is what eliminates the desync bug without new event plumbing.
- **Render-on-open freshness**: each Dock panel's `render<Tool>Panel()` reads `state` fresh only on discrete DOM events (panel open/re-open, in-panel click, the existing `itemPlaced` CustomEvent). No `setInterval`/`requestAnimationFrame` polling, ever — this is a hard rule even for future panels, not just the ones built in this epic.
- **Sticky selection**: `selectPost(post)`/`selectTeam(team)` always set the selection unconditionally. No "already selected → clear" branch. No deselect-by-reclick affordance anywhere in the Joueurs panel.
- **Gardien is a poste, not an asset**: move the Gardien entry from `assets[]` (`app.js:65`, `{id: 'G', label: 'Gardien', ...}`) into `HANDBALL_POSTS` as a 7th poste, same placement/cap code path as the 6 outfield postes. Fix the existing `isGoalkeeper` computation (`app.js:1161`) from `post === 'AG'` to `post === 'G'` — this was a real bug: AG is Ailier Gauche (Left Wing), so the cap never fired on an actual Gardien before this fix.
- **Panel layout**: `.panel`'s current `position: fixed` (`panel.css:9`) is removed. The panel becomes a flow/grid sibling of the canvas container — opening it reflows/shrinks the canvas, never floats over it or the Dock bar. The shared grid-template (columns/rows allocating space between Dock, panel, canvas) lives in exactly one file (`panel.css`, extended) — no duplicate layout declarations in `dock.css` or per-panel styles.
- **Dock icons**: vendored static Lucide SVG files (v1.53.0, ISC license) under `web-board/assets/icons/<lucide-name>.svg`, filename matching the Lucide slug exactly. Never a CDN reference (inherited no-network-dependency invariant). Fixed mapping: Joueurs=users, Assets=cone, Trajectoires=route, Animation=play, Bibliothèque=library, Séance=clipboard-list, Planning=calendar, Postes=tag, Vue=layout-grid, Annuler=undo-2. Séance deliberately uses `clipboard-list` (not a calendar variant) to stay visually distinct from Planning's `calendar`.
- Any new/modified server route (unlikely in this epic's scope) must follow the existing CRUD/security pattern: id validation, path containment, body size cap, security headers.

## Cross-Story Dependencies

- Story 5.1 (Gardien poste) and 5.2 (sticky selection) are independent of each other and of 5.3/5.4 — any order works, but 5.1 is a good first pick since it's a self-contained bug fix with no UI-layout coupling.
- Story 5.5 (Sidebar removal) should come after 5.1–5.4 are in place, since it removes the old UI path those stories' replacements must already cover — doing it first would leave no working selection UI mid-epic.
- Story 5.6 (no-polling rule) is a verification/guard story best done last, after 5.1–5.5 land, since it checks that the final panel implementations don't violate the render-on-open rule.
