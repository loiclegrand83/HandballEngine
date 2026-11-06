---
title: 'Placement d''un joueur sur le terrain'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
baseline_commit: '5a566c6e0e6f6e5e5f8ebfc81ff379ac6e8cb4d5'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD FR2.2 requires that after selecting team+poste, clicking the terrain places that player, with repeat placement of the same poste working (e.g. a 2nd pivot). Investigation confirmed this entire pipeline already works end-to-end today: `selectTeam`/`selectPost` (now driven by the Dock panel from Story 2-1) already put the app in `asset` draw mode, and the existing canvas click handler already routes to `addItem()`, which places a colored, labeled player with no restriction on repeating a poste.

**Approach:** This story is verification, not new implementation — confirm the existing flow satisfies FR2.2 end-to-end through the new Dock panel path (not just the old sidebar), and close it out. No code changes are anticipated; if verification surfaces a real gap, address it as the smallest fix that makes the flow work, without expanding scope.

## Implementation Notes

Verified via Playwright against the running app (not just code-reading):
- PIV placement, repeat PIV placement (2nd pivot, no dedupe), AG (goalkeeper) placement, and no-poste-selected auto-numbered placement — all work exactly as investigated. Team color and poste/number label are already rendered per item.
- Found one minor UX wrinkle while verifying: once a team's AG (goalkeeper) cap is hit, the AG button becomes `disabled` but keeps its `.selected` CSS class (from Story 2-1's rendering), so it visually still looks "chosen" even though clicking it does nothing further. This does NOT block placement — selecting a different poste (e.g. DC) works normally and correctly replaces the selection, placement continues to work. Not a defect in this story's scope (placement itself works in every tested case); noted here as a candidate polish item for Story 2-1/2-4 rather than fixed in this verification-only story.

</frozen-after-approval>

## Verification

**Manual checks (if no CLI):**
- Open the Dock "Joueurs" panel, select Équipe A + PIV, click the terrain — confirm a player appears at that position with a "PIV" label in Team A's color.
- Without deselecting, click the terrain again — confirm a second PIV player is placed (no rejection, no dedupe).
- Select Équipe A + AG (goalkeeper), click the terrain — confirm the goalkeeper places correctly.
- Select only a team (no poste), click the terrain — confirm a numbered player places (existing auto-numbering behavior, not a crash or no-op).
- Subjectively confirm click-to-placement feels instant (no perceptible lag) — no formal timing instrumentation added in this story.
