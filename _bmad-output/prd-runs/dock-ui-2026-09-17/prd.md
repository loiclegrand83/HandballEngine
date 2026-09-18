---
title: Dock UI — Handball Engine Board Tactique
status: final
created: 2026-09-17
updated: 2026-09-17
audience: Solo (Loic)
stakes: Internal tool / personal use
---

# Dock UI — Handball Engine Board Tactique

## Overview

**Problem:** The left sidebar of the Board Tactique module contains too many options and requires scrolling, disrupting fluid interaction on both desktop (mouse) and tablet (10" landscape, Asus C425T). Drawing exercises and managing the terrain should be distraction-free on any surface.

**Solution:** Redesign the UI with a **dual-surface dock-and-sidebar system**:
- **Dock:** icon-based tool launcher (bottom on tablet, side on desktop) for fast access to Players, Assets, Trajectories, Animation
- **Sidebar:** hierarchical menu system (nested menus/submenus) for secondary options, responsive width based on device type
- **Terrain:** maximizes available space on both small (10" tablet) and large (24"+ desktop) screens

**Outcome:** A responsive, single-screen interface that works equally well on tablet (landscape) and desktop — no scrolling, minimal menu traversal, fluid interactions on both surfaces.

---

## Success Metrics

- ✅ All toolbar options accessible from dock without scrolling or nested traversal >2 levels deep
- ✅ Dock loads <100ms, interactions respond within 50ms (click-to-action)
- ✅ Sidebar (if retained) shows only essentials; secondary options migrate to dock submenus
- ✅ Visual clarity maintained — dock does not obscure terrain when used on 10" landscape
- ✅ Interaction model consistent with macOS Dock (hover reveals label/icon, click opens panel or toggles state)

---

## Functional Requirements

### FR1: Dock Layout & Visibility

**FR1.1** The dock appears as a horizontal bar at the bottom of the screen, always visible (not auto-hidden).

**FR1.2** Dock contains icon buttons representing functional groups:
- Players (Équipe A, Équipe B, Postes)
- Assets (Ballon, Haie, Haltère, Cible, Swiss Ball, Coupelle, Cerceau, Échelle de rythme, Mannequin, Mur, Plot, Zone de fixation)
- Trajectories (Course, Tir, Passe, Croisé, Fixation)
- Animation (Play, Stop, Reset)
- Bibliothèque (Load exercise)
- Séance (Link to séance module)
- Planning (Link to planning module)

**FR1.3** Dock width = 100% of viewport; icons center-aligned with padding. On narrow screens (<600px), dock may stack or compress (scope for mobile later).

**FR1.4** Visual style matches Board Tactique theme — dark background, yellow accent (current brand), minimal borders.

### FR2: Icon Interaction Model

**FR2.1** Hover over icon → label appears (e.g., "Players" on hover of 🎮 icon). [ASSUMPTION: macOS-like tooltip + slight scale/opacity change]

**FR2.2** Click icon → opens a **contextual panel** or **submenu**:
- **Players** → panel with Équipe A / Équipe B selection + Postes list (or stays as current sidebar, lightened)
- **Assets** → grid of asset icons; click to select, then click terrain to place
- **Trajectories** → list of trajectory modes + "Linked to previous?" toggle
- **Animation** → Play / Stop / Reset buttons + timeline (if needed)
- **Bibliothèque, Séance, Planning** → navigate to module or open in sidebar/modal

**FR2.3** Active tool icon is highlighted (e.g., filled background or border change) so the user always knows what's selected.

**FR2.4** Clicking an icon a second time closes the panel (toggle behavior). [ASSUMPTION: reduces clicks vs. click-outside-to-close]

### FR3: Sidebar Evolution (Hierarchical Menu System)

**FR3.1** Sidebar is restructured as a **hierarchical menu** with collapsible sections:
- **Vue** (expand/collapse) → Terrain complet, Demi-terrain, Perspective
- **Exercice** (expand/collapse) → Nom, Thématique, Durée, Joueurs, Niveau, Catégorie
- **Options avancées** (expand/collapse) → Paramètres supplémentaires
- Each section shows only headers by default; click to expand/show nested items

**FR3.2** Sidebar width is **context-dependent**:
- **Tablet (landscape, <1024px):** width = 120–140px (minimal, icon-only mode or very compact labels)
- **Desktop (≥1024px):** width = 180–220px (labels + content visible, collapsible sections)

**FR3.3** Sidebar does not require scrolling; all sections fit in viewport height when expanded. [ASSUMPTION: max 4–5 top-level sections, each expandable]

**FR3.4** Secondary options (durée, joueurs, niveau) are now nested under "Exercice" or "Options" menu items, reducing visual clutter.

### FR4: Terrain Responsiveness

**FR4.1** Terrain canvas uses remaining viewport space after dock (bottom) and sidebar (left) are rendered.

**FR4.2** Canvas height = viewport height - dock height (~60px) - any top toolbar margin.

**FR4.3** Canvas scales proportionally; no terrain content is hidden or cropped due to dock/sidebar layout.

### FR5: Multi-Surface Responsiveness

**FR5.1 Tablet (Landscape, ≤1024px width)**
- Dock appears at **bottom** of screen (horizontal bar, full width, 64px height)
- Sidebar appears on **left** with minimal width (120–140px, icons or very compact labels)
- Terrain canvas takes remaining space (width - sidebar width, height - dock height)

**FR5.2 Desktop (≥1024px width)**
- Dock appears at **bottom** of screen (horizontal bar, full width, 64px height) — consistent across all screen sizes
- Sidebar width expands to 180–220px (labels + content fully visible)
- Terrain canvas takes remaining space
- Same dock-at-bottom placement as tablet for visual consistency

**FR5.3 Responsive Breakpoint**
- At 1024px threshold, layout recalculates:
  - Sidebar expands (120px → 180–220px)
  - Dock stays at bottom (no position change)
  - Canvas reflows to maximize available space
  - Font sizes and spacing scale per breakpoint

**FR5.4 Mobile Portrait [FUTURE SCOPE]**
- Portrait layout deferred; assume landscape (tablet) and desktop wide only for v1.

---

## Non-Functional Requirements

### Performance
- Dock rendering: <50ms initial paint
- Icon click → panel open: <100ms
- Terrain canvas continues to respond at 60fps while dock/sidebar are interactive

### Accessibility
- Icons have alt-text / aria-labels
- Keyboard shortcuts for dock actions (e.g., `P` for Players, `A` for Assets)
- Color contrast meets WCAG AA (dock text + icons vs. background)

### Browser Compatibility
- Chrome/Chromium (primary — PWA on tablet runs on Chromium)
- Safari (secondary — if user accesses via browser on macOS)

---

## User Journey

**Scenario:** Coach preparing a 3v3 defense exercise on tablet during practice.

1. **Open Board Tactique** → sees dock at bottom, sidebar on left with "Vue" and "Exercice" sections
2. **Click Players icon** → contextual panel slides in/up showing Équipe A / Équipe B + Postes
3. **Select Équipe A + Poste DC** → closes panel, icon highlights
4. **Click terrain** → places DC player
5. **Repeat** for other players (click Players icon again if needed to change équipe/poste, or icon stays active until next tool selected)
6. **Click Assets icon** → grid of obstacles appears
7. **Select Haie** → places haie on terrain
8. **Click Trajectories icon** → list of trajectory modes shown
9. **Select Course** → draws player path by clicking waypoints
10. **Double-click** to end path
11. **Click Animation icon** → Play button prominent; clicks to start animation
12. **After animation**, coach saves exercise via "Exercice" sidebar (name, thématique, save button)

---

## Technical Constraints

**No new dependencies:** Use vanilla JS + existing CSS infrastructure. Avoid heavy libraries or animations that would slow tablet responsiveness.

**Tablet ergonomics:** Icons should be touch-friendly (minimum 44px × 44px per iOS HIG). Dock should not cover important terrain details.

**Persistent state:** Selected tool (e.g., "Players" icon highlighted) reflects current tool mode; survives accidental clicks elsewhere.

---

## Out of Scope (Defer)

- Auto-hiding dock or sidebar (always visible per spec)
- Keyboard shortcuts (future ergonomic enhancement)
- Mobile portrait layout (landscape only for now)
- Custom icon styling beyond current Board theme
- Drag-to-reorder dock icons

---

## Assumptions & Notes

`[ASSUMPTION]` Items are numbered and tagged below; confirm before design/dev:

- **A1:** Dock is always visible; no auto-hide. User can work with reduced terrain space if it keeps interactions fluid.
- **A2:** Icon click toggles panel open/close; click-outside-to-close is not implemented (simpler interaction model for tablet).
- **A3:** Sidebar width reduces from ~280px to ~140px; sidebar content is pruned (Vue + Exercice only; secondary fields collapsible).
- **A4:** Landscape orientation for tablet; desktop wide (≥1024px) also supported. Portrait deferred to v2.
- **A5:** No new CSS framework; extend existing `styles.css` and `seance.css` patterns.
- **A6:** Sidebar uses hierarchical collapsible menus; default state = **collapsed headers**, expand on click.
- **A7:** Dock placement is **bottom** on both tablet and desktop (consistent, no position toggle).

`[NOTE FOR PM]`
- **UX Design Approved:**
  - ✅ Dock icon set: custom-designed, realistic Handball Engine icons (not generic reuse)
  - ✅ Sidebar menu architecture: hierarchical (Vue, Exercice, Autres); sections collapsed by default
  - ✅ Multi-surface layouts: dock always bottom; sidebar scales 120px (tablet) → 180–220px (desktop)
- **Icon Design Next Step:** Illustrator/designer creates custom icon set (Players, Assets, Trajectories, Animation, Bibliothèque, Séance, Planning, Postes, Vue, Undo/Redo) based on UX spec — realistic representations for clarity
- **Tablet Testing:** Asus C425T (landscape) — terrain clarity, touch target sizes (≥44px), 60fps on canvas
- **Desktop Testing:** 24" monitor (typical coach setup) — dock/sidebar visual balance, terrain visibility

---

## Deliverables

1. **UI Component:** Dock React/vanilla component with icon state management
2. **CSS:** Responsive dock layout + sidebar pruning + canvas reflow
3. **JS:** Panel toggle logic, icon highlighting, terrain canvas sizing
4. **Testing:** Tablet (landscape) E2E on sample exercises
5. **Documentation:** Updated Board Tactique guide (section 4 — revised UI layout)

---

## Next Steps

1. **Design review:** Confirm icon set and visual style with stakeholder (can reuse current Board icons or design new minimal set?)
2. **Sidebar pruning:** Agree on which options move to dock vs. stay in sidebar (Vue, Exercice, Détails)
3. **Dev kickoff:** Implement dock component + canvas reflow
4. **Tablet testing:** Validate ergonomics on Asus C425T (terrain clarity, touch responsiveness, 60fps)
5. **Polish:** Refine animations (if any) and accessibility
