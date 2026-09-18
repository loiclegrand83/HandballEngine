# Dock UI — Addendum (Technical & Design Depth)

## Design System & Icons

*Awaiting UX design review — this section will be populated with:*
- Icon set design (one per tool, visual metaphor + scalability notes)
- Color/style guidelines (matching Handball Engine dark theme + yellow accents)
- Icon sizing per surface (tablet 32px, desktop 40–48px)

## Sidebar Menu Architecture

*Awaiting UX review — expected structure:*
- Collapsible menu tree (Vue, Exercice, Options)
- Labels and nesting rationale
- Compact variant (tablet icon-only or minimal text)
- Full variant (desktop with descriptive labels)

## Layout & Responsiveness

### Tablet (Asus C425T, 10" landscape, ~1024×600px)

```
┌─────────────────────────────────────┐
│ [S]         TERRAIN COMPLET         │ S = Sidebar (120px, collapsed or icon-only)
│             (Canvas Area)            │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [🎮] [🎯] [📍] [▶️] [📚] [📋] [📅] │ Dock (bottom, horizontal, ~60px)
└─────────────────────────────────────┘
```

### Desktop (24" monitor, 1920×1080px, mouse/keyboard)

**Option A: Dock on Left (vertical bar)**
```
┌──┬───────────────────────────────────┐
│D ││              TERRAIN              │ D = Dock (60px wide, vertical icons)
│O ││              COMPLET               │ S = Sidebar (200px, collapsible menus)
│C ││              (Canvas Area)         │
│K ││                                   │
│  ││                                   │
├──┼───────────────────────────────────┤
│  │├────────────────────────────────┤│
│  ││           S I D E B A R        ││
│  ││ Vue (expand)                   ││
│  ││   ☐ Terrain complet            ││
│  ││   ☐ Demi-terrain               ││
│  ││ Exercice (expand)              ││
│  ││   ☐ Nom: [______]              ││
│  ││   ☐ Thématique: [dropdown]     ││
│  │├────────────────────────────────┤│
│  ││          OPTIONS               ││
│  ││ Avancé (expand)                ││
│  ││   ☐ Durée, Joueurs, Niveau     ││
│  │└────────────────────────────────┘│
└──┴───────────────────────────────────┘
```

**Option B: Dock on Bottom (horizontal bar, traditional)**
```
┌─────────────────────────────────────┐
│┌──────┐      TERRAIN COMPLET       │ S = Sidebar (200px, left)
││      │      (Canvas Area)          │
││  S   │                             │
││      │                             │
││ I    │                             │
││ D    │                             │
││ E    │                             │
││ B    │                             │
││      │                             │
││      │                             │
│└──────┘                             │
├─────────────────────────────────────┤
│ [🎮] [🎯] [📍] [▶️] [📚] [📋] [📅] │ Dock (bottom, horizontal)
└─────────────────────────────────────┘
```

**Decision deferred:** Coach (Loic) to indicate preference — left vertical dock (macOS-like) or bottom horizontal (current) on desktop.

## Technical Decisions

### State Management (Icon Highlight)
- Selected tool persists as a CSS class (`.dock-icon.active`)
- Switching tools removes previous `.active` and applies to new icon
- On panel close, icon remains highlighted until a different tool is clicked

### Sidebar Toggle State
- Each collapsible section stores its open/closed state in `localStorage` (persists across sessions)
- Key format: `sidebar-section-{section-name}` (e.g., `sidebar-section-vue`)
- Default state: all sections collapsed (to reduce visual clutter on first load)

### Canvas Reflow
- Canvas size recalculated on window resize (listen to `resize` event)
- Formula: `canvasWidth = viewportWidth - sidebarWidth - dockWidth` (adjust per layout)
- Formula: `canvasHeight = viewportHeight - dockHeight` (for bottom dock) or `viewportHeight` (for side dock)
- Terrain scaling handled by existing canvas logic

### Performance
- Icon hover/click handlers debounced (50ms) to prevent rapid toggle spam
- Panel open/close uses CSS transitions (no JS animation) for 60fps
- Sidebar expand/collapse uses max-height CSS animation or `<details>` HTML element (native, performant)

## Out-of-Scope Clarifications

- **Keyboard shortcuts:** Not in v1; future enhancement (e.g., `P` for Players, `A` for Assets)
- **Dock reordering:** Users cannot drag/reorder icons (fixed order by tool category)
- **Theme switching:** Dark theme only for v1; light mode deferred
- **Gesture support:** Tablet pinch-to-zoom on canvas not addressed; assume canvas zoom via buttons or keyboard

## Decisions Confirmed (from Loic)

✅ **1. Dock placement on desktop:** **Bottom (horizontal)** — consistent with tablet layout  
✅ **2. Sidebar defaults:** **Collapsed** — sections start folded, users expand as needed (cleaner, less clutter)  
✅ **3. Icon preference:** **Custom-designed, realistic Handball Engine icons** — not generic reuse, clear visual identifiers

These decisions eliminate the three deferrable options. PRD is now fully scoped and ready for dev handoff.

## Success Criteria (Repeat from PRD)

- ✅ All toolbar options accessible from dock without vertical scroll
- ✅ Dock load <100ms, interaction response <50ms
- ✅ No canvas scrolling needed on tablet (landscape) or desktop (wide)
- ✅ Touch targets ≥44px on tablet
- ✅ 60fps canvas responsiveness (animation, player placement, etc.)
