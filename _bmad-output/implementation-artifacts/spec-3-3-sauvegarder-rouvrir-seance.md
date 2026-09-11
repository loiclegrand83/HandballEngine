---
title: 'Sauvegarder et rouvrir une Séance'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Save/reopen for a Séance already works (`saveSeance`, `loadSeance`, `renderLibrary`, `deleteSeance` in `web-board/src/js/seance.js`, pre-existing and already exercised by Stories 3.1/3.2's own verification), so this story is a hardening + verification pass rather than new construction — except one real gap: `loadSeance(id)` silently does nothing (keeps whatever `seance` was previously in memory, no error toast) when the given `id` doesn't match any saved Séance.

**Approach:** Add a "not found" toast in `loadSeance` when the fetched list has no matching id, and verify end-to-end (new → build Blocs/Ateliers → save mid-construction → navigate away → reopen from the library → confirm data intact → edit → resave → reload → confirm the edit persisted) against the real server, since no automated test suite exists in this repo. A Séance is only ever persisted through the explicit "Enregistrer" action — there is no autosave — so "unsaved Séance never appears anywhere it shouldn't" is already true by construction (nothing else in the app reads `/api/seances` except this page's own library view; Epic 4's Calendrier, which will need to respect this, doesn't exist yet).

</frozen-after-approval>

## Implementation Notes

- `web-board/src/js/seance.js` `loadSeance(id)`: added a `toast('Séance introuvable', 'err')` when no saved Séance matches `id` (previously silent — kept stale in-memory state with no feedback).
- Verified end-to-end against the real server (POST/GET/DELETE on `/api/seances`, not just unit logic): saved a Séance with Blocs/Ateliers mid-construction, reopened it and confirmed the data round-tripped intact, edited it (added an Atelier, changed the titre) and resaved, reloaded and confirmed the edit persisted, deleted it and confirmed it's gone, confirmed a not-found id lookup correctly returns nothing (matching the new toast path).
- No autosave exists anywhere in this file — the only write path is the explicit "Enregistrer" button (`saveSeance`) — so "an unsaved Séance never appears on the Calendrier" holds trivially; Epic 4 (not yet built) will need to read from `/api/seances`, same as this page does, so it will only ever see genuinely-saved Séances by construction.
- **Review finding fixed:** the new toast alone wasn't enough — all 3 call sites (`DOMContentLoaded`'s `?id=` deep link, and the library's "Ouvrir"/"Document" buttons) still called `showEditor()`/`showDocument()` unconditionally after a failed `loadSeance`, displaying stale/blank data as if the load had succeeded. Changed `loadSeance` to return `true`/`false`, and gated every caller on that: the deep-link path now falls back to the library view (and clears the bad `?id=` from the URL via `history.replaceState` so a refresh doesn't re-trigger the same "introuvable" toast in a loop) instead of opening a blank/stale editor; the library's "Ouvrir"/"Document" buttons now simply stay on the library (already the correct view) instead of switching away on a failed load.
- Re-verified: `node -c`; confirmed via the real server that both the found and not-found lookups behave as expected feeding into this gated logic.

## Review Triage Log

- **Toast fired but the editor/document view still opened showing stale data, as if the load succeeded** — verdict: high, real, caused by this change (I added the toast but not the corresponding early-return at each caller). Fixed: `loadSeance` returns a success boolean, all 3 call sites gated on it, with the deep-link path falling back to the library view and clearing the bad `?id=` from the URL.
- "`loadSeance` fetches the whole list instead of a per-id endpoint, so 'not found' and 'network error' aren't cleanly distinguishable" — verdict: real observation but out of scope. Matches the existing list-then-filter pattern used identically for `/api/exercises` throughout the app; introducing a new per-id server route is a bigger change than this story's fix-and-verify scope warrants.
- "'Séance introuvable' vs 'Erreur chargement séance' toast messages could be confused" — verdict: false. The two messages describe genuinely distinct failure modes (not found vs. network/parse error) and are not similar enough to cause real confusion.
- "No test/regression coverage added" — verdict: false as a gap in this story. No automated test suite exists anywhere in this repo (confirmed in Story 3.1's review too); verification here was done end-to-end against the real running server (save/reopen/edit/resave/delete/not-found), consistent with how every other story in this project has been verified.

