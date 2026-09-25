---
title: 'Mode Exercise Builder — Layout Dock/Sidebar/Canvas'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context: []
baseline_commit: '3ccefe4106358c6fc295675cc7c2f1cc6ad2574b'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `board.html`'s `.app-shell` grid is still the legacy 2-column layout (`256px 1fr`, no dock row) even though a working `.dock`/`#panel` system (Dock UI v1) already exists and is loaded — the dock currently overlays the page rather than being reserved space in the grid, so nothing guarantees the canvas stays centered and unobscured once the dock is visible.

**Approach:** Update `.app-shell`'s CSS grid to reserve a bottom row for the existing `.dock` and keep `.sidebar` + canvas as the other two areas, per Architecture Spine AD-10 (`grid-template-areas: "sidebar canvas" "dock dock"`). Reuse the existing dock/sidebar/panel markup and JS as-is — this story is layout-only, not new dock content.

## Boundaries & Constraints

**Always:** Reuse the existing `.dock`, `.sidebar`, `#panel` elements and `dock.js` click plumbing exactly as they are — do not rewrite dock click handlers or panel-open logic. Keep the existing `#saveLocal` button working exactly as today (same id, same handler); repositioning it visually is fine, removing or renaming it is not. The dock must remain reachable within the viewport on the 1024×600px tablet target without scrolling — `.app-shell` currently uses `min-height: 100vh`, which lets its real height grow past the viewport when sidebar/canvas content is tall; this must be constrained (e.g. `height: 100vh` with internal scroll on the canvas/sidebar areas only, not the whole shell) so the dock's grid row stays within the visible viewport at all times.

**Never:** Do not populate panel content for "players", "trajectories", or any other currently-empty dock tool — that's Epic 2/3/4 work, out of scope here. Do not add a dropdown/menu to the dock (Spine AD-4 describes one, but no epic has scoped building it yet) — the 10 separate icon buttons stay as they are. Do not change how `#saveLocal` persists exercises (still POSTs to `/api/exercises`, no new storage mechanism).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desktop viewport | `board.html` loaded at ≥1400px width | Sidebar (220px) left, canvas centered filling remaining width, dock fixed 64px row at bottom, none overlapping | N/A |
| Tablet viewport | `board.html` loaded at 1024×600px | Sidebar collapses to 120px per existing `sidebar.css` breakpoints, canvas remains fully visible with no horizontal scroll, dock stays within the visible viewport (bounding rect bottom ≤ 600px) with no vertical scroll needed to reach it | N/A |
| Dock panel opened | Coach clicks a dock icon (e.g. "assets") | `#panel` slides in as it does today; canvas area shrinks/adjusts if `panel.css` already defines that, but sidebar and dock positions are unaffected | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/css/styles.css:64-70` -- `.app-shell` grid, currently `grid-template-columns: 256px 1fr` with no dock row; this is the rule to change to the 3-area grid (`sidebar canvas` / `dock dock`).
- `web-board/src/css/dock.css` -- existing dock styling; verify how `.dock` is currently positioned (likely `position: fixed`/`absolute` as an overlay) and adjust only if the new grid area requires it to become a grid child instead of an overlay.
- `web-board/src/css/sidebar.css` -- existing responsive sidebar width rules (120px tablet / 180-220px desktop per prior Dock UI v1 work); reuse as-is, just ensure `.sidebar` becomes a grid item under the new `.app-shell` rules instead of a plain flex child of the old 2-column grid.
- `web-board/pages/board.html:19` -- `<aside class="sidebar">`, `:174` -- `<nav class="dock">`, `:207` -- `<div id="panel">` -- existing markup order; grid-area assignment happens via CSS, markup structure should not need reordering unless the canvas element isn't a sibling of `.sidebar`/`.dock` at the right nesting level (verify during implementation).
- `web-board/pages/board.html:25` -- `<button id="saveLocal">` -- existing Save button inside the header; confirm it remains reachable/visible after the grid change (header is presumably above/outside `.app-shell` — verify).

## Tasks & Acceptance

**Execution:**
- [x] `web-board/src/css/styles.css` -- change `.app-shell` grid to `grid-template-columns: [sidebar] 1fr; grid-template-rows: 1fr 64px; grid-template-areas: "sidebar canvas" "dock dock";`, constrain `.app-shell` to `height: 100vh` (not `min-height`) so it cannot grow past the viewport, and assign `grid-area: sidebar` / `grid-area: canvas` / `grid-area: dock` to the corresponding elements -- makes the canvas, sidebar, and dock coexist as defined grid regions that stay within the viewport instead of the shell growing past it (Spine AD-10)
- [x] `web-board/src/css/styles.css` -- add `overflow-y: auto` to whichever of `.sidebar`/`.main-panel` needs internal scrolling for tall content, now that `.app-shell` itself no longer grows past `100vh` -- preserves access to long sidebar content without letting it push the dock off-screen
- [x] `web-board/src/css/dock.css` -- adjust `.dock` positioning if needed so it participates in the grid (`position: static` or `relative` inside its grid area) rather than floating as a fixed overlay that ignores the grid -- prevents the dock from covering canvas content at any breakpoint
- [x] `web-board/pages/board.html` -- verify (and adjust only if necessary) that the canvas container is a direct grid child alongside `.sidebar` and `.dock` under `.app-shell` -- required for the grid areas to apply correctly
- [x] Automated check (Playwright or equivalent) at 1024×600px -- assert `.dock`'s bounding rect bottom is ≤ 600 (visible without scrolling), not just that there's no horizontal scroll -- this is the exact gap that caused the first review loopback
- [x] Manual breakpoint check at ≥1400px -- confirms no regression in the existing responsive sidebar behavior from prior Dock UI v1 work

**Acceptance Criteria:**
- Given the coach loads `board.html` at desktop width, when the page renders, then sidebar, canvas, and dock occupy distinct, non-overlapping grid regions matching Spine AD-10's layout
- Given the coach loads `board.html` at 1024×600px (tablet), when the page renders, then the canvas remains fully visible with no horizontal scroll and the dock stays at the bottom
- Given the coach clicks any dock icon, when `#panel` opens, then the sidebar and dock remain in their fixed grid positions (only the panel/canvas area is affected)
- Given the coach clicks `#saveLocal`, when the save completes, then behavior is unchanged from before this story (same POST to `/api/exercises`)

## Implementation Notes

- `.dock` (`<nav class="dock">`) was moved from a sibling of `.app-shell` into `.app-shell` itself (as the third grid child alongside `.sidebar` and `.main-panel`) so it can be assigned `grid-area: dock`. `#panel` stayed outside `.app-shell` — it is `position: fixed` in `panel.css` and was already positioned independently of any parent, so its DOM location is irrelevant to layout.
- `.dock` changed from `position: fixed` (bottom-center overlay) to a grid item (`position: relative`, `grid-area: dock`, `align-self/justify-self: center`) so it occupies the reserved 64px bottom row instead of floating over the canvas. Its own fit-content sizing, padding, glassmorphism styling and icon markup were left untouched.
- `.sidebar` and `.main-panel` (the canvas container) each got `grid-area` assignments; `.main-panel` also got `min-width: 0; overflow-x: hidden` so the fixed-width `<canvas>` element cannot force horizontal page scroll at the 1024px tablet breakpoint (grid items default to `min-width: auto`, which otherwise lets content overflow the track).
- `.app-shell`'s column track changed from a hardcoded `256px 1fr` to `auto 1fr` because `.sidebar` already sets its own responsive `width` per breakpoint (120/180/220px) in `sidebar.css`; `auto` lets that existing rule keep controlling sidebar width instead of a conflicting fixed track size.
- **Loop-2 fix (this pass):** `.app-shell` changed from `min-height: 100vh` to `height: 100vh`, which by itself was not sufficient — CSS Grid rows/columns default their items to `min-width`/`min-height: auto`, meaning tall intrinsic content in `.sidebar` or `.main-panel` can still stretch the `1fr` row past the shell's 100vh and push `.dock`'s row off-screen even with a fixed shell height. Added `min-height: 0` to both `.sidebar` and `.main-panel` (alongside the existing `min-width: 0` on `.main-panel`) so their intrinsic content size can no longer override the grid track sizing, and `overflow-y: auto` to `.main-panel` (kept `.sidebar`'s pre-existing `overflow-y: auto`) so any content taller than the row scrolls internally instead of growing the shell. This is the actual mechanism that keeps `.dock`'s grid row pinned to the last 64px of the viewport at all times.
- Verified `.assets-grid`/`.assets-back-button` (pre-existing `position: fixed` overlays shown in "assets mode", noted as low-severity in the Review Triage Log) still render fully inside the viewport at both 1024×600 and 1600×900 after this change — no regression, left untouched as the triage log directed.
- Verified with a local static server + Playwright (Chromium) at 1600×900 and 1024×600: `.sidebar`/`.main-panel`/`.dock` bounding rects are non-overlapping; `.dock`'s bounding-rect `bottom` equals the viewport height exactly (836→900 desktop, 536→600 tablet) confirming it is fully visible with zero scroll needed; `document.body.scrollWidth === window.innerWidth` (no horizontal scroll) and `document.documentElement.scrollHeight <= window.innerHeight` (no vertical page scroll) at both sizes. Clicked all non-"assets" dock icons (players/trajectories/animation) and confirmed `#panel` opens/closes while `.sidebar` and `.dock` rects stay fixed; "assets" icon correctly uses its pre-existing in-dock grid mode (not `#panel`) — unrelated to this story. No JS console errors were introduced (pre-existing 404/JSON parse log for a missing resource is unrelated to this change and present before it too).
- `#saveLocal` and its POST-based save flow were not touched (no JS files were modified); clicked it post-change with a `pageerror` listener attached — no errors.

## Spec Change Log

- **Triggering finding:** Review loop 1 found (high, bad_spec) that on the 1024×600px tablet target, `.app-shell`'s real height reached 988px because of `min-height: 100vh`, pushing the newly-grid-flowed `.dock` entirely below the visible viewport (measured bottom: 988px vs 600px viewport) — the dock became unreachable without scrolling.
- **What was amended:** Boundaries & Constraints now requires `.app-shell` to be height-constrained (`height: 100vh`, not `min-height`) with internal scroll delegated to sidebar/canvas instead of the whole shell growing. Added a corresponding task to add `overflow-y: auto` where needed, and an automated check asserting the dock's bounding rect stays within the viewport on tablet (not just "no horizontal scroll," which the first implementation already satisfied while still shipping this bug).
- **Known-bad state avoided:** Shipping a dock that's technically laid out via CSS Grid correctly but is scrolled out of view on the exact tablet size (Asus C425T, PRD NFR6) this whole feature targets.
- **KEEP:** The grid-area approach itself (`sidebar`/`canvas`/`dock` areas, `.dock` becoming a grid item instead of `position: fixed`) is correct and verified working for desktop layout and dock-panel interaction — do not revert to the fixed-overlay dock model. The `.main-panel { min-width: 0; overflow: hidden }` fix for horizontal-scroll prevention is correct and should be kept as-is. The HTML nesting change (moving `<nav class="dock">` inside `.app-shell`) is correct and should be kept as-is.

## Review Triage Log

- **high** — On the tablet target viewport (1024×600px), `.app-shell`'s real rendered height is 988px (measured via Playwright) because `min-height: 100vh` lets sidebar/canvas content grow past the viewport; the dock — now a grid item in-flow rather than `position: fixed` — ends up at `top: 924px, bottom: 988px`, entirely below the 600px-tall visible viewport. The dock is completely off-screen and requires scrolling to reach, directly contradicting this story's own AC ("the dock stays at the bottom" on tablet) and PRD NFR6 ("Asus C425T (1024×600px) fully functional, no horizontal scroll" — implies full functionality including reaching the dock). Verified independently by measuring `.dock`'s bounding rect against the 600px viewport; the implementer's tablet check only asserted `scrollWidth === innerWidth` (no horizontal scroll) and never checked vertical dock visibility. Groups the edge-case-hunter findings on `.assets-back-button` (assets-grid.css:332-336, still `position: fixed` anchored to real viewport bottom) and `sidebar.css:383`'s `max-height: calc(100vh - ...)` (same stale fixed-viewport assumption) — all three share the same root cause: the dock's move from viewport-fixed to grid-flow was not carried through to the sibling rules that still assume "dock sits at the true bottom of the viewport." Route: **bad_spec** — the spec's Intent/Approach only described the desired end-state grid areas, not that `.app-shell` needs a height constraint (e.g. `height: 100vh` with internal scroll, or a different dock-visibility strategy) to keep the dock reachable when content is tall; this is a real gap the spec should have surfaced as a constraint, not something the smallest patch can safely paper over without deciding how tall content should behave. **RESOLVED**: `.app-shell` changed to `height: 100vh`, plus `min-height: 0` on `.sidebar`/`.main-panel` (required because grid items default to `min-height: auto`, which alone would still let content stretch the row past 100vh even with a fixed shell height) and `overflow-y`/`overflow-x` split on `.main-panel`. Independently re-verified via Playwright: tablet (1024×600) shell height = 600px exactly, dock bounding rect `{top: 536, bottom: 600}` fully within viewport, page `scrollHeight` = 600 (no page scroll); desktop (1600×900) dock bottom = 900px exactly; sidebar retains internal scrollability (`scrollHeight: 2003 > clientHeight: 520`) so long content stays reachable; dock-panel click interaction still works.
- **low** — `sidebar.css:383`'s `max-height: calc(100vh - var(--dock-height) - var(--spacing-lg))` may now diverge slightly from the sidebar's actual grid-row height. Verified the rule exists but found no demonstrated clipping/scroll-gap symptom distinct from the high finding above (both stem from the same `min-height: 100vh` root cause). Folded into the high finding's fix rather than tracked separately.
- **low** — Blind-hunter's `--dock-height` "never defined" claim: **false**. Confirmed via grep that `--dock-height: 64px` is defined in `design-tokens.css:121`, imported before `styles.css` uses it (established import order from Sprint 1). The reviewer only saw the isolated diff, not the full file.
- **low** — Blind-hunter's `.main-panel { overflow: hidden }` clipping children claim: **false** for the concrete case checked. `#panel` (the dock's flyout) is `position: fixed` and not a DOM child of `.main-panel` — verified via board.html structure. The `overflow: hidden` addition is explicitly justified in Implementation Notes (prevents the fixed-width canvas from forcing horizontal scroll) and the horizontal-scroll AC was independently verified. Rejected.
- **low** — Blind-hunter's HTML nesting concern (can't verify `<div>`/`<nav>` pairing from the diff hunk alone): **false**, resolved by reading the full file directly — `.app-shell` opens line 17, closes line 201 after `.dock`'s `</nav>`; `.sidebar` and `.main-panel` are properly nested siblings within it. Nesting is correct.
- **low** — Blind-hunter's `.sidebar { grid-template-columns: auto 1fr }` "unbounded width" claim: **false**. `.sidebar` itself sets an explicit `width` per breakpoint (120px tablet / 180-220px desktop, verified in sidebar.css) from prior Dock UI v1 work — the `auto` grid track defers to that existing constraint by design, as the Implementation Notes state; not a new unbounded behavior.
- **low** — Blind-hunter's "AD-10 reference is unexplained" and "no test/snapshot for this structural change" findings: rejected. AD-10 is an established Architecture Spine convention already used throughout this project's other specs; a codebase-wide convention is not a defect of this diff. Missing visual-regression tooling is a pre-existing project-wide gap, not something this story's intent asked for or that a targeted patch here could reasonably add.

## Verification

**Manual checks (if no CLI):**
- Load `board.html` in a desktop-width browser window; verify sidebar (left), canvas (center), dock (bottom) each occupy separate regions with no overlap.
- Resize to 1024×600px; verify sidebar collapses per existing breakpoint rules, canvas stays fully visible, no horizontal scroll appears.
- Click each of the 10 dock icons once; verify `#panel` opens/closes as it did before this change (no regression to existing dock.js behavior).
- Click "Enregistrer" (`#saveLocal`); verify the existing save flow still completes without errors.
