# Board Tactique Guide v2 — Dock UI System
**Sprint 4 — Day 19 Documentation**  
**Updated:** 2026-10-05  
**Language:** Français

---

## Table of Contents
1. [Overview](#overview)
2. [The Dock System](#dock-system)
3. [Keyboard Shortcuts](#keyboard-shortcuts)
4. [Sidebar & Sections](#sidebar)
5. [Responsiveness & Tablets](#responsive)
6. [Troubleshooting](#troubleshooting)

---

## Overview {#overview}

The Board Tactique v2 interface features a new **Dock UI system** — a bottom toolbar with quick-access icons for core features. This guide explains how to use the dock, panels, keyboard navigation, and responsive design.

### What's New in v2

| Feature | Description |
|---------|-------------|
| **Dock Toolbar** | Bottom toolbar with 10 quick-access icons |
| **Slide-out Panels** | Click icons to open detailed panels on the right |
| **Keyboard Shortcuts** | Full keyboard navigation (Tab, Arrows, Escape) |
| **Assets Mode** | Toggle assets grid for quick asset selection |
| **Responsive Layout** | Optimized for 600px–1920px viewport widths |
| **Touch-Friendly** | All buttons ≥44×44px for mobile/tablet |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (Left)                │  MAIN CANVAS (Center)                 │
│  - Vue (View options)           │  - Terrain / Sports Field             │
│  - Mode (Drawing tools)         │  - Player/asset placement area        │
│  - Exercice (Exercise metadata) │  - Bottom controls (teams, haies)     │
│  - Postes (Positions)           │                                       │
│  - Aide (Help)                  │                                       │
│                                 │                                       │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│ DOCK (Bottom) ─────────────────────────────────────────────────────────  │
│ [Joueurs] [Assets] [Trajectoires] [Animation] [Bibliothèque] […]        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Dock System {#dock-system}

### Dock Icons Overview

The dock toolbar contains 10 quick-access icons at the bottom of the screen.

| Icon | Label | Function | Shortcut |
|------|-------|----------|----------|
| 🎮 | Joueurs | Manage players & teams | Click |
| 🎯 | Assets | Select training equipment & obstacles | Click |
| 📍 | Trajectoires | Plan player movement trajectories | Click |
| ▶️ | Animation | Play/replay exercise animation | Click |
| 📚 | Bibliothèque | Open exercise library | Click |
| 📋 | Séance | Manage training session | Click |
| 📅 | Planning | View/edit training schedule | Click |
| 🏢 | Postes | Quick access to position options | Click |
| 👁️ | Vue | Switch between terrain views | Click |
| ↶ | Annuler | Undo last action | Click |

### How to Use Dock Icons

#### Single Click: Open Panel

```
User Action: Click any dock icon (except Assets)
      ↓
Result: Slide-out panel appears on right side with details
      ↓
To Close: Click ✕ button, press Escape, or click icon again
```

**Example: Open Players Panel**
1. Click 🎮 (Joueurs) icon in dock
2. Panel slides in from right, showing "Joueurs" title
3. Panel content displays player management options
4. Close with ✕ button or press Escape

#### Assets Mode: Toggle Grid

```
User Action: Click 🎯 (Assets) icon
      ↓
Result: Dock icons hide, asset grid (2×6 layout) appears
      ↓
Select Asset: Tap/click any asset item
      ↓
To Exit: Click ← (back) button or press Escape
```

**Example: Select an Asset**
1. Click 🎯 (Assets) icon
2. 12 asset items appear (Ballon, Haie, Haltère, Cible, Swiss Ball, Coupelle, Cerceau, Échelle, Mannequin, Mur, Plot, Zone)
3. Click desired asset (e.g., "Ballon")
4. Item highlights with active color
5. Click ← or press Escape to return to dock

### Panel Details

When a panel opens, you see:

```
┌──────────────────────────┐
│ 🎮 Joueurs          [✕] │  ← Panel header (icon + title + close)
├──────────────────────────┤
│                          │
│ Panel content            │  ← Customized for each tool
│ (players, options, etc.) │
│                          │
│ [Appliquer] [Annuler]    │  ← Action buttons
└──────────────────────────┘
```

**Panel Features:**
- ✅ Glassmorphism design (semi-transparent background)
- ✅ Slide-in animation (200ms smooth)
- ✅ Close button (✕) at top-right
- ✅ Keyboard-accessible (Tab, Escape)
- ✅ Overlays canvas (doesn't block terrain view)

---

## Keyboard Shortcuts {#keyboard-shortcuts}

Master these shortcuts for faster workflow:

### Navigation Shortcuts

| Key(s) | Action | Context | Notes |
|--------|--------|---------|-------|
| **Tab** | Move focus to next dock icon | Dock visible | Cycles left → right through all icons |
| **Shift + Tab** | Move focus to previous icon | Dock visible | Cycles right ← left |
| **Escape** | Close open panel | Panel open | Closes any open panel, returns to dock |
| **Escape** | Exit assets mode | Assets mode | Exits grid, returns to dock icons |

### Arrow Key Navigation (Assets Mode Only)

| Key | Action | Context |
|-----|--------|---------|
| **→ (Right)** | Move focus right in assets grid | Grid visible |
| **← (Left)** | Move focus left in assets grid | Grid visible |
| **↓ (Down)** | Move focus down in assets grid | Grid visible |
| **↑ (Up)** | Move focus up in assets grid | Grid visible |

### Keyboard Focus Management

**Tab Navigation Flow:**
```
[🎮] → [🎯] → [📍] → [▶️] → [📚] → [📋] → [📅] → [🏢] → [👁️] → [↶] → [🎮] (cycles)
```

**After Escape:**
```
Panel open → Press Escape → Panel closes → Focus returns to dock
Assets mode → Press Escape → Grid closes → Focus returns to dock
```

### Tips for Power Users

- **Use Tab to navigate dock** instead of clicking repeatedly
- **Press Enter** on focused button to activate (browser default)
- **Combine Shift+Tab** to go backward through icons
- **Arrow keys only work in assets grid** — not for dock navigation

---

## Sidebar & Sections {#sidebar}

The sidebar on the left contains exercise metadata and drawing tools.

### Sidebar Sections (Collapsible)

#### 1. Vue (View)
**Purpose:** Choose how to display the terrain

Options:
- 🔲 Terrain complet (Full field)
- ⬜ Demi-terrain (Half field)
- 📐 Perspective (Angled view)

#### 2. Mode (Drawing Tools)
**Purpose:** Select your drawing mode

Options:
- 🎯 Asset (Place obstacles/equipment)
- ✋ Sélect (Select existing elements)
- 🔵 Course (Player movement)
- 🎯 Tir (Shot/goal attempt)
- ✈️ Passe (Pass/throw)
- 🔄 Croisé (Cross/exchange)
- 🔒 Fixation (Fixation/dribble)

**Sidebar Help:**
- ✅ Lié à la trajectoire précédente (Link trajectories)
- ▶️ Animation (Play animation)

#### 3. Exercice (Exercise)
**Purpose:** Edit exercise metadata

Fields:
- **Nom** (Name) — Exercise title
- **Catégorie** (Category) — Type of training (Échauffement, Physique, Offensif, Défensif, Montée de balle)
- **Thématique** (Theme) — Attaque, Défense, Gardien, Enclenchement
- **Durée estimée** (Estimated duration) — Minutes
- **Nombre de joueurs** (Number of players)
- **Niveau / Catégorie d'âge** (Age/level) — e.g., "-15 ans, Confirmés"
- **Notes** (Notes) — Text description

#### 4. Postes (Positions)
**Purpose:** Select player positions

Quick buttons:
- AG (Ailier Gauche) — Left wing
- ARG (Arrière Gauche) — Left back
- DC (Demi-Centre) — Center back
- PIV (Pivot) — Pivot/center
- ARD (Arrière Droite) — Right back
- AD (Ailier Droit) — Right wing

**Note:** Select a position before placing a player on the terrain.

#### 5. Aide (Help)
**Purpose:** Quick reference

Tips displayed:
- Click an asset, then click terrain to place it
- Drag to move elements
- Double-click to finish trajectories

### Sidebar Responsiveness

| Viewport | Sidebar State | Behavior |
|----------|---------------|----------|
| 600px (mobile) | Hidden | Tap to toggle (slide from left) |
| 768px (tablet portrait) | Hidden | Tap to toggle |
| 1024px (tablet landscape) | Visible | Shown by default, resizable |
| 1400px+ (desktop) | Visible | Shown by default, full width |

---

## Responsiveness & Tablets {#responsive}

The Board Tactique is fully responsive and works on all screen sizes.

### Supported Breakpoints

```
┌─────────────────────────────────────────────────────────────┐
│ Breakpoint | Viewport | Sidebar | Dock | Canvas | Status   │
├─────────────────────────────────────────────────────────────┤
│ Mobile    | 600×800  | Hidden  | Full | 300px  | ✅ Works │
│ Tablet P  | 768×1024 | Hidden  | Full | 300px  | ✅ Works │
│ Tablet L  | 1024×600 | Visible | Full | 744px  | ✅ Works │
│ Desktop   | 1400×900 | Visible | Full | 1080px | ✅ Works │
│ Large     | 1920×1080| Visible | Full | 1600px | ✅ Works │
└─────────────────────────────────────────────────────────────┘
```

### Tablet-Specific Tips (Asus C425T, iPad)

#### Landscape Mode (1024×600px)
- ✅ Sidebar is visible on left (280px)
- ✅ Canvas takes center (744px)
- ✅ Dock at bottom (64px)
- ✅ All touch targets ≥44×44px (tappable)
- ✅ No horizontal scroll needed
- ✅ Full terrain visible

#### Portrait Mode (600×1024px)
- ✅ Sidebar hidden (swipe from left to open)
- ✅ Canvas full width (~600px)
- ✅ Dock at bottom (64px)
- ✅ All touch targets ≥44×44px
- ✅ No horizontal scroll

#### Touch Gestures on Tablet

| Gesture | Action | Result |
|---------|--------|--------|
| Tap dock icon | Select tool | Panel opens (or dock hides in assets mode) |
| Tap ← (back) | Exit assets mode | Dock icons return |
| Tap ✕ (close) | Close panel | Panel slides out |
| Press Escape | Close all | Panel/assets mode closes |
| Swipe left (on icon) | Not implemented | (Future feature) |

### Performance on Tablets

**Asus C425T Performance (1024×600px):**
- Dock load: 68ms ✅
- Panel open: <50ms ✅
- Animation: 60fps (smooth) ✅
- Touch response: <50ms ✅
- No lag or jank ✅

---

## Troubleshooting {#troubleshooting}

### Issue: Dock not visible
**Solution:** Dock is fixed at bottom of screen. Scroll down or check if viewport is very small (<300px height).

### Issue: Panel won't close
**Solution:** Press Escape key, or click the ✕ button in panel header.

### Issue: Keyboard navigation not working
**Solution:** Ensure focus is on a dock element. Click dock first, then use Tab. Arrow keys only work in assets grid.

### Issue: Assets grid appears empty
**Solution:** Make sure you clicked the 🎯 (Assets) icon. If still empty, refresh page.

### Issue: Sidebar hidden on desktop
**Solution:** Sidebar appears when viewport ≥1024px width. Make sure browser window is wide enough. On mobile, tap ☰ to toggle sidebar.

### Issue: Terrain cropped/cut off
**Solution:** Canvas reflows automatically. Try resizing window or pressing Escape to close any open panels. If still cropped, check browser zoom (Ctrl+0 to reset).

### Issue: Touch targets too small
**Solution:** All dock buttons are 48×48px (≥44px minimum). If still too small, check browser zoom or accessibility settings.

### Issue: Animations stuttering
**Solution:** This is rare, but if animations jank:
1. Close other browser tabs
2. Disable browser extensions
3. Check for high CPU usage
4. Try Chrome instead of Safari

---

## Quick Reference Card

### Dock Icons (Memorize These!)

```
Position:   1st  2nd  3rd  4th   5th   6th  7th  8th   9th  10th
Icon:       🎮   🎯   📍   ▶️    📚   📋   📅  🏢   👁️   ↶
Label:      Joueurs Assets Trajectoires Animation …
Action:     Open  Toggle Open  Open  …
Shortcut:   Click Click  Click  Click …
```

### Common Workflows

**Workflow 1: Add a Player**
1. Click 🎮 (Joueurs)
2. Select team (Équipe A / B) from sidebar
3. Select position (AG, ARD, etc.) from Postes section
4. Click on terrain to place player

**Workflow 2: Add an Obstacle**
1. Click 🎯 (Assets)
2. Click desired asset (Ballon, Haie, etc.)
3. Click terrain to place obstacle
4. Click ← (back) to return to dock

**Workflow 3: Draw Player Movement**
1. Use sidebar Mode section → select "Course"
2. Click on terrain to start trajectory
3. Click again to add points
4. Double-click to finish
5. Or click ▶️ (Animation) to play back

**Workflow 4: Navigate with Keyboard**
1. Press Tab to cycle dock icons
2. Press Enter on focused icon to open panel
3. Press Escape to close panel
4. Use Arrow keys in assets grid

---

## Advanced Topics

### Layers & Z-Index

Elements render in this order (bottom to top):
1. Terrain (canvas)
2. Dock (fixed, bottom)
3. Sidebar (fixed, left)
4. Panel (fixed, right, overlay)
5. Modals (library, dialogs)

### Canvas Reflow Algorithm

When viewport changes:
1. Sidebar width calculated from CSS (`getSidebarWidth()`)
2. Dock height read from DOM (`getDockHeight()`)
3. Available space = viewport - sidebar - dock
4. Canvas dimensions updated
5. Terrain redraws automatically

### Debouncing & Performance

- Dock clicks debounced to 50ms (prevents double-triggers)
- Window resize debounced to 100ms (prevents repeated reflow)
- Media query listeners trigger on breakpoint changes

---

## Accessibility Features

### WCAG AA Compliance

✅ All dock icons have `aria-label` (screen reader readable)  
✅ Color contrast ≥4.5:1 (meets WCAG AA)  
✅ Touch targets ≥44×44px (mobile friendly)  
✅ Keyboard focus visible (2px gold outline)  
✅ No keyboard traps (can Tab/Escape out of any component)  
✅ Semantic HTML (h2 headings, `<nav>`, `<button>`)  

### Screen Reader Support

When using screen readers (NVDA, JAWS, VoiceOver):
- Dock is announced as "toolbar"
- Each icon reads as "[Name], button" (e.g., "Joueurs, button")
- Panel title is announced as heading level 2
- Assets grid is announced as grid, with each item labeled

---

## Getting Help

### Documentation
- This guide: Complete reference
- Sidebar "Aide" section: Quick tips
- Code comments: Technical details (see `/src/js/dock.js`, `/src/js/keyboard-nav.js`)

### Common Questions
- **Q: How do I undo?** A: Click 🔄 (Undo) icon in dock
- **Q: Can I export exercises?** A: Click "Export JSON" in sidebar (top section)
- **Q: How do I change terrain view?** A: Click 👁️ (Vue) icon or use sidebar "Vue" section
- **Q: Does it work on iPhone?** A: Yes! Touch targets designed for mobile

---

## Changelog (v1 → v2)

### New Features
- ✨ Dock toolbar (10 quick-access icons)
- ✨ Slide-out panels (right-side overlay)
- ✨ Assets mode toggle (hide dock, show grid)
- ✨ Keyboard navigation (Tab, Arrows, Escape)
- ✨ Responsive canvas reflow (600px–1920px)
- ✨ Touch-friendly design (44×44px targets)

### Improvements
- 🎨 Glassmorphism panel design
- ⚡ Faster interaction (panel <50ms response)
- 🔊 Screen reader accessibility (WCAG AA)
- 📱 Better tablet support (Asus C425T tested)
- ⌨️ Full keyboard navigation

### Breaking Changes
None! Canvas API unchanged. All existing terrain logic preserved.

---

## Footer

**Document Version:** v2.0  
**Last Updated:** 2026-10-05  
**Dock UI Sprint:** Sprint 4 Complete  
**Status:** ✅ READY FOR LAUNCH  

For technical documentation, see:
- `/web-board/src/js/dock.js` — Dock & panel logic
- `/web-board/src/js/keyboard-nav.js` — Keyboard navigation
- `/web-board/src/js/canvas-reflow.js` — Canvas sizing
- `/tests/reports/` — Accessibility, performance, tablet reports

---

**Happy coaching! 🎯**
