# Epic 1 Context: Exercise Builder — Fondations & Configuration Terrain

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The coach starts a new séance or resumes editing an existing exercise, lands in Exercise Builder mode with the always-visible Dock (bottom) + Sidebar (left) + centered canvas already in place, and configures the court view (half-court or full-court). This epic delivers the empty shell every later epic (players, assets, trajectories, save) builds on top of — it must work standalone even though nothing can be placed on the terrain yet.

## Stories

- Story 1-1: Écran de démarrage — Nouvelle Séance ou Éditer un exercice
- Story 1-2: Mode Exercise Builder — Layout Dock/Sidebar/Canvas
- Story 1-3: Sélection de la vue terrain (Demi-terrain / Terrain Complet)

## Requirements & Constraints

- Startup screen offers exactly two entry points: start a blank séance, or load an existing exercise from the coach's collection for editing.
- Exercise Builder mode always shows: a header (exercise name + séance context), the Dock, the Sidebar, the centered canvas, and a visible Save button.
- Court view is a per-session choice between half-court and full-court; both must render without requiring scroll.
- The canvas must stay centered and fully visible — Dock and Sidebar are never allowed to obscure it.
- Touch targets ≥44px; must work on a 1024×600px tablet with no horizontal scroll.
- No backend: everything in this epic is UI/state shell, no persistence logic yet (that's Epic 5).

## Technical Decisions

- Framework is React or Vue (final pick happens at implementation time; either is compatible with everything below).
- Layout is CSS Grid: `grid-template-columns: [sidebar-width] 1fr; grid-template-rows: 1fr 64px; grid-template-areas: "sidebar canvas" "dock dock"`. Dock is fixed 64px height; Sidebar is responsive (120px tablet, 180–220px desktop).
- The canvas element renders the static terrain (lines/zones) once; it is not redrawn on every interaction — that only starts to matter from Epic 2 onward, but the container structure (canvas + an absolutely-positioned overlay div on top, `pointer-events: none` on the container, `pointer-events: auto` on individual overlay children) should be established now so later epics don't have to re-plumb the layout.
- Dock has a single "Exercice Builder" control that opens a dropdown with three context options: Joueurs / Assets / Trajectoires. This epic doesn't need the dropdown to do anything yet (no selection logic exists until Epic 2/3/4), but the Dock shell and dropdown UI belong here since they're part of the always-visible chrome.
- No undo/redo, no collaborative editing — out of scope for the whole feature, not just this epic.

## Cross-Story Dependencies

- Story 1-2 (layout shell) depends on Story 1-1 only in the sense that the startup screen is what routes into it; 1-2 can be built and visually verified independently by navigating directly into Exercise Builder mode.
- Story 1-3 (terrain view toggle) depends on the canvas area existing from Story 1-2, but not on any player/asset/trajectory logic from later epics.
- Epics 2–5 all assume this epic's Dock/Sidebar/Canvas shell exists; they do not modify this epic's layout, only add content inside it.
