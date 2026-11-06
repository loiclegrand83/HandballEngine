---
title: 'Legacy Sidebar selection controls are removed'
type: 'refactor'
created: '2026-10-09'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Four legacy Sidebar control blocks (`#postButtons`, `#teamButtons`, `#drawModeButtons`, `#assetPalette`) still exist as a second selection UI alongside the Dock, driving the same shared `state` fields. QA confirmed this caused real desync (Dock panel showed stale selection after a Sidebar-driven change).

**Approach:** Delete all four DOM blocks from `board.html` entirely (not hidden/flagged), and strip every now-dead reference to them from `app.js`. Two of the four blocks (`#teamButtons`'s `<section>`, `#postButtons`'s `<details>`) contain nothing else and are removed as whole containers; `#drawModeButtons` sits inside a "Mode" section that also holds `syncCheckbox`/`playAnimation` (unrelated, still in use) — only the inner div is removed there. `selectAsset()`/`clearAssetSelection()`/`selectDrawMode()`/`selectTeam()`/`selectPost()` currently call `updateModeButtons()` or manipulate `.children` on these now-deleted elements as a side effect of updating shared state — those calls are load-bearing for every selection path including the Dock's (confirmed: `selectAsset` is called by the Dock Assets grid's `assetSelected` event, `selectDrawMode` by the Dock Trajectoires panel), so they're stripped, not left to throw on a missing element. `window.PlayerSelectionAPI` removal is a separate follow-up story (deferred — this story only removes the DOM/JS the Sidebar itself owns).

## Boundaries & Constraints

**Always:** Keep `state.selectedTeam`/`selectedPost`/`drawMode`/`selectedAssetIndex` mutation behavior identical — only the dead DOM-touching side effects are removed, not the state-setting logic itself. Keep `syncCheckbox` and `playAnimationButton` (siblings of `#drawModeButtons` inside the same "Mode" `<details>`) fully intact.

**Never:** Do not touch the Dock's own Assets grid (`.asset-grid-item`, `ASSET_ITEMS`, `createAssetsGrid()` in `dock.js`) — confirmed fully independent of the elements being removed. Do not touch `#viewModeButtons` (terrain view toggle) — explicitly exempt from Single Selection Source per FR5.1, not in scope for this story. Do not change `selectTeam`/`selectPost`/`selectDrawMode`/`selectAsset`'s state-mutation logic itself, only their dead DOM side effects. Do not touch `window.PlayerSelectionAPI` or `dock.js`'s calls into it (separate, independently-shippable follow-up story).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Select team via Dock | Coach opens Joueurs panel, clicks "Équipe B" | `state.selectedTeam` updates to `'B'`, no console error (no attempt to update a missing `teamButtons` element) | N/A |
| Select poste via Dock | Coach selects a poste in the Joueurs panel | `state.selectedPost` updates correctly, no console error | N/A |
| Select asset via Dock | Coach opens Assets grid, clicks "Plot" | `state.selectedAssetIndex` updates correctly via the existing `assetSelected` event path, no console error (no attempt to touch a missing `assetPalette`) | N/A |
| Select trajectory type via Dock | Coach opens Trajectoires panel, clicks "Course" | `state.drawMode` updates correctly, no console error | N/A |
| Page load | Fresh page load | No JS error from `document.getElementById('postButtons')`/`'teamButtons'`/`'drawModeButtons'`/`'assetPalette'` returning `null` and being dereferenced | N/A |
| Animation / sync checkbox | Coach uses "Lié à la trajectoire précédente" checkbox or "Animation" button in the Mode section | Both still work exactly as before — unaffected by `#drawModeButtons`'s removal | N/A |

</frozen-after-approval>

## Code Map

- `web-board/pages/board.html:46-70` -- "Mode" `<details>` section -- remove only the inner `<div class="button-group" id="drawModeButtons">...</div>` (lines 52-60); keep the `<details>` wrapper, the `syncCheckbox` label, and the "Animation" button block intact
- `web-board/pages/board.html:120-135` -- "Postes" `<details class="sidebar-section" data-section="postes">` -- remove the entire block (its only content is `#postButtons` and a now-meaningless hint paragraph about it)
- `web-board/pages/board.html:153-165` -- `.bottom-controls` div containing two `<section class="control-block">` blocks ("Équipe" / `#teamButtons`, "Haies" / `#assetPalette`) -- remove the entire `.bottom-controls` div (both sections exist solely for these two legacy controls)
- `web-board/src/js/app.js:21,27-28` -- `const assetPalette = ...`, `const drawModeButtons = ...`, `const teamButtons = ...` -- delete these three declarations
- `web-board/src/js/app.js:146` -- `updateModeButtons(drawModeButtons, mode)` inside `selectDrawMode()` -- delete this line
- `web-board/src/js/app.js:1015-1033` -- `createAssetButtons()` -- delete the entire function (only populated the now-removed `#assetPalette`); remove its call site in the `window.addEventListener('load', ...)` handler
- `web-board/src/js/app.js:1034-1036` -- `clearAssetSelection()` -- delete the `Array.from(assetPalette.children)...` line inside it; if the function body becomes empty, remove the function declaration and all its call sites too (verify at implementation time)
- `web-board/src/js/app.js:1039-1043` -- `selectAsset(index)` -- delete the `Array.from(assetPalette.children).forEach(...)` block; keep `state.selectedAssetIndex = index` and the `setStatus(...)` call
- `web-board/src/js/app.js:1781-1783` -- `drawModeButtons.addEventListener('click', ...)` -- delete this entire listener block
- `web-board/src/js/app.js:1791` -- `updateModeButtons(teamButtons, state.selectedTeam)` inside `selectTeam()` -- delete this line
- `web-board/src/js/app.js:1800` -- `updateModeButtons(postButtonsEl, post)` inside `selectPost()` -- delete this line
- `web-board/src/js/app.js:1804-1806` -- `teamButtons.addEventListener('click', ...)` -- delete this entire listener block
- `web-board/src/js/app.js:1810-1813` -- `const postButtonsEl = ...` and its `addEventListener('click', ...)` -- delete both
- `web-board/src/js/app.js:2473` -- `updateModeButtons(teamButtons, state.selectedTeam)` inside the `window.addEventListener('load', ...)` handler -- delete this line

## Tasks & Acceptance

**Execution:**
- [ ] `web-board/pages/board.html` -- remove `#drawModeButtons` div (keep Mode section wrapper), remove the entire Postes `<details>`, remove the entire `.bottom-controls` div -- deletes all 4 legacy control surfaces from the DOM
- [ ] `web-board/src/js/app.js` -- remove the 3 dead `const` declarations, strip `updateModeButtons(...)` calls on the removed elements from `selectDrawMode`/`selectTeam`/`selectPost`/the load handler, delete `createAssetButtons()` and its call site, strip DOM-touching lines from `selectAsset`/`clearAssetSelection`, delete the 3 dead click-listener blocks -- removes every reference to the deleted DOM elements without breaking the state-mutation logic other code depends on

**Acceptance Criteria:**
- Given the page loads fresh, when I check the browser console, then there are no errors from `null` DOM references
- Given I select team/poste/asset/trajectory-type through any Dock panel, when the selection updates, then no console error occurs and the selection is visually/functionally correct
- Given I use the "Lié à la trajectoire précédente" checkbox or the Animation button, when I interact with them, then they work exactly as before this story
- Given I search the codebase for `postButtons`, `teamButtons`, `drawModeButtons`, `assetPalette`, when I grep `app.js` and `board.html`, then no reference to the deleted DOM elements remains

## Implementation Notes

All planned HTML/JS removals applied exactly as Code Map specified — no surprises, no scope growth. `createAssetButtons()` deleted entirely along with its call site (its only purpose, populating `#assetPalette`, no longer exists; its initial `selectAsset(...)` call was redundant with `state.selectedAssetIndex`'s existing default of `1`). `clearAssetSelection()` became fully empty once its only line (touching `assetPalette`) was removed, so it and both its call sites (inside `selectTeam`/`selectPost`) were deleted per the spec's own contingency clause.

Verified via Playwright: zero console errors across page load, Joueurs panel (team + poste + placement), Assets panel (select + place), Trajectoires panel (select type + draw, requires a placed player — confirmed working), and the Animation button. All 4 legacy DOM elements confirmed absent (`getElementById` returns `null`/falsy for all). `syncCheckbox` and `playAnimation` confirmed still present and functional, unaffected by the `#drawModeButtons` removal in the same section.

Review found one real gap not in the original Code Map: `styles.css` still defined `.palette`, `.asset-button`/`:hover`/`.selected`, and `.bottom-controls`/`.control-block` — dead CSS styling exactly the HTML this story removed. Confirmed `.asset-label` is still live (shared with the Dock's own Assets grid, `dock.js:361`) and kept; the rest was removed. Re-verified no regression after the CSS cleanup.

## Verification

**Manual checks (if no CLI):**
- Load the board fresh, open browser devtools console, confirm zero errors
- Exercise every Dock panel (Joueurs: team + poste, Assets: pick an item, Trajectoires: pick a type with a player placed) and confirm each works with no console errors
- Toggle the "Lié à la trajectoire précédente" checkbox and click Animation, confirm both still function
- `grep -rn "postButtons\|teamButtons\|drawModeButtons\|assetPalette" web-board/src/js/app.js web-board/pages/board.html` -- expect zero matches

## Review Triage Log

- **medium, patch** — `styles.css` still defined `.palette`, `.asset-button` (+`:hover`, `.selected`, and a `:focus-visible` selector entry), and `.bottom-controls`/`.control-block` (+`h2`) — dead CSS styling the exact HTML this story deleted, a gap the original Code Map missed. Confirmed `.asset-label` (adjacent rule) is still live, used by the Dock's own Assets grid (`dock.js:361`) — kept as-is. Patched: removed the dead rules, preserved the shared one. Re-verified no regression (all Dock flows still work, zero console errors).
- **false** — startup asset selection flagged as now relying solely on a hardcoded `state.selectedAssetIndex: 1` default instead of the old `createAssetButtons()`'s dynamic `assets.findIndex(asset => !asset.hidden)` lookup. Confirmed both already resolve to the same index today (only `assets[0]` has `hidden: true`), and the hardcoded default pre-existed this diff — not introduced by this story. The "what if `assets[1]` becomes hidden later" concern is a hypothetical about future unrelated changes, not a present defect.
- **low, rejected** — the "Mode" `<details>` section now contains only the sync checkbox and Animation button after `#drawModeButtons`'s removal, read as "thin" for its heading. This is the spec's own deliberate, Boundaries-specified outcome (keep the wrapper, remove only the inner button grid) — a subjective UI-polish observation, not a functional defect; renaming the heading or restructuring the section is a separate, unrequested design decision.
- **low, rejected** — the `// ─── Palette ───` comment banner above `selectAsset()` is now oversized for a 3-line function. Real but trivial; "Palette" still conceptually describes asset-selection state, not factually wrong, not worth churning for.
- **false** — the "Aide" section's help text ("Cliquer sur un asset, puis sur le terrain pour l'ajouter.") was flagged as assuming the old sidebar-palette interaction model. Disproven: the text never references a sidebar location, it describes the click-asset-then-click-terrain pattern generically, which applies identically to the Dock's Assets grid flow — no update needed.
- **low, rejected** — no automated test coverage added for Dock-driven selection continuing to work without the old DOM-class-toggling paths. Same rejection as every prior story in this epic: zero test files exist anywhere in `web-board/` today, a repo-wide pre-existing gap, not something this story is expected to introduce.
- **false** — flagged possible repo-wide leftover references to the deleted element IDs (e.g. in CSS id-selectors). Repo-wide grep across `.css`/`.js`/`.html` confirmed only `dock.js`'s own internal template variables `teamButtonsHtml`/`postButtonsHtml` match the search terms — local variable names in Dock's own string-building code, not references to the deleted DOM elements.
