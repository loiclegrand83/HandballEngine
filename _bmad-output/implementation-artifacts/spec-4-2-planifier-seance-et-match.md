---
title: 'Planifier Séance et Match'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Associating a saved Séance to a date and creating a Match event both already work (`fSeanceLink` dropdown + `seanceId` field, `adversaire` required for Match — pre-existing `web-board/src/js/planning.js`). Two things are missing: (1) clicking a Séance-linked event only opens the planning-event edit modal — there's no way to reach the actual Séance content from the Calendrier; (2) no orphan-reference detection exists (AD-5) — if a linked Séance is deleted, the calendar gives no visual signal that the link is broken.

**Approach:** Add an "Ouvrir la séance →" button inside the planning-event modal, shown only when `fSeanceLink` has a value, opening `seance.html?id=<id>` in a new tab (`window.open(..., '_blank')`, matching the existing `explanation.html` open-in-new-tab precedent elsewhere in this codebase) — the modal's own editing flow (date/heure/notes/link/delete) is unchanged. Add render-time orphan detection: for every event with a `seanceId`, check it against the already-loaded `allSeances` list and show an inline "séance introuvable" indicator directly on the chip (not only discoverable by clicking in). Fix a pre-existing race condition in `DOMContentLoaded` where `loadSeancesForLink()` (populates `allSeances`) and `loadEvents()` (triggers the first `renderCalendar()`) fire concurrently unawaited — the first render could run before `allSeances` is populated, which would make the new orphan check produce false positives on initial page load.

**Decision — chip click behavior:** Clicking any event chip keeps opening the planning-event modal exactly as today (confirmed with the user) — no direct one-click navigation to the Séance builder. The new "Ouvrir la séance →" affordance lives inside that modal.

</frozen-after-approval>

## Implementation Notes

- `web-board/pages/planning.html`: added `#btnOpenSeance` (hidden by default) below the `#fSeanceLink` select.
- `web-board/src/js/planning.js`: `updateOpenSeanceButton()` shows/hides the button based on whether `fSeanceLink` has a value, called both when the modal opens (`openModal`) and on the select's own `change` event (so picking/clearing a link while the modal is already open updates the button live). Click handler opens `seance.html?id=<id>` via `window.open(..., '_blank', 'noopener,noreferrer')`.
- `renderCalendar()`'s chip loop: for `entrainement`-type events with a `seanceId`, checks it against `allSeances` (already loaded); if not found, adds an `.event-chip--orphan` class, appends "⚠ séance introuvable" to the chip text, and sets a `title` tooltip — visible on the grid itself, not only after clicking in.
- **Fixed a pre-existing race condition** while implementing this: `DOMContentLoaded` fired `loadSeancesForLink()` (populates `allSeances`) and `loadEvents()` (triggers the first `renderCalendar()`) concurrently, unawaited — the first render could run before `allSeances` was populated, which would have made every linked event falsely flagged as orphaned on initial page load. Changed to `await loadSeancesForLink()` before `loadEvents()`.
- Verified: `node -c`; confirmed the exact orphan scenario end-to-end against the real server (created a Séance, linked a planning event to it, deleted the Séance, confirmed the planning event still carries the now-dangling `seanceId` — precisely what the client-side check detects); unit-tested the orphan-detection predicate directly (linked-and-exists → not orphan, linked-and-deleted → orphan, no link → not orphan); confirmed the button/CSS markup is present.
- **Review finding fixed (severe, real data-loss bug):** `openModal` set `fSeanceLink.value = event.seanceId` directly — for an orphaned event, no matching `<option>` exists, so the native `<select>` silently resets to `""`. Simply opening an orphan-flagged event to edit an unrelated field (title, notes) and clicking Save would then silently wipe the orphan `seanceId` from the record, with no confirmation. Fixed with a new `setSeanceLinkValue(seanceId)` helper: when the id doesn't match any real option, it injects a temporary placeholder option ("Séance introuvable (supprimée)") so the select correctly retains and displays the value instead of resetting — the coach can still explicitly clear it via the existing "— Aucune —" option, but it's never dropped as a side effect. As a consequence, "Ouvrir la séance →" now also correctly shows for an orphan link; clicking it navigates to `seance.html?id=<ghost>`, which Story 3.3 already hardened to show a graceful "Séance introuvable" toast and fall back to the library view rather than a broken page.
- **Review finding fixed:** `loadSeancesForLink()`'s pre-existing silent `catch` (network/parse failure leaves `allSeances = []`) would have made the new orphan check flag every single linked event as "introuvable" on a failed fetch — a false-positive storm indistinguishable from real orphans. Added a `seancesLoaded` flag, set only on a successful fetch; the orphan check now requires it, so a failed fetch simply skips orphan detection for that render instead of falsely flagging everything.
- Added a one-line comment on `.event-chip--orphan` noting it's currently entrainement-only, flagging the `.won`/`.lost` interaction to check if it's ever reused for match chips.
- Re-verified: `node -c`; simulated the native `<select>` reset-on-no-match behavior in a Node script to confirm the fix actually preserves the orphan id (previously would silently reset to `""`, now correctly retains it); re-confirmed via the real server that a resaved orphan event keeps its `seanceId` unchanged.

## Review Triage Log

- **Opening and saving an orphan-flagged event silently erased its `seanceId`** — verdict: high, real, severe (silent data loss on an unrelated edit). Caused by this change (the field's old behavior of resetting to "" on no-match was harmless before orphan detection existed; now it destroys the exact reference the warning exists to protect). Fixed with `setSeanceLinkValue`'s placeholder-option approach.
- **`loadSeancesForLink`'s silent catch could turn a network hiccup into a false-positive "introuvable" storm across every linked event** — verdict: high, real, caused by this change (the pre-existing silent catch was harmless before orphan detection depended on `allSeances` being trustworthy). Fixed with the `seancesLoaded` guard.
- "No explicit modal-side indication of orphan state for the 'Ouvrir la séance →' button, and it might open a broken/blank page" — verdict: resolved as a side effect of the `setSeanceLinkValue` fix, and the "broken page" premise was false to begin with: `seance.html` already handles a not-found id gracefully (Story 3.3's fix — toast + fallback to library), so navigating to an orphan id now correctly surfaces that same message instead of anything broken.
- "No explicit 'unlink' affordance for an orphaned reference" — verdict: resolved as a side effect of the same fix — the existing "— Aucune —" option now works correctly as the deliberate unlink path once the select stops silently blanking itself.
- "O(events × seances) orphan scan repeated on every render, no memoized index" — verdict: false/negligible at this app's scale (single team, one season — tens of events and séances, not thousands). Not worth the added complexity of a `Set`-based index.
- "Orphan warning relies on visual class + tooltip, not fully screen-reader accessible" — verdict: low, rejected. The "⚠ séance introuvable" text is appended directly to the chip's `textContent`, which is already part of its accessible name and will be read by screen readers; only the supplementary `title` tooltip lacks keyboard/AT access, which is a pre-existing limitation of `title` attributes generally, not specific to this change.
- **`.event-chip--orphan` CSS could conflict with `.won`/`.lost` if ever reused on match chips** — verdict: real but purely hypothetical (orphan is entrainement-only today, code confirms it). Addressed with a one-line clarifying comment rather than speculative restructuring for a case that doesn't exist yet.

