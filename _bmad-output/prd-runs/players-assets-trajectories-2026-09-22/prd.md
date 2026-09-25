---
title: Players, Assets & Trajectories — Customizable Exercise Builder
status: draft
created: 2026-09-22
updated: 2026-09-22
audience: Coach (Loic), internal tool
stakes: Internal / Personal use (coach-facing quality)
---

# Players, Assets & Trajectories — Customizable Exercise Builder

## Overview

**Problem:** Coaches prepare exercises with custom formations (e.g., 2 pivots instead of 1 demi, ARR in interior instead of exterior) from predefined simulations. Current templates are rigid, forcing time-consuming manual adaptation. Coaches need **rapid, flexible placement** of players, assets (plots, cones), and trajectories to visualize their unique strategies.

**Solution:** A fluid exercise builder where coaches:
1. Start with a **séance (session) or edit an existing exercise**
2. **Select and place players freely** (both teams, 6 players + 1 goalkeeper each, any position, any location)
3. **Select and place assets** (plots, cones, haies) to define terrain delimitations
4. **Draw trajectories linked to specific players** (courses, passes, crosses)
5. **Finalize and save** the exercise to their collection

**Outcome:** Coaches customize formations in minutes without rigid templates. Full strategic flexibility + clear visualization for team explanation.

---

## Success Metrics

- ✅ Coach creates a custom 6-player formation in <5 minutes (vs. current 10–15 min with templates)
- ✅ No scrolling needed to access all controls (Dock + responsive sidebar)
- ✅ Terrain stays centered and maximized (full court visibility)
- ✅ Each player placement = one click after selection (fluid UX)
- ✅ Assets + trajectories associated with players (context clear, no confusion)

---

## Functional Requirements

### FR1: Session & Exercise Management

**FR1.1** Coach opens Board Tactique → sees **startup screen**:
- **"New Séance"** button → creates blank séance, coach can add exercises
- **"Edit Exercise"** button → loads existing exercise from collection, coach modifies

**FR1.2** When creating/editing, coach is in **Exercise Builder** mode:
- Header shows: exercise name + séance context
- Sidebar/Dock active for player/asset/trajectory selection
- Terrain canvas centered + maximized
- Save button visible (finalize exercise)

### FR2: Player Selection & Placement

**FR2.1** Coach selects players:
- **Interface:** Dock or sidebar panel shows:
  - **Équipe A / Équipe B toggle**
  - **Poste list** (AG, ARG, DC, PIV, ARD, AD, Demi) — coach selects one
  - **Player limit:** 6 outfield players + 1 goalkeeper per team (max 7 per side, 14 total)
- Coach can select **any poste any number of times** (e.g., 2 pivots, no demi)
- No "standard formation" enforced

**FR2.2** Player placement:
- After selecting Équipe + Poste → **click terrain to place** that player
- Player appears at click location with poste badge/label (e.g., "DC")
- **Multiple placements:** Coach can place same poste multiple times (e.g., 2nd pivot)
- Click already-placed player to **move** or **delete**

**FR2.3** Player visual feedback:
- Each player shown with:
  - **Poste label** (AG, DC, PIV, etc.)
  - **Équipe color** (Team A vs Team B, distinct colors)
  - **Position number** if applicable (e.g., "PIV 1", "PIV 2")

### FR3: Asset Selection & Placement

**FR3.1** Coach selects assets (terrain delimitations):
- **Interface:** Same as players (Dock or sidebar)
  - **Asset list:** Plots, Cones, Haies, Targets, Swiss Balls, Cups, Hoops, Ladders, Dummies, Walls, Zones, etc.
  - Coach selects one asset type
- **Placement:** Click terrain → asset placed at that location
- **Multiple placements:** Coach can place same asset multiple times (e.g., 5 plots in a line)

**FR3.2** Asset visual feedback:
- Each asset shown with:
  - **Icon/symbol** (plot = circle, cone = triangle, etc.)
  - **Label** on hover (optional, for clarity)

### FR4: Trajectory Selection & Drawing

**FR4.1** Coach draws trajectories after placing players:
- **Interface:** Dock or sidebar shows trajectory types:
  - **Linked to player:** Course (player runs), Passe (player passes), Tir (shot), Croisé (cross), Fixation (fixation)
- Coach **selects a trajectory type + a player** → draws on terrain
  - Example: "Select Passe + DC" → draw line from DC to another player = pass
  - Example: "Select Course + Pivot" → draw path where pivot runs

**FR4.2** Trajectory visualization:
- Drawn as **colored lines/arrows** on terrain
- Shows **start (player) and path/end**
- Multiple trajectories on same exercise OK (e.g., DC pass + Pivot course)
- Trajectories are **labeled/color-coded** by type (blue = course, red = pass, etc.)

### FR5: Terrain Configuration

**FR5.1** Coach selects terrain view:
- **Sidebar option:** Demi-terrain (half-court) or Terrain Complet (full court)
- Coach chooses **at session start** (applies to whole séance or per exercise, TBD with architecture)

**FR5.2** Terrain stays **centered + maximized**:
- No sidebar/dock obscure the terrain
- Players, assets, trajectories all visible without scrolling

### FR6: Save & Finalize

**FR6.1** Coach finalizes exercise:
- Clicks **"Save Exercise"** button
- Prompted to name exercise (or use auto-name from template)
- Exercise saved to **collection** (retrievable later via "Edit Exercise")

**FR6.2** Exercise data includes:
- Player list (équipe, poste, position on terrain)
- Asset list (type, position on terrain)
- Trajectory list (type, linked player, drawn path)
- Terrain view (demi or complet)
- Timestamp + coach name (optional, for audit)

---

## Non-Functional Requirements

### Performance
- Player placement: **<100ms click response** (instant visual feedback)
- Asset placement: **<100ms click response**
- Trajectory drawing: **smooth 60fps** while dragging
- No canvas lag when many elements on screen (20+ players/assets/trajectories)

### Accessibility
- **Keyboard shortcuts** for frequent actions (optional, future)
- **Touch-friendly:** all controls ≥44px touch target (tablet support)
- **Tablet usability:** Asus C425T (1024×600px) fully functional, no horizontal scroll

### Responsiveness
- **Dock + sidebar** work on tablet + desktop (responsive design from Sprint 1)
- **Terrain** scales to available viewport without obscuring controls

### Data Integrity
- Exercise saves **locally** (browser localStorage or backend TBD with architecture)
- **Undo/Redo** basic operations (TBD with architecture)

---

## User Journey

**Scenario:** Coach Louis prepares a 3v3 defense drill with custom formation (2 pivots, 1 demi missing).

1. **Opens Board Tactique** → sees startup screen
2. **Clicks "New Séance"** → goes to Exercise Builder, blank terrain
3. **Selects "Équipe A + Pivot"** → clicks terrain twice → 2 pivots placed
4. **Selects "Équipe A + ARD"** → clicks terrain → ARD placed
5. **Selects "Équipe A + AG"** → clicks terrain → goalkeeper placed
6. **Repeats for Équipe B** (3 players: 1 DC, 2 ARG)
7. **Selects "Plots"** → places 3 plots in a triangle (defense zone)
8. **Selects "Trajectories + Passe"** → links to DC → draws pass to Pivot
9. **Selects "Trajectories + Course"** → links to Pivot → draws run forward
10. **Clicks "Save Exercise"** → names it "3v3 Def Pivot Focus" → saved to collection

**Total time:** ~3 minutes. Exercise ready for team explanation.

---

## Constraints & Assumptions

### [ASSUMPTION] Terrain View
- Demi-terrain vs Terrain Complet is **selected once at session start**, applies to all exercises in that séance
- Alternative: per-exercise choice (TBD with architecture)

### [ASSUMPTION] Player Limit Enforcement
- **6 outfield + 1 goalkeeper per team** is a hard limit (enforced on UI, not breakable)
- Coach cannot add 8th outfield player (button grayed out)

### [ASSUMPTION] Asset Library
- Assets are **predefined list** (Plots, Cones, Haies, etc. from current Board system)
- No custom asset creation in v1

### [ASSUMPTION] Trajectory Linking
- Trajectories are **always linked to a specific player** (course, pass, shot, etc.)
- No "free-floating" trajectories unlinked to players

### [ASSUMPTION] No Template Enforcement
- Coach has **complete freedom** to place any poste anywhere (no "illegal formation" rules)
- Even 7 pivots + 0 other players is allowed (weird but permitted)

---

## Out of Scope (Defer)

- **Animation playback** of exercise (play courses + passes in sequence) — defer to v2
- **Tactical AI suggestions** (this formation is weak defensively) — defer to v2
- **Multi-coach collaboration** (shared séance editing) — defer to v2
- **Exercise templates** (predefined 3v3, 6v6 formations) — defer to v2, optional enhancement
- **Video/image import** (attach video of a course) — defer to v2

---

## Next Steps (Architecture & Implementation)

1. **Architecture Review** → bmad-architecture determines:
   - Dock vs sidebar placement for player/asset/trajectory selection
   - Storage (localStorage, backend, file format)
   - Undo/Redo strategy
   - Terrain reflow (keep centered while Dock/sidebar present)

2. **Epics & Stories** → bmad-create-epics-and-stories breaks into:
   - Player selection & placement logic
   - Asset selection & placement logic
   - Trajectory drawing logic
   - Save/load exercise data
   - UI/UX refinement

3. **Implementation** → Multi-sprint delivery (TBD with architecture)
