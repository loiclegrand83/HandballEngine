---
title: 'Sélection d''un type d''asset'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: 'ebeb3fb19a7a61425298babe970d989d35f2da56'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Dock's "Assets" panel already shows a working 12-item grid (`ASSET_ITEMS` in `dock.js`) with visual selection (`.active` class toggle) and dispatches an `assetSelected` CustomEvent on click — but nothing listens for that event. The actual placement pipeline (`state.selectedAssetIndex`, read by `addItem()`) is only ever set by the old `#assetPalette` bottom-controls buttons (`selectAsset()` in `app.js`), which use a different, differently-labeled 14-entry `assets` array. Clicking a Dock asset grid item today has zero effect on what gets placed.

**Approach:** Add a listener for `assetSelected` in `app.js` that maps the Dock's asset by **label** (not id — the two arrays use different id schemes, e.g. `swiss-ball` vs `swiss`, `cerceau` vs `hoop`, but their French labels already match closely) to the correct index in the existing `assets` array, then calls the existing `selectAsset(index)`. Keep the old `#assetPalette` functional and untouched — same approach as Story 2-1 took with the old player sidebar.

## Boundaries & Constraints

**Always:** Reuse `selectAsset(index)` and the existing `assets` array exactly as they work today — this story is a bridge/listener, not a rewrite of the placement catalog. Keep the old `#assetPalette` bottom-controls fully functional and unchanged (same approach Story 2-1 took with `#postButtons`/`#teamButtons`).

**Never:** Do not rename or renumber entries in either `ASSET_ITEMS` (dock.js) or `assets` (app.js) — map between them via a lookup, don't force one to match the other's shape. Do not add a cap/count restriction on asset placement (unlike Story 2-1's player cap — the PRD does not ask for one here). Do not touch `addItem()`'s placement logic itself.

**Decision:** Match Dock asset items to `app.js`'s `assets` array by comparing labels case-insensitively with accents/whitespace normalized (e.g. "Swiss Ball" → "swiss ball" matches "Swiss ball" → "swiss ball"), since the two arrays' `id` fields don't correspond 1:1 but their French labels are near-identical. Build this as a static lookup table computed once, not a per-click linear search with fuzzy matching logic repeated inline.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Select "Plot" via Dock | Coach opens Dock "Assets" grid, clicks "Plot" | `assetSelected` fires with `assetId: 'plot'`; listener maps it to `assets` array's "Plot"/cone entry; `selectAsset(index)` is called, `state.selectedAssetIndex` updates | N/A |
| Select "Cerceau" via Dock (id mismatch case) | Coach clicks "Cerceau" (dock id) | Maps by label "Cerceau" to `assets` array's `hoop`/"Cerceau" entry despite different ids | N/A |
| Old `#assetPalette` still works | Coach uses the old bottom-controls buttons instead of the Dock | Behavior unchanged from before this story | N/A |
| Dock asset label with no match in `assets` array | A Dock `ASSET_ITEMS` label has no corresponding entry in `assets` (verify during implementation whether all 12 match) | Log a console warning identifying the unmapped label; do not throw, do not change selection | Warning only, no crash |

</frozen-after-approval>

## Code Map

- `web-board/src/js/dock.js:43-56` -- `ASSET_ITEMS`, 12 entries with `{id, label, icon}`; dispatches `assetSelected` CustomEvent (dock.js:326) on click with `{assetId, assetLabel}` in `detail` — already correct, no changes needed here.
- `web-board/src/js/app.js:61-76` -- `assets` array, 14 entries with `{id, label, color, radius, shape}` — the real placement catalog; no changes needed to its contents, only a new lookup built from it.
- `web-board/src/js/app.js:1040-1046` -- `selectAsset(index)`, existing function that sets `state.selectedAssetIndex` and updates UI — reuse as-is, called by the new listener.
- `web-board/src/js/app.js:1018-1034` -- `createAssetButtons()`/old `#assetPalette` wiring — no changes; stays functional exactly as today.
- `web-board/src/js/app.js` (new) -- add a `window.addEventListener('assetSelected', ...)` handler that normalizes `event.detail.assetLabel` (lowercase, trim, strip accents) and looks it up against a similarly-normalized map of `assets` array labels to find the matching index, then calls `selectAsset(index)`.

## Tasks & Acceptance

**Execution:**
- [x] `web-board/src/js/app.js` -- build a normalized-label-to-index lookup from the `assets` array (e.g. a `Map` built once at load, keyed by lowercase/trimmed/accent-stripped label) -- gives the new listener a reliable way to match Dock labels to `assets` entries despite differing ids
- [x] `web-board/src/js/app.js` -- add `window.addEventListener('assetSelected', event => {...})` that normalizes `event.detail.assetLabel` the same way and looks it up in the map, calling `selectAsset(index)` on a match or logging a console warning on no match -- connects the Dock's working grid UI to the actual placement pipeline
- [x] Verify all 12 `ASSET_ITEMS` labels find a match in the `assets` array lookup (manually cross-reference during implementation; if any don't match, note it in Implementation Notes rather than silently failing)

**Acceptance Criteria:**
- Given the coach opens the Dock "Assets" grid and clicks "Plot", when the click registers, then `state.selectedAssetIndex` updates to the `assets` array's cone/"Plot" entry
- Given the coach clicks "Cerceau" (a dock id that doesn't match its app.js counterpart's `hoop` id), when the click registers, then the label-based match still correctly selects the `assets` array's "Cerceau" entry
- Given the coach still uses the old `#assetPalette` buttons, when clicked, then behavior is unchanged from before this story
- Given all 12 Dock asset labels, when cross-referenced against the `assets` array, then each either finds a match or is explicitly logged as unmapped (no silent failures)

## Implementation Notes

Verified via Playwright against the running app (not just code-reading, correcting the subagent's report which was code-trace-only):
- Dispatched `assetSelected` for all 12 `ASSET_ITEMS` entries and read back `state.selectedAssetIndex` after each: 10 correctly mapped to their expected `assets` array index (Ballon→1, Haie→2, Haltère→5, Cible→4, Swiss Ball→6, Coupelle→7, Cerceau→8, Mannequin→10, Mur→11, Plot→12). Confirmed the two known mismatches ("Échelle" vs "Échelle de rythme", "Zone" vs "Zone fix.") produce the documented console warning and leave `selectedAssetIndex` at its last valid value (no crash, no silent wrong-index assignment).
- Confirmed the old `#assetPalette` buttons still work unchanged (click sets `selectedAssetIndex` correctly).

Cross-referenced all 12 Dock `ASSET_ITEMS` labels against the 14-entry `assets` array (normalized: lowercase, trimmed, accents stripped):

- Ballon, Haie, Haltère, Cible, Coupelle, Cerceau, Mannequin, Mur, Plot, Zone(*) -- most match directly or near-directly.
- "Swiss Ball" (dock) vs "Swiss ball" (app.js) -- matches after case-insensitive normalization.
- **"Échelle" (dock) vs "Échelle de rythme" (app.js) -- does NOT match** (labels differ beyond case/accents/whitespace). Falls through to the console-warning path at runtime; `state.selectedAssetIndex` is left unchanged when this item is clicked.
- **"Zone" (dock) vs "Zone fix." (app.js) -- does NOT match** for the same reason. Same fallback behavior applies.

Per the spec's boundaries ("Never... force one to match the other's shape"), no substring/fuzzy matching beyond exact normalized-label equality was added. If these two items are meant to be selectable via the Dock, a follow-up story should either rename one side's label or extend the matching rule -- flagging here rather than silently expanding scope.

## Spec Change Log

## Review Triage Log

- **high (deferred, pre-existing)** — `.assets-grid` (assets-grid.css:9-11) is still `position: fixed; bottom: var(--spacing-lg)` from before Story 1-2's dock layout fix, which converted `.dock` itself from `position: fixed` to a grid item (`position: relative; grid-area: dock`) inside `.app-shell`. The assets grid was never updated to match, and `document.elementFromPoint()` confirms the `<canvas>` element intercepts clicks at the exact coordinates where asset-grid buttons visually render — a real coach could not click Dock asset buttons at all in the affected layout state, despite `--z-dock: 100` > `--z-canvas: 1` (the z-index values are correct but ineffective, since `.main-panel`'s `position: static` — confirmed at styles.css:536, no `position` declared — combined with the grid layout creates a stacking context the fixed-position `.assets-grid` no longer correctly layers above). Verified independently and reproducibly via Playwright (`elementFromPoint` at the button's exact bounding-box center returns `<canvas>`, and a real (non-forced) `.click()` on the button times out). Route: **defer**, not **bad_spec** or **patch** — this CSS file was last touched by the original Dock UI v1 sprint (`bc8de60`) and was never modified by Story 3-1's diff (confirmed via `git log`); this story's Intent was scoped to the `assetSelected` JS bridge, not the pre-existing grid's CSS positioning. This is the same known-pattern gap already logged for `.assets-back-button` in Story 1-2/2-1's deferred-work entries (fixed-position elements left on the old viewport-anchored model after the dock became grid-flowed) — logging to `deferred-work.md` as a related instance rather than duplicating investigation, and flagging it as high-severity here since it's a functional blocker (asset selection via Dock UI is currently unusable in the browser) rather than a cosmetic issue.
- **low** — the `assetSelected` listener itself (this story's actual diff) is fully correct: 10/12 labels map successfully, the 2 known mismatches ("Échelle"/"Échelle de rythme", "Zone"/"Zone fix.") produce the documented console warning with no crash and no incorrect state change. Verified independently via direct `assetSelected` event dispatch (bypassing the CSS click-blocking issue above) for all 12 items.

## Verification

**Manual checks (if no CLI):**
- Open the Dock "Assets" grid, click each of the 12 items one at a time, and after each click inspect `state.selectedAssetIndex` (or the resulting placed item after a canvas click) to confirm it matches the expected `assets` array entry.
- Click "Plot" via Dock, then click the terrain — confirm a plot (cone shape) is placed, not a player or wrong asset.
- Use the old `#assetPalette` to select an asset, confirm placement still works exactly as before.
