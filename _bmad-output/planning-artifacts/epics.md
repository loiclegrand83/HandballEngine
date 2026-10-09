---
stepsCompleted: [1, 2, 3]
inputDocuments: ['_bmad-output/prd-runs/players-assets-trajectories-2026-09-22/prd.md', '_bmad-output/planning-artifacts/architecture/architecture-haweb-2026-10-02/ARCHITECTURE-SPINE.md']
---

# haweb - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for haweb, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

Scope note: this breakdown covers only the Dock-UI selection regressions the architecture spine governs (spine `binds: [FR1.2, FR2.1, FR2.3, FR3.1, FR4.1, FR5.2]`). FR1.1, FR2.2, FR3.2, FR4.2, FR6, FR5.1, and all NFRs are pre-existing, already-implemented, and explicitly out of scope per the spine's Deferred section.

## Requirements Inventory

### Functional Requirements

FR1.2: Dock is the single source of truth for player/asset/trajectory selection; Sidebar shows exercise metadata only, never duplicates Dock selection controls
FR2.1: Coach selects players via Dock "Joueurs" panel — équipe A/B toggle, 7 postes (6 outfield: AG/ARG/DC/PIV/ARD/AD + 1 Gardien: G), sticky selection (reclicking same poste stays selected), 6+1 cap per team
FR2.3: Player visual feedback — poste label, équipe color, poste instance number for repeated outfield postes, distinct Gardien marker (not numbered)
FR3.1: Coach selects assets via Dock "Assets" panel — fixed 10-item list (Plot, Cône, Haie, Cible, Swiss Ball, Coupelle, Cerceau, Mannequin, Mur, Zone), sole selection surface
FR4.1: Coach selects trajectory type via Dock "Trajectoires" panel — 5 types (Course, Passe, Tir, Croisé, Fixation), sole selection surface
FR5.2: Terrain stays centered + maximized; no Sidebar/Dock/panel obscures the terrain or swallows clicks

### NonFunctional Requirements

No new NFRs introduced by this scope. Existing NFRs (touch targets ≥44px, no network dependency) remain governed by the existing app and the inherited AD-11 (no network dependency anywhere in the app) — not re-specified here.

### Additional Requirements

- Brownfield codebase, no starter template — architecture ratifies existing vanilla JS / multi-page app conventions
- AD-1: `#postButtons`, `#teamButtons`, `#drawModeButtons`, `#assetPalette` and their click handlers deleted from `board.html`/`app.js`, not hidden. `window.PlayerSelectionAPI` global deleted — `dock.js` calls mutator functions directly.
- AD-2: Each Dock panel's `render<Tool>Panel()` reads state fresh only on discrete DOM events (open, click, `itemPlaced`) — no `setInterval`/polling.
- AD-3: `selectPost(post)`/`selectTeam(team)` always set the selection, never toggle off on reclick. No deselect-by-reclick affordance anywhere.
- AD-4: `.panel`'s `position: fixed` removed — panel becomes a flow/grid sibling of canvas, pushes/reflows it. Shared grid-template owned by one file (`panel.css`) only.
- AD-5: Dock icons vendored as local Lucide SVG files (v1.53.0, ISC license) under `web-board/assets/icons/`, fixed mapping: Joueurs=users, Assets=cone, Trajectoires=route, Animation=play, Bibliothèque=library, Séance=clipboard-list, Planning=calendar, Postes=tag, Vue=layout-grid, Annuler=undo-2.
- AD-6: Gardien entry moves from `assets[]` into `HANDBALL_POSTS` as 7th poste. `isGoalkeeper` field computation corrected from `post === 'AG'` to `post === 'G'` (bug fix — cap never fired on real Gardien before).
- Inherited AD-7: new/modified server routes follow existing CRUD/security pattern (id validation, path containment, body cap, security headers) — not expected to apply to this scope (no new routes), noted for completeness.
- Inherited AD-11: no network dependency anywhere in the app — vendored Lucide icons must never be CDN-fetched at runtime.

### UX Design Requirements

No UX design document found for this scope. Proceeding without one.

### FR Coverage Map

FR1.2: Epic 5 - Dock is single source of truth for selection, Sidebar removed
FR2.1: Epic 5 - Joueurs panel, sticky poste selection, 6+1 cap including Gardien
FR2.3: Epic 5 - Player visual feedback (poste label, team color, instance number, Gardien marker)
FR3.1: Epic 5 - Assets panel, 10-item fixed list
FR4.1: Epic 5 - Trajectoires panel, 5 types
FR5.2: Epic 5 - Panel pushes/reflows canvas, never obscures

## Epic List

### Epic 5: Dock-Only Selection, Fixed
Coach selects players, assets, and trajectory types entirely through the Dock — no desync, no dead clicks, no vanished Gardien, icons that make sense at a glance.
**FRs covered:** FR1.2, FR2.1, FR2.3, FR3.1, FR4.1, FR5.2

### Story 5.1: Gardien is a real poste, correctly capped

As a coach,
I want Gardien to appear as a 7th poste in the Joueurs panel with a working 1-per-team cap,
So that I can place a goalkeeper without hunting for it under Assets, and never accidentally place two.

**Acceptance Criteria:**

**Given** the Joueurs panel is open
**When** I look at the poste list
**Then** I see 7 postes: AG, ARG, DC, PIV, ARD, AD, and Gardien (G) — Gardien is no longer under the Assets panel

**Given** the Gardien entry currently lives in `assets[]` (`app.js:65`)
**When** this story is implemented
**Then** it is moved into `HANDBALL_POSTS`, following the same placement/cap code path as the 6 outfield postes

**Given** `isGoalkeeper` is currently computed as `post === 'AG'` (`app.js:1161`)
**When** this story is implemented
**Then** the computation is corrected to `post === 'G'` — AG is Ailier Gauche (Left Wing), not Gardien

**Given** a team already has 1 Gardien placed
**When** I try to place a 2nd Gardien for that team
**Then** the G button is disabled — the cap now actually fires (it never did before, since it was keyed to the wrong poste)

**Given** a team has 0 Gardien and 6 outfield players placed
**When** I check the poste buttons
**Then** outfield buttons are disabled but G remains selectable — outfield and Gardien caps are tracked independently

---

### Story 5.2: Poste selection stays active on reclick

As a coach,
I want clicking the same poste button twice to keep it selected instead of deselecting it,
So that I can place two players of the same poste (e.g. 2 pivots) back-to-back without extra clicks.

**Acceptance Criteria:**

**Given** I have selected "PIV" in the Joueurs panel
**When** I click "PIV" again
**Then** it stays selected — no deselection, no visual change indicating a toggle-off

**Given** "PIV" is selected and I have just placed a pivot on the terrain
**When** I click the terrain again without touching any button
**Then** a 2nd pivot is placed immediately — no need to reselect the poste

**Given** I have selected "PIV"
**When** I click "DC" instead
**Then** selection moves to DC — switching to a different poste is still the only way to change selection

**Given** the same reclick-stays-selected rule
**When** I select "Équipe A" and click "Équipe A" again
**Then** team selection behaves identically — stays active, no toggle-off

**Given** no button in the Joueurs panel is checked for a deselect-by-reclick affordance
**When** this story is implemented
**Then** `selectPost(post)` and `selectTeam(team)` always set the selection unconditionally — no "already selected → clear" branch remains in the code

---

### Story 5.3: Dock panel pushes the canvas, never covers it

As a coach,
I want an open Dock panel to resize the terrain view instead of floating over it,
So that I can always see the full terrain and reach every Dock icon, even with a panel open.

**Acceptance Criteria:**

**Given** `.panel` currently uses `position: fixed` (`panel.css:9`)
**When** this story is implemented
**Then** that is removed — the panel becomes a normal flow/grid sibling of the canvas container

**Given** I open the Joueurs panel
**When** I look at the terrain
**Then** the canvas container has shrunk and reflowed to make room — the panel does not float over any part of the terrain

**Given** a panel is open
**When** I look at the Dock bar
**Then** all 10 Dock icons remain visible and clickable — the panel never stacks above the Dock

**Given** the shared grid-template that allocates space between Dock, panel, and canvas
**When** this story is implemented
**Then** that layout lives in exactly one file (`panel.css`, extended) — no duplicate grid declaration is added to `dock.css` or any per-panel style

**Given** I click near the left/bottom edge of the terrain while a panel is open
**When** my click lands on the terrain (not the panel)
**Then** it registers on the canvas as expected — no silent click-swallowing at the boundary

---

### Story 5.4: Dock icons are real, recognizable symbols

As a coach,
I want each Dock icon to visually match what it does,
So that I can click the right tool without reading a tooltip first.

**Acceptance Criteria:**

**Given** the fixed Lucide icon mapping (v1.53.0, ISC license)
**When** this story is implemented
**Then** each of the 10 Dock icons is replaced: Joueurs=users, Assets=cone, Trajectoires=route, Animation=play, Bibliothèque=library, Séance=clipboard-list, Planning=calendar, Postes=tag, Vue=layout-grid, Annuler=undo-2

**Given** the icons must stay fully local (inherited AD-11, no network dependency)
**When** this story is implemented
**Then** each icon is a vendored static SVG file under `web-board/assets/icons/<lucide-name>.svg` — never a CDN reference

**Given** Séance (clipboard-list) and Planning (calendar) sit side by side in the Dock
**When** I glance at both icons
**Then** they are visually distinct — no shared calendar-family glyph that could cause the confusion QA flagged previously

**Given** the vendored SVG files
**When** I inspect the filenames
**Then** each filename matches its Lucide slug exactly (e.g. `users.svg`, `clipboard-list.svg`) — no renaming

---

### Story 5.5: Legacy Sidebar selection controls are removed

As a coach,
I want only one place to select team, poste, asset, and trajectory type,
So that what I see in the Dock panel is always accurate — never stale because I changed something somewhere else.

**Acceptance Criteria:**

**Given** `#postButtons`, `#teamButtons`, `#drawModeButtons`, and `#assetPalette` currently exist in `board.html`/`app.js` as a second selection UI
**When** this story is implemented
**Then** all four are deleted from the DOM entirely, along with their click handlers — not hidden via CSS, not feature-flagged

**Given** `window.PlayerSelectionAPI` currently exposes `selectTeam`/`selectPost`/etc. as a global
**When** this story is implemented
**Then** that global is deleted — `dock.js` calls the mutator functions directly as same-bundle function references

**Given** the Sidebar is gone
**When** I open any Dock panel and change a selection
**Then** the Dock panel reflects it correctly every time — there is no second live mutator left that could cause a stale read

**Given** `selectTeam`/`selectPost`/`selectDrawMode`/`selectAsset` in `app.js`
**When** I search the codebase for callers
**Then** they are called exclusively from Dock panel click handlers in `dock.js` — no other call site remains

---

### Story 5.6: Dock panels never poll for freshness

As a developer extending this codebase,
I want a hard rule against timer-based state polling in Dock panels,
So that no future panel silently reintroduces the always-watching behavior this architecture explicitly avoids.

**Acceptance Criteria:**

**Given** each Dock panel's `render<Tool>Panel()` function
**When** I trace what triggers a re-render
**Then** it is only ever a discrete DOM event — panel open/re-open, a click inside that panel, or the existing `itemPlaced` CustomEvent

**Given** the Joueurs, Assets, and Trajectoires panels built in prior stories
**When** I inspect their code
**Then** none of them use `setInterval` or a `requestAnimationFrame` loop to check `state` for changes

**Given** Story 5.5 has removed the second mutator (Sidebar)
**When** a Dock panel is open and the coach interacts only through that panel
**Then** render-on-open alone keeps the panel accurate — no event bus or pub/sub layer is introduced to achieve this
