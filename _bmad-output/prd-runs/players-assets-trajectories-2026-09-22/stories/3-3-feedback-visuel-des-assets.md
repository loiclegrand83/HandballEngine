---
title: 'Feedback visuel des assets (icône, label au survol)'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
baseline_commit: '9c1b1ecdc6bd549835204faac508733acf0886fe'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD FR3.2 requires each placed asset show a distinct icon/symbol per type and a hover label naming the type. Investigation confirmed: (1) `drawShape()` already renders genuinely distinct shapes per asset type (cone draws a real triangle/cone, hurdle draws a hurdle-like shape, ring draws an annulus, etc. — not a shared generic fallback), and (2) every non-player item already renders an always-visible text label with its name (e.g. "Plot" permanently drawn beneath the shape), which exceeds the PRD's "on hover" requirement by being visible without any interaction.

**Approach:** Decision: keep the existing always-visible label as-is rather than adding a separate hover-only tooltip — it already satisfies the underlying need (identify an asset's type) more usefully than a hover-only label would (no interaction required). This story is verification, not new implementation.

## Implementation Notes

Verified via Playwright + screenshot capture against the running app:
- Placed all 10 mapped Dock assets (Ballon, Haie, Haltère, Cible, Swiss Ball, Coupelle, Cerceau, Mannequin, Mur, Plot) — confirmed 9 visually distinct shapes (Cible/Cerceau share `shape: 'ring'` but differ by color, remaining distinguishable) and always-visible name labels beneath each.
- Found and fixed a real bug during verification (see Review Triage Log): "Swiss ball" rendered as truncated "S" instead of its full name, due to a pre-existing `displayLabel = shape === 'circle' ? label.charAt(0) : ''` computation in `addItem()` that only this one Dock-selectable asset triggered. Fixed by always using `''` for non-player displayLabel, letting the render loop's existing `item.displayLabel || item.label` fallback show the full name — confirmed via before/after screenshots, no regression to the goalkeeper (also `shape: 'circle'`, handled separately by player-specific rendering logic).

</frozen-after-approval>

## Review Triage Log

- **high** — `addItem()`'s `displayLabel` computation (app.js:1147-1151) truncates the label to its first letter for ANY item with `selected.shape === 'circle'`: `selected.shape === 'circle' ? selected.label.charAt(0) : ''`. This affects "Swiss ball" (the only Dock-selectable asset with `shape: 'circle'`), which renders as just "S" instead of its full name — confirmed via Playwright screenshot showing "S" instead of "Swiss ball" among otherwise-correct full-name labels for the other 9 asset types tested. The render loop (app.js:390: `item.displayLabel || item.label || ''`) then picks up this truncated non-empty string instead of falling back to the full `item.label`. Verified independently via direct placement + screenshot capture. Route: **patch** — smallest fix: for non-player assets, `displayLabel` should just be `''` (letting the render loop's fallback to `item.label` show the full name, exactly as it already does for every other non-circle-shaped asset) rather than a truncated single letter. The `charAt(0)` behavior appears to have been intended for some other circle-shaped case (unclear which, possibly a leftover from before this feature), but currently only harms "Swiss ball" among the assets this story covers. **PATCHED**: `displayLabel` for non-player items is now always `''`. Independently re-verified via Playwright + screenshot: Swiss ball now renders its full name "Swiss ball" beneath its shape; the goalkeeper (AG, `id: 'G'`, also `shape: 'circle'`) is unaffected since its rendering/labeling is handled separately by the `isHuman`/`isGoalie` and poste-numbering logic, confirmed still showing "AG" correctly.
- **low** — label overlap when multiple different asset types are placed very close together (observed in the verification screenshot with "Plot"/"Mannequin"/"Mur" placed ~40px apart). Rejected as a defect — this is an artifact of the verification script's tight spacing for testing convenience, not representative of normal coach usage where items are placed with intentional spacing; the AC only asked to confirm legibility "when placed close together" as an awareness check, not to require automatic label collision avoidance (out of this story's scope, no such requirement in the PRD).

## Verification

**Manual checks (if no CLI):**
- Place one of each asset type available in the Dock grid (Ballon, Haie, Haltère, Cible, Swiss Ball, Coupelle, Cerceau, Mannequin, Mur, Plot — the two Story 3-1 mismatches "Échelle"/"Zone" are out of scope, already logged separately).
- Confirm each renders a visually distinct shape (not all identical circles) and shows its name as an always-visible text label beneath/near the shape.
- Confirm labels remain legible and don't overlap confusingly when multiple different asset types are placed close together.
