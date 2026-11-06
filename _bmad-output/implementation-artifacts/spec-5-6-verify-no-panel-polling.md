---
title: 'Dock panels never poll for freshness (verification)'
type: 'chore'
created: '2026-10-09'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-2 (architecture spine) requires that no Dock panel ever polls `state` on a timer to simulate freshness — panel re-renders must only be triggered by discrete DOM events. This is the final guard-rail story of Epic 5, confirming the rule holds across everything built in this epic (Stories 5.1-5.6) and stays documented as a standing constraint for future panels.

**Approach:** Audit `dock.js` for any `setInterval`/`requestAnimationFrame` usage tied to panel rendering, and confirm every `render<Tool>Panel()` call site is a discrete event handler. This is a verification task — no violation was found, so no code change is needed; the story's output is the audit itself plus a standing code comment marking the constraint for future contributors.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Audit `dock.js` for timers | Full-file grep for `setInterval`/`requestAnimationFrame` | Zero matches in `dock.js`; the only `requestAnimationFrame` calls in the codebase (3, in `app.js`) belong to the unrelated trajectory-animation playback loop (`updateAnimation`), not panel rendering | N/A |
| Audit all `render<Tool>Panel()` call sites | Full-file grep for every call to `renderPlayersPanel()`/`renderTrajectoriesPanel()` | All 5 call sites trace to a `click` or `itemPlaced` event handler — none run on a timer or interval | N/A |

</frozen-after-approval>

## Code Map

- `web-board/src/js/dock.js` -- audited in full: `renderPlayersPanel()` (2 render functions exist today, the other 6 Dock tools being unfinished stubs per QA finding #6, explicitly out of scope) -- confirmed all 5 call sites (`openPanel`-adjacent code at init, `handlePlayersPanelClick`, `handleTrajectoriesPanelClick`, and the `itemPlaced` listener) are discrete event-driven, zero timer-based triggers
- `web-board/src/js/app.js` -- the only `requestAnimationFrame` usage in the project (3 call sites, all inside the trajectory playback animation feature, `updateAnimation`) -- confirmed unrelated to Dock panel state freshness, no AD-2 violation

## Tasks & Acceptance

**Execution:**
- [x] `web-board/src/js/dock.js` -- add a short standing comment near `renderPlayersPanel`/`renderTrajectoriesPanel` documenting the render-on-discrete-event rule, so a future contributor adding a new panel (e.g. filling in one of the 6 stub tools) sees the constraint before reaching for a timer

**Acceptance Criteria:**
- Given the full codebase, when I grep `dock.js` for `setInterval`/`requestAnimationFrame`, then zero matches are found
- Given every `render<Tool>Panel()` call site, when I trace its trigger, then each is a discrete DOM event (click or CustomEvent), never a timer

## Implementation Notes

## Verification

**Manual checks (if no CLI):**
- `grep -n "setInterval\|requestAnimationFrame" web-board/src/js/dock.js` -- expect zero matches
- `grep -n "renderPlayersPanel()\|renderTrajectoriesPanel()" web-board/src/js/dock.js` -- trace each call site, confirm all are inside event handlers
