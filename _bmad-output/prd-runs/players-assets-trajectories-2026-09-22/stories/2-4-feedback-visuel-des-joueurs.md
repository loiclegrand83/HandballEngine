---
title: 'Feedback visuel des joueurs (label, couleur, numéro)'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '2117bc96b90c197da4f9a4f9ebbfbfeb9d89455a'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PRD FR2.3 requires each placed player show a poste label, team color, and a position number when a poste repeats (e.g. "PIV 1", "PIV 2"). Team color and the raw poste label already render correctly (confirmed in Story 2-2). The one confirmed gap: two players placed with the same poste for the same team both get an identical `displayLabel` (e.g. both show "PIV") with no way to tell them apart.

**Approach:** Always number a poste from placement 1 (not only once a 2nd instance exists), scoped per team+poste (Équipe A's PIVs and Équipe B's PIVs number independently). When a numbered player is deleted, renumber the remaining same-poste same-team players so numbers stay consecutive with no gaps (e.g. deleting "PIV 1" while "PIV 2" exists renumbers it to "PIV 1").

## Boundaries & Constraints

**Always:** Numbering is scoped to `team` + `post` together — Équipe A's PIVs and Équipe B's PIVs each number independently starting at 1. Goalkeeper (`post === 'AG'`) is excluded from numbering (only 1 per team is expected via Story 2-1's cap; if the cap is ever bypassed via the legacy sidebar per the known deferred gap, still don't number AG — just render "AG" for every instance as today). Renumbering after deletion must go through the same `render()`/`saveLocal()` path deletion already uses, so the canvas reflects updated numbers immediately.

**Never:** Do not change `getNextPlayerNumber` (the existing per-team, no-poste-selected auto-numbering) — it stays untouched for that fallback path. Do not touch `deleteItemAt`'s core splice/index-adjustment logic (Story 2-3) — renumbering is an addition after the existing delete flow completes, not a modification of it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First PIV placed for Équipe A | Coach places 1 PIV for Équipe A (no other PIV exists for that team) | `displayLabel` = "PIV 1" | N/A |
| Second PIV placed for Équipe A | A "PIV 1" already exists for Équipe A; coach places another PIV for Équipe A | `displayLabel` = "PIV 2" | N/A |
| Same poste, different team | Équipe A has "PIV 1"; coach places a PIV for Équipe B | Équipe B's PIV is "PIV 1" (independent numbering per team) | N/A |
| Delete "PIV 1" while "PIV 2" exists | Team has "PIV 1" and "PIV 2" for the same poste; coach deletes "PIV 1" | "PIV 2" is renumbered to "PIV 1"; canvas re-renders showing the update | N/A |
| Delete "PIV 2" while "PIV 1" exists | Team has "PIV 1" and "PIV 2"; coach deletes "PIV 2" (the higher number) | "PIV 1" is unaffected; no renumbering needed | N/A |
| Goalkeeper placement | Coach places AG for a team | `displayLabel` = "AG" (no number, regardless of how many AGs exist) | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/js/app.js:1112-1114` -- `displayLabel` computation in `addItem()`: `isPlayer ? (post || String(getNextPlayerNumber(state.selectedTeam))) : ...`. When `post` is truthy, replace the bare `post` with a new per-team-per-poste numbered label (e.g. via a new `getPosteLabel(team, post)` helper), except when `post === 'AG'` (goalkeeper stays unnumbered).
- `web-board/src/js/app.js:1092-1104` -- `getNextPlayerNumber(team)`, the existing per-team (not per-poste) counter for un-posted players — pattern to mirror for the new per-poste counter, but must filter by `item.post === post && item.team === team` instead of just `item.team === team`. Do not modify this function itself.
- `web-board/src/js/app.js:1344-1356` (post Story 2-3) -- `deleteItemAt(index)` — after its existing splice + index-adjustment logic, add a renumbering pass: find the deleted item's `team`/`post` (captured before the splice) and reassign `displayLabel` for all remaining same-team-same-poste items in placement order (1, 2, 3...), skipping if the deleted item had no `post` or was a goalkeeper.
- `web-board/src/js/app.js` -- `isGoalkeeper` field (Story 2-1) — use this (or `post === 'AG'`) as the exclusion check for numbering, consistent with how it's already used for cap-counting in `dock.js`.

## Tasks & Acceptance

**Execution:**
- [x] `web-board/src/js/app.js` -- add a `getPosteLabel(team, post)` helper that counts existing `state.items` where `item.team === team && item.post === post` (before the new item is added) and returns `` `${post} ${count + 1}` `` — mirrors `getNextPlayerNumber`'s pattern but scoped per-poste
- [x] `web-board/src/js/app.js` -- in `addItem()`, when `post` is truthy and `post !== 'AG'`, use `getPosteLabel(state.selectedTeam, post)` for `displayLabel` instead of the bare `post` string; when `post === 'AG'`, keep `displayLabel = post` unnumbered
- [x] `web-board/src/js/app.js` -- in `deleteItemAt(index)`, after the existing splice/index-adjustment, capture the deleted item's `team`/`post` before the splice, then if it had a non-goalkeeper `post`, find remaining items with the same `team`/`post` in their current array order and reassign their `displayLabel` to `` `${post} 1`, `${post} 2`, ... `` consecutively

**Acceptance Criteria:**
- Given Équipe A has no PIVs placed, when the coach places one, then it displays "PIV 1"
- Given Équipe A already has "PIV 1", when the coach places another PIV for Équipe A, then it displays "PIV 2"
- Given Équipe A has "PIV 1" and Équipe B has none, when the coach places a PIV for Équipe B, then it displays "PIV 1" (independent from Équipe A's numbering)
- Given Équipe A has "PIV 1" and "PIV 2", when the coach deletes "PIV 1", then the remaining player is renumbered to "PIV 1"
- Given a goalkeeper (AG) is placed for any team, when it renders, then it displays "AG" with no number, regardless of how many AGs exist for that team

## Implementation Notes

Verified via Playwright against the running app (not just code-reading, correcting the subagent's report which was code-trace-only):
- Placed 3 PIVs for Équipe A: confirmed "PIV 1", "PIV 2", "PIV 3" in order.
- Placed a PIV for Équipe B while Équipe A already had "PIV 1": confirmed Équipe B's shows "PIV 1" independently (per-team scoping works). Note: verifying this required clicking canvas directly rather than re-clicking the poste button when switching teams, since `selectedPost` persists across team switches and the poste button already shows `.selected` — clicking it again toggles it OFF (pre-existing `selectPost` toggle behavior, not something this story touches or should touch).
- Deleted Équipe A's "PIV 1" (with "PIV 2"/"PIV 3" still present): confirmed remaining players renumbered to "PIV 1"/"PIV 2".
- Placed a goalkeeper (AG): confirmed no number, displays "AG" as before.



## Spec Change Log

## Review Triage Log

- **low** — blind-hunter/edge-case-hunter (independently, same root cause): `getPosteLabel` uses a simple count (`existing count + 1`) rather than tracking the max existing suffix, so pre-existing saved exercises with un-numbered poste labels (e.g. `"PIV"` from before this story — confirmed present in all 4 files under `data/bibli/`) never get migrated/renumbered, and a newly-added same-poste player for that team gets a numbered label (e.g. `"PIV 1"`) that coexists inconsistently with the legacy un-numbered one. Verified: all 4 existing saved exercises have un-numbered poste labels; loading one and adding a new same-poste player produces a numbered label alongside the legacy un-numbered one — inconsistent display, not a hard collision or crash. Rejected as a blocker — the spec's Intent never mentioned migrating pre-existing saved data, only new placement/deletion behavior; this is a real but cosmetic gap affecting only exercises saved before this story, with no data loss or functional break. Logged to `deferred-work.md` as a candidate follow-up (e.g. a one-time migration pass, or switching `getPosteLabel` to max-suffix-based numbering) rather than blocking this story.
- **low** — edge-case-hunter: `getPosteLabel`/`state.selectedTeam` could theoretically be `null`/`undefined` if a post is selected with no team selected. Rejected — verified Story 2-1's UI always requires a team selection before poste buttons render meaningfully in the Dock panel context, and `state.selectedTeam` defaults to `'A'` (never null in practice via the exposed UI paths).
- **low** — blind-hunter/verification-gap: no automated tests for the new numbering/renumbering logic. Rejected — consistent with the whole project's lack of a test harness for `app.js` (confirmed repo-wide, same as prior stories' findings); not something this single story is expected to introduce.
- **low** — blind-hunter: the `'AG'` exclusion is duplicated as a magic string in two places (`addItem` and `deleteItemAt`) with no shared constant or comment. Rejected — cosmetic maintainability note, not a functional defect; both sites are adjacent in the same file and easy to keep in sync for the current scope.
- **false** — edge-case-hunter: `deleteItemAt` called with an out-of-range index could produce inconsistent state. Disproven — already guarded by the existing `if (deleted && ...)` check (confirmed unchanged from Story 2-3's implementation), which the edge-case-hunter itself noted was "handled" on closer inspection.

## Verification

**Manual checks (if no CLI):**
- Place 3 PIVs for Équipe A, confirm they show "PIV 1", "PIV 2", "PIV 3" in placement order.
- Place a PIV for Équipe B, confirm it shows "PIV 1" independently of Équipe A's numbering.
- Delete "PIV 1" from Équipe A's set of 3, confirm the remaining two renumber to "PIV 1" and "PIV 2".
- Place an AG for Équipe A, confirm it shows "AG" with no number.
- Confirm auto-numbered players (no poste selected) still work exactly as before (unaffected by this story).
