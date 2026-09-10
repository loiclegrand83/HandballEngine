---
title: 'Assigner une Thématique et filtrer la Bibliothèque'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2.1 added the `thematique` field and a save-time selector on the Board, but the Bibliothèque modal's filter (`web-board/pages/board.html:140` `#libraryFilter`) and card badge (`renderLibrary()` in `app.js`) still filter and label by the legacy `category` field — the coach can assign a Thématique but can't yet use it to find exercises.

**Approach:** Swap the Bibliothèque modal's filter dropdown and card badge from `category` to `thematique` (4 enum values instead of the 5 legacy categories), with matching badge colors in `styles.css`. `category` itself is untouched — still assignable via its own dropdown, still used by `seance.js`/`explanation.html` elsewhere (out of scope here, per Story 2.1's boundary). Story 2.3 (keyword search) is a separate follow-up story, not built here.

</frozen-after-approval>

## Implementation Notes

- `web-board/pages/board.html`: `#libraryFilter` options replaced — 4 Thématique values + "Toutes les thématiques" instead of the 5 legacy categories + "Sans catégorie". Dropped the "none" option since `thematique` is now required and server-validated (Story 2.1) — no exercise can lack one going forward.
- `web-board/src/js/app.js` `renderLibrary()`: filter predicate now compares `ex.thematique` to the dropdown value; `categoryLabels` map replaced with `thematiqueLabels` (4 entries); badge now sets `data-thematique` (was `data-category`) and falls back to an "Inconnue" label/attribute only for the theoretical case of an exercise still missing the field (pre-migration edge case, not expected in practice since Story 2.1 migrated all 7 existing files).
- `web-board/src/css/styles.css`: badge color rules rekeyed from `[data-category="..."]` (5 legacy values) to `[data-thematique="..."]` (4 enum values), reusing the closest existing colors (attaque=green, defense=blue, gardien=yellow, enclenchement=purple).
- `category` field, its own assignment dropdown, and its use in `seance.js`/`explanation.html` are untouched — out of scope per Story 2.1's boundary, still carried forward.
- Verified against the real data: started the server, confirmed all 7 exercises (migrated in Story 2.1) carry a valid `thematique` value, so the filter has no unclassified-exercise edge case to worry about today; shut the server down after.

## Review Triage Log

- "Filter dropped the old 'Sans catégorie' option — no way to isolate exercises with a missing/invalid `thematique`" — verdict: low, rejected. Server-side validation (Story 2.1, `validateExercise`) rejects every write without a valid `thematique`, and all 7 existing files were migrated — there is no live code path that can produce such an exercise today.
- "`them === null` fallback ('Inconnue' badge/filter) has no CSS style and no test" — verdict: low, rejected. It's an unreachable defensive path given the server invariant above; it degrades gracefully to the generic grey badge style, which is acceptable for a state that can't currently occur.
- "Enum values duplicated 4× across `board.html`/`styles.css`/`app.js` with no single source of truth — typo risk" — verdict: real, caused by this change (added 3 of the 4 copies) and by Story 2.1 before it. Not a "simple" patch here: the proportionate fix is the shared `bibliotheque.js` client module the architecture already earmarks (AD-1), not a new ad hoc shared file for one array. Deferred.
- "No documented canonical order/spelling for the enum, so a typo could silently break filtering" — same root cause as the duplication finding above; grouped, deferred.
- "No back-compat note for pre-migration exercises with only `category`, no `thematique`" — verdict: low, rejected. Same reasoning as the first finding — the server invariant already prevents this from occurring for any write made through the app.
- "CSS lost the comment explaining why Thématique colors reuse the old category colors" — verdict: low, rejected. Cosmetic; the color choices are visible in the diff itself and don't need inline narration to be maintainable.

