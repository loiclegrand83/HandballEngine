---
title: 'Poste selection stays active on reclick'
type: 'bugfix'
created: '2026-10-09'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Clicking the same poste button twice deselects it (`selectPost` branches on "already selected → clear") — so placing two players of the same poste in a row (e.g. 2 pivots) takes 3 clicks (select → deselect → reselect) instead of 1. `selectTeam` already has no such toggle, confirming this is a one-sided inconsistency, not an intentional pattern.

**Approach:** Remove `selectPost`'s toggle-off branch — reclicking the same poste is a no-op that keeps it selected. Only selecting a different poste changes the selection.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reclick same poste | "PIV" selected, coach clicks "PIV" again | Selection stays "PIV" — `state.selectedPost === 'PIV'` unchanged, status message unchanged (still the "ready to place" message) | N/A |
| Reclick then place again | "PIV" selected, 1 pivot placed, coach clicks terrain again without touching any button | 2nd pivot placed immediately — poste never needed reselecting | N/A |
| Switch poste | "PIV" selected, coach clicks "DC" | Selection moves to "DC" — switching to a different poste still works exactly as before | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/js/app.js:1795-1808` -- `selectPost(post)` -- remove the `if (state.selectedPost === post) { ...deselect... }` branch entirely; always execute the "set selection" branch unconditionally

## Tasks & Acceptance

**Execution:**
- [ ] `web-board/src/js/app.js` -- collapse `selectPost(post)` to unconditionally set `state.selectedPost = post` and run the existing "select" side-effects (asset index, draw mode, button highlight, status message) -- removes the toggle-off branch, no "already selected → clear" path remains

**Acceptance Criteria:**
- Given "PIV" is selected, when I click "PIV" again, then `state.selectedPost` is still `'PIV'` and no deselection status message appears
- Given "PIV" is selected and a pivot was just placed, when I click the terrain again without touching any button, then a 2nd pivot is placed
- Given "PIV" is selected, when I click "DC", then `state.selectedPost` becomes `'DC'`

## Implementation Notes

Collapsed `selectPost` to the single unconditional branch as planned — no surprises, no scope growth. Syntax verified with `node -c`.

## Verification

**Manual checks (if no CLI):**
- Open the Joueurs panel, select "PIV", click it again — confirm it stays highlighted/selected, no change in status text pattern
- Click terrain twice in a row after selecting "PIV" once — confirm 2 pivots placed
- Select "DC" after "PIV" — confirm selection switches normally

## Review Triage Log

- **false** — reviewer flagged that once a poste is selected, there's no path back to `state.selectedPost === null` (the "automatic numbering" fallback mode) since the deselect-by-reclick affordance was removed. Disproven as a defect: this is the explicit intended consequence of architecture spine AD-3 ("No deselect-by-reclick affordance anywhere"), which the user confirmed earlier in this build. Auto-numbering remains reachable at fresh session state (`selectedPost` starts `null`) — it's simply no longer re-enterable after a poste pick, which is the point of this story.
- **low, rejected** — reclicking the same poste re-runs `clearAssetSelection()`, `selectDrawMode('asset')`, `updateModeButtons(...)`, `setStatus(...)` with identical values instead of being a true short-circuit no-op. Real but cosmetic — no correctness impact, redundant DOM work only on a redundant click. Not worth the added branching complexity for a non-issue.
- **low, rejected** — no code comment explains why `selectPost` is sticky while structurally similar `selectTeam` isn't (though `selectTeam` was never a toggle either). Reasonable documentation suggestion, not a functional defect.
- **high, defer** — `updateModeButtons(postButtonsEl, post)` is dead code: `updateModeButtons` reads `dataset.mode`/`dataset.team` only (app.js:127), but legacy Sidebar poste buttons (`board.html:126-132`) use `data-post` — the `.selected` class never toggles on `#postButtons`. Confirmed via code read. Pre-existing bug, not caused by this diff. Deferred rather than patched: `#postButtons` is the legacy Sidebar control set Story 5.5 deletes entirely in this same epic — fixing broken highlighting on soon-to-be-deleted markup is wasted work. Logged to `deferred-work.md`.
- **false** — reviewer asked whether `state.selectedPost` survives a team switch and whether that's intentional. Confirmed: `selectTeam` (app.js:1786) never touched `selectedPost`, before or after this diff — unchanged pre-existing behavior, not a regression introduced by this story.
- **false** — reviewer suggested the "numérotation automatique" fallback mode might now be unreachable/orphaned. Disproven: `getNextPlayerNumber` still fires whenever `state.selectedPost` is falsy (app.js:1146, 1150), which is true at session start and remains reachable — only re-entry after a poste pick is now blocked, which is this story's intended behavior per AD-3.
