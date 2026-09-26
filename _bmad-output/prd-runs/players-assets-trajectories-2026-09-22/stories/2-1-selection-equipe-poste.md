---
title: 'Sélection Équipe + Poste'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: 'aff2c057f4240cd61b0c64f1339e1ae538c7fe36'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Team+poste selection and player placement already work end-to-end, but only through the old sidebar/bottom-controls markup (`#postButtons`, `#teamButtons`) — the Dock's "Joueurs" tool currently opens an empty generic placeholder panel with no player-specific controls, and there is no 6-outfield+1-goalkeeper cap or "Demi" poste option anywhere.

**Approach:** Populate the Dock's "players" panel with team+poste selection controls (reusing the existing `state.selectedTeam`/`state.selectedPost`/`addItem` logic as-is), add the missing "Demi" poste, and add a per-team 6+1 cap that disables further selection once hit.

## Boundaries & Constraints

**Always:** Reuse `state.selectedTeam`, `state.selectedPost`, and `addItem()` exactly as they work today — this story is new selection UI plus a new cap check, not a rewrite of the placement engine. Keep the existing old sidebar/bottom-controls buttons functioning as they do today (do not remove them in this story — Story 2-2/2-3/2-4 or a later cleanup story may retire them once the Dock path is proven).

**Never:** Do not touch `addItem`'s core item-creation logic, canvas click routing, or `canvasToField` coordinate math. Do not implement move/delete in this story (Story 2-3) or visual label/color/numbering polish beyond what's needed to show the cap is reached (Story 2-4).

**Decisions:**
- "Demi" is added as a 7th poste button, alongside the existing 6 (AG, ARG, DC, PIV, ARD, AD, Demi).
- Goalkeeper cap is tracked via a new explicit `isGoalkeeper: true` field set on the item when placed with poste "AG" (the existing convention already treats AG/goalkeeper interchangeably in this codebase's terminology) — this replaces the fragile id-prefix/label-string detection for cap-counting purposes only; existing id-prefix/label detection elsewhere in the codebase is left untouched.
- The 6 outfield postes for cap purposes are: ARG, DC, PIV, ARD, AD, Demi (i.e. every poste except AG). AG is the sole goalkeeper poste, capped at 1 per team.
- Selection UI is added to the Dock panel (not the old sidebar) as new markup; old sidebar/bottom-controls buttons stay functional and unchanged, driving the same shared `state.selectedTeam`/`state.selectedPost`.
- Cap enforcement lives in the Dock panel's button click handler / render logic (disabling buttons before selection is possible), not inside `addItem()` — keeps the placement engine untouched.
- Team counts are computed by live-filtering `state.items` each time the panel opens or re-renders (no separate running counter to maintain/desync).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Select team + poste (under cap) | Coach opens Dock "Joueurs" panel, clicks "Équipe A" then "PIV" | Both selections visually confirmed (active state); `state.selectedTeam`/`state.selectedPost` updated exactly as the old controls already do | N/A |
| Select same poste twice | Coach selects "Équipe A" + "PIV", places one, reselects "PIV" again | Selection allowed again — no restriction on repeating a poste (e.g. 2nd pivot) | N/A |
| Team at outfield cap | Équipe A already has 6 outfield players placed (any mix of ARG/DC/PIV/ARD/AD/Demi) | Remaining outfield poste buttons for Équipe A become disabled/greyed; AG (goalkeeper) remains selectable if not yet placed | N/A |
| Team at goalkeeper cap | Équipe A already has an AG (goalkeeper) placed | AG button disabled for Équipe A; outfield postes remain selectable up to their own cap | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/js/dock.js:101-113` -- `setPanelContent(toolName)`, currently sets a generic placeholder for every tool including "players"; add a `players`-specific branch that renders team+poste selection markup instead of the generic block.
- `web-board/src/js/app.js:80,92` -- `state.selectedTeam` (default `'A'`), `state.selectedPost` (default `null`) -- the shared selection state this story's new buttons must read/write, exactly like the existing `#teamButtons`/`#postButtons` handlers already do.
- `web-board/src/js/app.js:1709-1718` -- existing `teamButtons` click handler (sets `state.selectedTeam`, switches to player asset + asset draw mode) -- the new Dock-panel team buttons should trigger the same effect (reuse the handler function or call the same logic).
- `web-board/src/js/app.js:1720-1736` -- existing `postButtonsEl` click handler (toggles `state.selectedPost`) -- same reuse approach for the new Dock-panel poste buttons; must also cover the new "Demi" option (not in the old 6-button list, so the old sidebar list needs the 7th button too if it's to stay a consistent parallel UI — confirm during implementation whether old sidebar should also gain "Demi" or if it's Dock-panel-only).
- `web-board/src/js/app.js:1105-1123` -- `addItem(x, y)`, creates the item pushed to `state.items` -- this is where the cap check's live-count logic will read from (`state.items.filter(i => i.team === ... )`), not where the cap is enforced (per Boundaries, enforcement lives in the button click handler per Open Question 1's recommended answer).
- `web-board/pages/board.html:120-134` -- old `#postButtons` group (6 buttons, no Demi) -- reference for what the new Dock panel markup should structurally mirror, plus the decision point on whether "Demi" is added here too.

## Tasks & Acceptance

**Execution:**
- [x] `web-board/src/js/dock.js` -- add a `players`-specific case in `setPanelContent` that renders team (A/B) and poste (AG/ARG/DC/PIV/ARD/AD/Demi) button groups into `#panelContent`, wired to `state.selectedTeam`/`state.selectedPost` via the same effect as the existing handlers -- gives the coach a working selection UI inside the Dock instead of the empty generic placeholder
- [x] `web-board/src/js/app.js` -- add an `isGoalkeeper: true` field to the item created in `addItem()` when `state.selectedPost === 'AG'` -- gives the cap logic a reliable field to count against, without touching `addItem`'s other behavior
- [x] `web-board/src/js/dock.js` -- add a cap-check function that live-counts `state.items` for the given team (outfield: non-goalkeeper items with a `team` match, capped at 6; goalkeeper: `isGoalkeeper` items with a `team` match, capped at 1) and disables the corresponding poste buttons in the Dock panel when a team is at cap -- enforces the 6+1 rule per team without touching `addItem`
- [x] Wire the cap-check to re-run whenever the Dock "players" panel opens or a player is placed while it's open -- keeps the disabled state accurate as the coach places players

**Acceptance Criteria:**
- Given the coach opens the Dock "Joueurs" panel, when it renders, then team (A/B) and all 7 postes (including Demi) are selectable, mirroring the old sidebar's behavior
- Given a team already has 6 outfield players, when the coach opens/reopens the panel, then that team's outfield poste buttons are disabled while AG remains selectable if not yet placed
- Given a team already has a goalkeeper (AG) placed, when the coach opens/reopens the panel, then AG is disabled for that team while outfield postes remain selectable up to their own cap
- Given the coach selects the same poste a second time (e.g. PIV again after already placing one), when selection happens, then it is allowed with no error — no forced-uniqueness restriction

## Implementation Notes

- Added `isGoalkeeper: isPlayer && post === 'AG'` in `addItem()` using the already-computed local `post` variable (not `state.selectedPost` directly), consistent with how `post`/`color`/`isPlayer` are already derived for the item a few lines above.
- Existing `#teamButtons`/`#postButtons` click handlers refactored into named functions (`selectTeam`/`selectPost`) with identical logic, exposed via `window.PlayerSelectionAPI` so dock.js reuses the same state/logic rather than duplicating it.
- "Demi" added as Dock-panel-only (not backported to the old sidebar's 6-button list) — this reading follows the spec's Decisions section, which scopes the 7th poste to the new Dock UI.

## Spec Change Log

## Review Triage Log

- **medium** — `handlePlayersPanelClick`'s new team/poste buttons reuse the `.panel-action-btn` CSS class, which `handlePanelButtonClick` (the pre-existing generic handler, also bound to `panelContent`) matches via `e.target.closest('.panel-action-btn')`. Both handlers fire on every team/poste click; `handlePanelButtonClick` reads `data-action` (absent on these buttons → `undefined`), logs it, and dispatches a `panelAction` CustomEvent with `action: undefined`. Independently confirmed by both blind-hunter and edge-case-hunter. No listener currently subscribes to `panelAction` (verified via repo-wide grep — only the dispatch site and a doc-comment example exist), so no active bug today, but it's a fragile latent coupling: any future `panelAction` listener would misfire on every team/poste selection. Route: **patch** (smallest fix: in `handlePanelButtonClick`, early-return if the clicked element has `data-players-team` or `data-players-post`, since those are already distinct attributes used by the sibling handler). **PATCHED**: early return added at the top of `handlePanelButtonClick`. Verified in diff.
- **defer** — verification-gap: cap enforcement (`OUTFIELD_CAP`/`GOALKEEPER_CAP`) is real in the Dock panel's button-disabling logic but is not applied in `addItem`/`selectPost` themselves, so the old `#postButtons` sidebar (kept functional per this story's own Boundaries) has zero cap awareness and lets a coach place a 7th outfield player or 2nd goalkeeper by going through the legacy UI instead of the Dock. This is the spec's own explicit scope decision (cap enforcement lives in the Dock panel only, per Decisions), not an implementation defect — but it exposes a real product inconsistency once both UIs coexist. Logged to `deferred-work.md` since the Boundaries section already anticipates the old sidebar being retired in a later cleanup story, at which point this gap closes on its own.
- **low** — blind-hunter: `getTeamCounts(selectedTeam)` is recomputed once per poste inside `POSTES.map` (7 redundant calls) instead of hoisted once. Rejected — negligible cost at max 14 items; fix would add a variable for a non-issue.
- **low** — blind-hunter: no re-render when a placed player is later deleted (stale cap display until panel reopens). Rejected — out of scope; move/delete doesn't exist yet (Story 2-3), so there is no delete path to react to yet.
- **low** — blind-hunter: `isGoalkeeper` computed once at placement, never recalculated if `post`/`team` are edited elsewhere. Rejected — verified via verification-gap's repo-wide symbol search that no other code path currently mutates an item's `post`/`team` after creation; speculative future risk, not a present defect.
- **low** — blind-hunter/edge-case-hunter: `handlePlayersPanelClick` doesn't gate on `currentTool === 'players'` before matching its data-attributes. Rejected — no other panel content currently reuses `data-players-team`/`data-players-post`; no demonstrated clash today.
- **low** — edge-case-hunter: `getTeamCounts`/`renderPlayersPanel` silently default to empty/zero when `window.PlayerSelectionAPI` is missing, masking a wiring failure. Rejected — degrades safely (no crash), and the coach would immediately notice nothing happens on click, which is sufficient signal for this internal-tool context.
- **low** — blind-hunter: no `aria-pressed`/`aria-disabled` on the new buttons. Rejected — not requested by the spec; a legitimate future a11y enhancement, not a defect blocking this story's usage.
- **low** — blind-hunter: no `removeEventListener` for the new `itemPlaced` window listener. Rejected — verified `init()` runs exactly once (single `DOMContentLoaded`/direct-call guard, no re-init path exists in this codebase).
- **low** — blind-hunter: `OUTFIELD_CAP`/`GOALKEEPER_CAP` hardcoded with no explanatory comment. Rejected — cosmetic, not a functional defect.
- **low** — verification-gap/blind-hunter: no automated tests for the new cap logic. Rejected — this is a repo-wide gap (zero test files exist anywhere in `web-board/`), not something introduced or expected to be fixed by this single story.
- **false** — edge-case-hunter: `getToolConfig('players')` could return `undefined`, causing `toolConfig.label` to throw. Disproven — `DOCK_ICONS` (unchanged by this diff) already contains a `players` entry; there is no code path in this diff that removes or renames it.
- **false** — edge-case-hunter: `state.selectedTeam` could hold an invalid value, silently disabling caps. Disproven — `selectedTeam` defaults to `'A'` and is only ever set by `selectTeam(team)`, which is only ever called with the literal `'A'`/`'B'` from a button's `dataset.team`/`data-players-team`; no path sets an arbitrary value.

## Verification

**Manual checks (if no CLI):**
- Open the Dock "Joueurs" panel, confirm team + all 7 postes are visible and clickable.
- Select Équipe A + PIV twice in a row (placing after each), confirm both placements succeed with no uniqueness error.
- Place 6 outfield players for Équipe A (any poste mix), confirm outfield poste buttons for Équipe A become disabled while AG stays enabled.
- Place a goalkeeper (AG) for Équipe A, confirm AG becomes disabled for Équipe A while outfield postes remain enabled (until their own cap).
- Confirm Équipe B's selection/caps are entirely independent of Équipe A's.
