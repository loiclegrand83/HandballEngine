---
title: 'Dock panel pushes the canvas, never covers it'
type: 'bugfix'
created: '2026-10-09'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `#panel` sits outside `.app-shell`'s CSS grid entirely (it's a `body`-level sibling, `position: fixed`, `z-index: 99` — "just below dock to avoid overlap"). It floats over the canvas and can cover Dock icons, silently swallowing clicks (QA finding #3). The z-index approach only avoids the Dock bar itself; it never gives the canvas real space back.

**Approach:** Move `#panel` inside `.app-shell` as a real grid participant. When open, `.app-shell` gains a 3rd grid column (`auto 1fr 300px`) with the panel in its own `grid-area`, so the canvas column genuinely shrinks — not just gets covered. On tablet (<1024px, where `.panel` already goes full-width per existing responsive rules), keep the current overlay behavior unchanged: there's no room to coexist with the canvas on small screens, and the spec/AD-4 scope is the desktop push-layout bug, not a tablet redesign.

## Boundaries & Constraints

**Always:** Preserve the existing `.panel.hidden` / slide animation behavior exactly as-is — only the positioning mechanism changes (fixed-overlay → grid-flow), not the open/close animation or timing. Keep `.panel`'s existing tablet breakpoint (`@media (max-width: 1023px)`, full-width overlay) untouched — this story only fixes desktop/tablet-landscape push-layout.

**Never:** Do not touch `.assets-grid` or its positioning (separate component, already has its own documented history of this exact bug class — out of scope here). Do not change the Dock bar's own layout or z-index. Do not introduce a new CSS file — the shared grid-template addition belongs in `panel.css` per AD-4's single-ownership rule.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open Joueurs panel (desktop) | Viewport ≥1024px, panel closed | Canvas column visibly shrinks by 300px; panel appears in its own grid column, not floating over canvas or Dock | N/A |
| Click a Dock icon while a panel is open | Panel open, coach clicks a different Dock icon | Click registers on the Dock icon (no interception) — Dock bar is never covered regardless of panel state | N/A |
| Click near left/bottom canvas edge while panel open | Panel open, coach clicks terrain near its boundary with the panel | Click registers on the canvas, not swallowed by the panel's former overlay footprint | N/A |
| Close panel | Panel open, coach clicks close (×) or panel icon again | Canvas column returns to full width (`1fr`), panel grid column collapses | N/A |
| Tablet viewport (<1024px) | Viewport 768px, coach opens a panel | Existing full-width overlay behavior unchanged — panel still covers canvas on small screens (no room to push) | N/A |

</frozen-after-approval>

## Code Map

- `web-board/pages/board.html:206` -- `<div id="panel" class="panel hidden">` currently sits as a sibling of `.app-shell` (after its closing `</div>` at line 203) -- move this entire `#panel` block to be a child of `.app-shell`, placed after `.main-panel` (line 169) and before `.dock` (line 172), so it becomes a grid item
- `web-board/src/css/styles.css:64-74` -- `.app-shell` grid definition (`grid-template-columns: auto 1fr`, `grid-template-areas: "sidebar canvas" "dock dock"`) -- add a `.app-shell.panel-open` variant with a 3rd column and `panel` area; base (no-panel) grid stays unchanged
- `web-board/src/css/panel.css:9-34` -- `.panel` rule block (`position: fixed`, `z-index: var(--z-panel)`, `transform: translateX(-100%)` slide animation) -- remove `position: fixed` and the `left/top/bottom` offsets; keep the slide/fade transition and `.hidden`/visible state classes exactly as-is; add `grid-area: panel` so it participates in the new grid area
- `web-board/src/css/panel.css:287-291` -- existing tablet breakpoint (`@media (max-width: 1023px)`) already sets `.panel { width: 100%; ... }` -- verify this still produces a full-width overlay once `position: fixed` is removed from the base rule (likely needs `position: fixed` reintroduced inside this specific media query, scoped to tablet only, so small screens keep the overlay behavior while desktop gets grid-flow)
- `web-board/src/js/dock.js:272-296` -- `openPanel()`/`closePanel()` -- alongside the existing `panel.classList.remove/add('hidden')` calls, add `appShell.classList.add/remove('panel-open')` (new DOM reference to `.app-shell` needed near the existing `dock`/`panel` reference block at dock.js:65-70)
- `web-board/src/js/canvas-reflow.js:11-36,45-66` -- `calculateCanvasDimensions()` only subtracts `getSidebarWidth()` from `window.innerWidth`; it has no concept of an open Dock panel, so `#boardCanvas`'s actual pixel dimensions never shrink to match its now-narrower `.main-panel` container, leaving the canvas's right edge physically overlapped by the panel even though the container itself reflowed correctly. The file already exposes `window.reflowCanvas()` as a public API (`canvas-reflow.js:188`) specifically for other code to trigger a recalculation -- reuse that instead of adding a new panel-aware `getPanelWidth()` helper (simpler: `calculateCanvasDimensions()` can read `.app-shell`'s own `panel-open` class state the same way it already reads sidebar width, OR the panel-width subtraction can be added directly). Call `window.reflowCanvas()` from `dock.js`'s `openPanel()`/`closePanel()`, same place the `panel-open` class is toggled, so the canvas recalculates on the same event that resizes its container -- no new MutationObserver needed since the trigger point is already known and single-sited.

## Tasks & Acceptance

**Execution:**
- [ ] `web-board/pages/board.html` -- move `#panel` inside `.app-shell`, positioned after `.main-panel` and before `.dock` -- makes it a real grid item instead of a floating body-level sibling
- [ ] `web-board/src/css/styles.css` -- add `.app-shell.panel-open { grid-template-columns: auto 1fr 300px; grid-template-areas: "sidebar canvas panel" "dock dock dock"; }` -- defines the 3-column layout that shrinks the canvas when a panel is open
- [ ] `web-board/src/css/panel.css` -- remove `position: fixed` and positional offsets from base `.panel`, add `grid-area: panel`; reintroduce `position: fixed` (full-width overlay) scoped inside the existing `@media (max-width: 1023px)` block so tablet keeps today's overlay behavior -- panel becomes a grid-flow element on desktop, stays an overlay on small screens
- [x] `web-board/src/js/dock.js` -- add `const appShell = document.querySelector('.app-shell');` near the existing DOM reference block; toggle `appShell.classList.add('panel-open')` in `openPanel()` and `appShell.classList.remove('panel-open')` in `closePanel()`, alongside the existing `panel.classList` toggles -- drives the grid-template switch from the same single open/close code path
- [ ] `web-board/src/js/canvas-reflow.js` -- add a `getPanelWidth()` function (same pattern as `getSidebarWidth()`: read `.panel`'s computed width only when `.app-shell` has `panel-open`, else 0) and subtract it in `calculateCanvasDimensions()`'s width formula -- makes the canvas element itself shrink to match its container, not just the container
- [ ] `web-board/src/js/dock.js` -- call `window.reflowCanvas()` (if present) from `openPanel()` and `closePanel()`, right after the `appShell.classList` toggle -- triggers the canvas recalculation on the exact event that changes panel state, no polling or observer needed

**Acceptance Criteria:**
- Given the viewport is ≥1024px and I open the Joueurs panel, when I inspect the canvas container's computed width, then it is visibly narrower than before the panel opened (grid column shrank, not covered)
- Given a panel is open, when I click any Dock icon, then the click registers on that icon — no icon is ever unclickable due to panel overlap
- Given a panel is open on desktop, when I click near the canvas edge closest to the panel, then the click lands on the canvas, not on invisible panel overlay space
- Given the viewport is <1024px, when I open a panel, then it still covers the canvas as a full-width overlay (unchanged tablet behavior)
- Given a panel is open, when I close it, then the canvas returns to full width and the Dock bar's own layout is unaffected

## Implementation Notes

All 4 planned tasks (HTML move, grid CSS, panel.css base+tablet, dock.js class toggle) implemented and verified working for the *container* layout: `.main-panel` correctly shrinks by 300px when a panel opens, all 10 Dock icons stay clickable, tablet overlay behavior preserved, and the class toggles correctly on open/close.

**Found and closed a gap the Code Map didn't account for.** Playwright verification caught that `#boardCanvas` itself (the `<canvas>` element, not its `.main-panel` container) did NOT shrink when the panel opened — its bounding box still extended into the panel's space, so the canvas's right edge was physically covered by the panel despite the container reflow working correctly. Root cause: `canvas-reflow.js`'s `calculateCanvasDimensions()` only subtracted `sidebarWidth` from viewport width, with no awareness of an open Dock panel.

Resolved without needing user input — the existing `canvas-reflow.js` already exposed `window.reflowCanvas()` as a public API built for exactly this kind of external trigger, and already had a `getSidebarWidth()` pattern to mirror. Added `getPanelWidth()` (same pattern: reads `.panel`'s computed width only when `.app-shell.panel-open` is set), subtracted it in `calculateCanvasDimensions()`, and called `window.reflowCanvas()` from `dock.js`'s `openPanel()`/`closePanel()` right alongside the `panel-open` class toggle — same trigger point, no new observer or polling needed. Re-verified with Playwright: canvas bounding box now exactly matches `.main-panel`'s shrunk width, and a click at the canvas's right edge correctly resolves to `#boardCanvas`, not the panel.

Review (blind-hunter) found one real high-severity regression: `.app-shell.panel-open`'s 3-column grid had no viewport scope, so on tablet (<1024px, where the panel overlays via `position: fixed`) the canvas container was still squeezed by a phantom 300px column nothing occupied — a new bug worse than the one this story fixes. Patched by wrapping the grid rule in `@media (min-width: 1024px)` (styles.css) and adding the matching `window.innerWidth < 1024` check to `getPanelWidth()` (canvas-reflow.js), so both the CSS grid and the canvas element's pixel dimensions agree on the same breakpoint as `.panel`'s own tablet overlay rule. Re-verified: tablet canvas width unaffected by panel state; desktop behavior unchanged; resizing across the breakpoint while a panel is open correctly recalculates via the existing `setupMediaQueryListener()`.

## Verification

**Manual checks (if no CLI):**
- Resize browser to ≥1024px, open Joueurs panel via Playwright or manually — confirm canvas container's bounding box width shrank and no element overlaps the Dock bar (`document.elementsFromPoint` on each Dock icon's center should return that icon, not the panel)
- With panel open, click a point near the canvas edge adjacent to the panel — confirm it registers on `#boardCanvas`, not `#panel`
- Resize to <1024px (e.g. 768px), open a panel — confirm it still overlays full-width as before (no regression to tablet UX)
- Open then close a panel — confirm `.app-shell` no longer has `panel-open` class and canvas returns to original width

## Review Triage Log

- **high, patch** — `.app-shell.panel-open`'s 3-column grid rule had no viewport scope, so on tablet (<1024px, where `.panel` already overlays via `position: fixed`) the canvas container was squeezed by a phantom 300px grid column nothing occupied — a worse regression than the bug this story fixes. Confirmed live via Playwright (tablet `.main-panel` width dropped from 648px to 348px on panel open, pre-fix). Patched: wrapped the grid rule in `@media (min-width: 1024px)` (styles.css) and added a matching `window.innerWidth < 1024` check to `getPanelWidth()` (canvas-reflow.js) so CSS grid and canvas pixel dimensions agree on the same breakpoint as `.panel`'s own tablet rule. Re-verified: tablet unaffected (0px shrink), desktop unchanged (300px shrink), breakpoint-crossing while a panel is open correctly recalculates.
- **low, rejected** — canvas reflow happens instantly on class toggle while `.panel` itself slides in over 200ms, causing a brief visual desync between panel animation and canvas content. Real but cosmetic — no click-swallowing, no data issue, rare to notice in normal use; fixing would require requestAnimationFrame-synced transition work beyond a simple correction.
- **false** — claimed `getPanelWidth()` risks reading a stale width mid-transition since `getComputedStyle` is called synchronously with no next-tick wait. Disproven by direct test: canvas width is already correct (880px) on the very same tick as the click, both immediately and after settling — `grid-template-columns` is not an animated/transitioned property here (only `.panel`'s own `transform`/`opacity` transition), so there's no mid-transition state to read stale.
- **low, rejected** — two positioning systems (grid-area for desktop, position:fixed for tablet) coordinated only by matching breakpoints across files, rather than a single shared state attribute. Reasonable refactor suggestion, no functional defect.
- **false** — claimed resizing across the 1024px breakpoint while a panel is open wasn't covered. Disproven by direct test: `setupMediaQueryListener()` (pre-existing) correctly triggers `reflow()` on the crossing, and the breakpoint-aware `getPanelWidth()` fix (from the high finding above) makes it recalculate correctly — canvas returns to full tablet width even though the `panel-open` class itself persists across the resize.
- **low, rejected** — `canvas-reflow.js`'s `MutationObserver` watches only `.sidebar`, not `.appShell`/`.panel`; today's only trigger is `dock.js`'s explicit `reflowCanvas()` calls, a coupling not enforced by the observer. No current code path bypasses this — `DockAPI.openPanel`/`closePanel` are the same functions already fixed, not a separate path. Hypothetical future risk, not a present defect.
- **false, pre-existing** — `.panel-overlay` dimmer backdrop CSS was flagged as now-stale given the push-layout change. Disproven: `.panel-overlay` has zero references in board.html or dock.js — it was already fully dead code before this story, unrelated to and unaffected by the panel-push change. Out of scope to clean up here.
- **false** — claimed `enterAssetsMode()`/`exitAssetsMode()` might not consistently apply the panel-open/reflow fix. Disproven: `exitAssetsMode()` calls `closePanel()` directly (already fixed); `enterAssetsMode()` never calls `openPanel()` at all — Assets-mode is a separate grid-replace-icons UI, not the `#panel` side panel, confirmed out of scope by this story's own Boundaries.
- **low, rejected** — `getPanelWidth()`'s JSDoc comment wording vs. an implicit invariant that `panel-open` is never present at page load. Confirmed correct as shipped: the class is never in static HTML and only ever toggled by the two functions already fixed — no present gap, cosmetic documentation nit at most.
