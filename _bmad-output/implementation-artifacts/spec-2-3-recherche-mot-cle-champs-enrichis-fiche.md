---
title: 'Recherche par mot-clé + champs enrichis de la fiche'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Bibliothèque modal has no keyword search (only the Story 2.2 Thématique filter), and the Exercice fiche has no fields for durée estimée, nombre de joueurs requis, or niveau/catégorie d'âge — coaches can't find or document exercises with this level of detail.

**Approach:** Add a search input to the Bibliothèque modal (`web-board/pages/board.html`) that matches (case-insensitive substring) exercise name, postes impliqués, and matériel — derived at search time from each exercise's existing `items` array (player entries with `.post` for postes, non-player entries' `.label` for matériel), combined with the existing Thématique filter via logical AND. Add three new optional top-level fields (`duree`, `nbJoueurs`, `niveau`) to the Exercice fiche panel, persisted alongside `name`/`thematique`/`category`. `web-board/pages/explanation.html`'s separate nested `explanation.doc.*` fields are untouched, per Story 2.1's boundary — no real data currently populates them (confirmed: 0 of 7 exercise files have `explanation.doc.duree/nbJoueurs/niveau` set), so no reconciliation is forced by this story.

## Boundaries & Constraints

**Always:**
- Search matches must be case-insensitive substrings across name, derived postes, and derived matériel; combined with the Thématique filter using AND (both narrow the result set together).
- The three new fiche fields (`duree`, `nbJoueurs`, `niveau`) must be optional — omitting them must never block or slow down a save (mirrors NFR3, same discipline as Story 2.1's `thematique` handling, except these three are NOT server-validated/required, unlike `thematique`).
- Postes/matériel for search are derived from `ex.items` at search time, never persisted as a separate indexed field — same "don't persist derived values" discipline as the codebase's existing duration-recalculation pattern.

**Never:**
- Do not touch `web-board/pages/explanation.html` or its nested `explanation.doc.*` fields.
- Do not add server-side validation/requirement for `duree`/`nbJoueurs`/`niveau` — they're free-form optional, unlike the closed `thematique` enum.
- Do not build a full "niveau" closed-list vs free-text decision beyond a simple text input — the PRD leaves this open with no architectural constraint either way, so free text is the simplest compliant choice.

</frozen-after-approval>

## Implementation Notes

- `web-board/pages/board.html`: added `exerciseDuree` (number), `exerciseNbJoueurs` (number), `exerciseNiveau` (free text) to the Exercice panel; added `librarySearch` text input to the Bibliothèque modal's filter row, before the existing Thématique `<select>`.
- `web-board/src/js/app.js`: `_persistExercise()` now sends `duree`/`nbJoueurs` as `Number(...)` or `null` when empty, `niveau` as a plain string (all optional, no validation — matches the "Never require these" boundary, unlike `thematique`). `loadExerciseFromData()` and the `newExercise` reset handler populate/clear all three. `deriveSearchIndex(ex)` and `matchesSearch(ex, query)` are new pure helpers: postes come from player/gardien items' `.post` field, matériel from non-player items' `.label` — nothing new is persisted, matching the codebase's existing "derive at display/search time" convention. `renderLibrary()` now applies the search filter (case-insensitive substring, AND'd with the existing Thématique filter) alongside the Story 2.2 filter; a new `input` listener on `librarySearch` re-renders on each keystroke, same pattern as the existing `libraryFilter` `change` listener.
- Verified: `node -c` on `app.js`; started the real server, POSTed an exercise with all three new fields and confirmed the round-trip via GET; unit-checked `deriveSearchIndex`/`matchesSearch` against a real exercise file in a Node REPL (name substring match works; confirmed the 7 real exercises currently have no `.post`/equipment `.label` set on their items, so poste/matériel search has nothing to match yet on existing data — expected, not a bug, since no coach has used the poste-assignment buttons on these particular exercises). Test artifacts cleaned up, server shut down.
- **Review findings fixed:** added `niveau` to `deriveSearchIndex`/`matchesSearch` (search now covers name + postes + matériel + niveau); truncated `niveau` to 200 chars on both save and load, matching the `notes` field's existing truncation pattern; `renderLibrary()` now shows an explicit "Aucun exercice ne correspond..." message when the filter+search combination excludes every exercise (previously the grid just went blank, only showing "bibliothèque vide" when the *unfiltered* list was empty); added a 200ms debounce to the search input so it doesn't refetch `/api/exercises` on every keystroke.
- Re-verified after fixes: `node -c` passed; started the server again, confirmed a `niveau`-only search query matches via a Node script hitting the live API.

## Review Triage Log

- "Search input refetches `/api/exercises` on every keystroke, no debounce" — verdict: low but simple to fix. Patched: 200ms debounce added.
- "No 'no results' message when filter+search excludes everything" — verdict: real UX bug, simple fix. Patched: the empty-state check now runs against the filtered `visible` list, with distinct messages for "bibliothèque vide" vs "aucun résultat."
- "No accent/diacritic normalization in search" — verdict: idea for later, not required by this story's AC (case-insensitive substring only). Deferred.
- "`niveau` not truncated/sanitized like `notes`" — verdict: real inconsistency, simple fix. Patched: `.slice(0, 200)` on both save and load.
- "`niveau` not included in the search index despite being a natural search dimension" — verdict: real gap, simple and safe to add, consistent with FR4's "au minimum" (floor, not ceiling) framing. Patched.
- "`isHuman` detection duplicated a third time instead of a shared helper" — verdict: real, but pre-existing duplication pattern (two other inline copies already existed in `app.js` before this story) — not a regression introduced here, and extracting a shared helper is a separate cleanup. Deferred.
- "`duree`/`nbJoueurs` have no clamping beyond soft HTML `min`/`step` constraints" — verdict: false/rejected. Matches this story's explicit boundary that these fields are deliberately free-form/unvalidated (unlike the closed `thematique` enum), for a single-user local tool where a garbage value only affects display, not data integrity.
- "Library cards don't visually surface the new fields" — verdict: real but not required by this story's AC (fields must exist, be optional, and be editable — display on the card is a separate enhancement). Deferred.

