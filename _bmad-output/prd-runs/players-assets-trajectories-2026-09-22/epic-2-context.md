# Epic 2 Context: Placement des Joueurs

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The coach selects a team (A/B) and a poste (position), then clicks the terrain to place that player — repeatable freely, with no forced standard formation (e.g. 2 pivots and no demi is valid). Placed players show a clear label, team color, and a position number when a poste repeats. Coaches can also move or delete a placed player. This is the core interaction the whole feature exists for — the ability to build a custom formation quickly replaces today's rigid templates.

## Stories

- Story 2-1: Sélection Équipe + Poste
- Story 2-2: Placement d'un joueur sur le terrain
- Story 2-3: Déplacer ou supprimer un joueur placé
- Story 2-4: Feedback visuel des joueurs (label, couleur, numéro)

## Requirements & Constraints

- Team selection is binary: Équipe A or Équipe B.
- Poste list: AG, ARG, DC, PIV, ARD, AD, Demi — no restriction on which postes can be picked or how many times.
- Hard cap: 6 outfield players + 1 goalkeeper per team (7 per side, 14 total) — enforced in the UI (e.g. disable further selection once a team hits its cap), not just documented.
- No "standard formation" is enforced — a coach can place 2 pivots and skip the demi entirely; this is a deliberate product decision, not an oversight.
- Placement is click-to-place: select équipe+poste first, then click the terrain; each click places one player at that spot.
- Click response must feel instant (<100ms) — this is a stated performance target from the PRD.
- Placed players must be clickable again afterward, to support move and delete — this needs each placed player to be a distinct, individually-addressable element (not baked into a single canvas draw call).
- Visual requirements: poste label visible on each player, team color distinguishes A vs B, and when a poste repeats (e.g. two pivots), each instance shows a position number (e.g. "PIV 1", "PIV 2").

## Technical Decisions

- Players render as an HTML overlay on top of the static terrain canvas, not drawn into the canvas itself — this is the standing rendering paradigm for the whole feature (Players/Assets/Trajectories), chosen specifically so individual elements can be clicked, moved, and deleted without hit-testing math against canvas pixels.
- Canvas pixel coordinates and overlay HTML positions share the same coordinate space (1:1 mapping via the canvas's bounding rect) — clicking the terrain at (x, y) places the overlay element centered at that same (x, y).
- The existing Dock (bottom) + Sidebar (left) + centered Canvas grid layout from Epic 1 is the fixed shell this epic builds inside — do not modify `.app-shell`'s grid structure; only add content into the sidebar/dock's existing dropdown-triggered panel area for the "Joueurs" context.
- The Dock's tool icons (`data-tool="players"` among others) already exist and already open a shared `#panel` element on click — this epic populates that panel's content for the "players" tool specifically (today it opens empty), it does not build new dock/panel plumbing.
- No backend/persistence work in this epic — player data lives in in-memory state during the session; saving/loading is Epic 5's responsibility.
- No new framework introduced here — the whole app is vanilla JS with no build step (confirmed during Epic 1 investigation); this epic's interaction logic (click handlers, DOM element creation for each player) should follow that same vanilla approach unless a story's own investigation finds a strong reason to deviate.

## Cross-Story Dependencies

- Story 2-1 (selection) must exist before Story 2-2 (placement) can have anything to place — 2-2 depends on 2-1's selected-state being readable, not on 2-1's UI being finished-polished.
- Story 2-3 (move/delete) depends on 2-2 having created addressable player elements to click on.
- Story 2-4 (visual feedback: label/color/number) is largely a rendering concern that could be built alongside 2-2 (a placed player needs a label from the start to be useful) — but is scoped separately so the position-numbering logic (detecting repeated postes and assigning "PIV 1"/"PIV 2") can be story-specific rather than bolted into the placement story's core click-to-place logic.
- This epic does not depend on Epic 3 (Assets) or Epic 4 (Trajectories) — a coach should be able to place a full formation of players and stop there, with a valid (if incomplete) exercise.
- Epic 4 (Trajectories) will depend on this epic's players existing and being individually addressable (a trajectory links to a specific placed player) — this epic's player elements must expose a stable identity (id) that Epic 4 can reference later, even though wiring that reference is out of this epic's scope.
