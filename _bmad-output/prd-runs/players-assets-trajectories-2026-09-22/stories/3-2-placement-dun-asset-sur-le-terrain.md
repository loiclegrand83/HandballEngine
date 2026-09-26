---
title: 'Placement d''un asset sur le terrain'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
baseline_commit: '0bbdfc49a31f1c8f4037de0c5be6094e6c8f7cc2'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD FR3.1 requires that after selecting an asset type via the Dock, clicking the terrain places it, with repeated placement of the same asset type working with no cap or uniqueness restriction (e.g. 5 plots in a line). Investigation confirmed this entire pipeline already works: Story 3-1's `assetSelected` bridge sets `state.selectedAssetIndex`, and the existing `addItem()` (shared with players since Epic 2) already handles non-player assets correctly — populating `x`/`y`/`color`/`shape`/`radius` from the `assets` catalog entry, with no cap logic ever invoked for non-player items (`getNextPlayerNumber`/`getPosteLabel` are both gated behind `isPlayer`). Move/delete also work "for free" via the same generic `getItemIndexAt`/`deleteItemAt` infrastructure from Epic 2, since asset ids don't match the player-id hit-test branch.

**Approach:** This story is verification, not new implementation — confirm the existing flow satisfies FR3.1 end-to-end for repeated same-type asset placement through the Dock, and close it out. No code changes are anticipated; if verification surfaces a real gap, address it as the smallest fix that makes the flow work, without expanding scope.

## Implementation Notes

Verified via Playwright against the running app (not code-reading alone):
- Placed 5 plots consecutively via the Dock (select once, click canvas 5 times) — all 5 placed correctly with the "Plot" color/shape/cone, no cap, no interference, `state.selectedAssetIndex` stayed set between clicks.
- Dragged one placed plot to a new position — confirmed via position change in `state.items`.
- Deleted a plot via right-click — confirmed item count decreased by 1, no crash (the poste-renumbering logic in `deleteItemAt` correctly no-ops for non-player items with `post === null`).
- Placed a different asset type (Haie) after the plots — confirmed no interference, correct shape/label, final item count matched expectations (4 plots + 1 haie = 5, after the earlier deletion).

</frozen-after-approval>

## Verification

**Manual checks (if no CLI):**
- Select "Plot" via the Dock Assets grid, click the terrain 5 times at different positions — confirm 5 separate cone-shaped items appear, all with the "Plot" color/shape, no cap/rejection.
- Confirm `state.selectedAssetIndex` stays set after each placement (no need to reselect the asset type between clicks).
- Drag one of the placed plots to a new position — confirm move works via the existing generic drag infrastructure.
- Delete one of the placed plots via right-click or Delete key — confirm it's removed with no crash (the poste-renumbering logic in `deleteItemAt` should no-op safely for a non-player item).
- Place two different asset types (e.g. a plot and a cone/haie) in sequence without any interference between them.
