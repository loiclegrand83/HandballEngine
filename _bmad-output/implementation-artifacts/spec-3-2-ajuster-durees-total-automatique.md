---
title: 'Ajuster les durées avec total automatique'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `seance.dureeTotal` is currently a manually-typed number field (`fDuree` in `web-board/pages/seance.html`, read in `collectMeta()`), even though each Atelier already has its own editable `duree` (added in Story 3.1). Nothing recalculates the total from the Ateliers, and the value gets persisted to the Séance JSON — violating AD-9 ("derived duration never persisted, always computed at render time").

**Approach:** Replace the manual `fDuree` input with a read-only computed display. Add a pure `computeDureeTotal(seance)` helper (sums every Bloc's every Atelier's `duree`) and call it at every read site — the editor's meta panel, the Séance library card list, and the printable document's meta row — instead of reading a stored `dureeTotal` field. Remove `dureeTotal` from the in-memory `seance` state shape and stop sending it in the save payload entirely.

</frozen-after-approval>

## Implementation Notes

- `web-board/pages/seance.html`: replaced the manual `#fDuree` number input with a read-only `#fDureeTotal` display div.
- `web-board/src/js/seance.js`: added `computeDureeTotal(s)` (sums every Bloc's every Atelier's `duree`); removed `dureeTotal` from both `seance`'s initial shape and `newSeance()`; `collectMeta()` no longer reads/writes it. `updateDureeTotalDisplay()` refreshes `#fDureeTotal` and is folded into `renderBlocList()` itself (called by every Bloc/Atelier mutation — add/remove/reorder/change) rather than threaded individually into each mutation function, so the total can't silently go stale after a future edit to any of those call sites. `renderLibrary()`'s card list and `buildDocument()`'s meta row now call `computeDureeTotal(s)`/`computeDureeTotal(seance)` instead of reading a stored field.
- Verified: `node -c`; unit-checked `computeDureeTotal` against a multi-Bloc/Atelier fixture (sums correctly, handles empty Blocs/Ateliers, string `duree` values); round-tripped a Séance through the real `/api/seances` POST+GET and confirmed the saved/returned JSON has no `dureeTotal` key at all.
- **Review findings fixed:** the read-only total was a plain `<div>` with no `for`/`id` association to its `<label>` and no readonly semantics for assistive tech — swapped for a proper `<input readonly aria-readonly="true">`, restoring the `<label for="fDureeTotal">` link. Added an explicit radix to `parseInt(a.duree, 10)` for correctness.

## Review Triage Log

- "Div-based total display breaks label association and readonly/assistive-tech semantics" — verdict: real accessibility regression, simple fix. Patched: swapped for `<input readonly aria-readonly="true">` with restored `<label for=...>`.
- "`parseInt(a.duree)` missing an explicit radix" — verdict: low but trivial to fix. Patched.
- "Derived total has no min/max sanity-check feedback like the old manual input" — verdict: false. A min/max range constraint applies to user-typed input; it doesn't make sense on a read-only computed display the coach can't directly edit — the constraint moved to each Atelier's own `duree` input, where it still applies.
- "No cleanup for a stale `dureeTotal` key on old stored Séances" — verdict: false. `web-board/data/seances/` is confirmed empty — no existing data carries the old field.
- "`computeDureeTotal` could throw on a malformed/`null` Atelier entry" — verdict: low, rejected. `ateliers` is only ever populated by this file's own controlled mutation functions (never external/untrusted input for a single-user local app), consistent with the rest of the codebase's lack of defensive null-guards on these same arrays elsewhere.
- "Saving an old-shaped Séance might round-trip a stale `dureeTotal` key back out" — verdict: false, moot given no existing data has the old field (same as above).

