---
title: 'Construire une Séance en Blocs/Ateliers'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'dispatch'
baseline_commit: 'eb700f347afa4a3c858129dde2934847890bb67'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `web-board/src/js/seance.js` already has a working Séance builder, but its data model doesn't match this story: today one Bloc holds a fixed `type` (échauffement/exercice/opposition/retour_calme) and **one live-linked** `exerciceId` (looked up by id from `allExercises` every render — if the source Exercice is edited, the Bloc shows the edited version, and there's no way to add more than one exercise per Bloc). The story requires a Bloc to contain **one or more Ateliers**, each an **independent snapshot** of the Exercice's text (name/description/matériel/durée) taken at add-time, not a live link — and Blocs and Ateliers must both be reorderable.

**Approach:** Change `seance.blocs[]` from `{type, exerciceId, duree, notesCoach}` to `{nom, ateliers: [{exerciceId, nom, description, materiel, duree}], notesCoach}`. Add/remove/reorder Ateliers within a Bloc using the existing exercise-picker modal (already wired to `filterModal()`), now snapshotting the picked Exercice's fields into the Atelier instead of just storing its id. Keep Bloc-level add/reorder/remove (already implemented via `moveBloc`) working. Update the two renderers that read `bloc.exerciceId` (`createBlocEl` in the editor, `buildDocument`'s Bloc loop) to iterate `bloc.ateliers` instead — this touches Story 3.4's export too, since one Bloc can now show multiple Atelier cells, but only to the extent needed so 3.1's own UI and existing print path don't break; Story 3.4 owns the full recap grid redesign.

**Decision — Bloc naming:** Bloc gets a free-text `nom` field (plain `<input>`, editable by the coach). The 4 existing "+ Échauffement / + Exercice / + Opposition libre / + Retour au calme" buttons stay as presets that pre-fill `nom` with that label — no behavior change to how a coach starts a Bloc, but the name is then freely editable (e.g. to "Thème principal — jeu de transition"). The `opposition` type's special "no exercise" meaning is dropped entirely: an "Opposition libre" Bloc is now just a normal Bloc with zero Ateliers, which the UI already renders gracefully today ("— Aucun exercice —" placeholder → becomes an empty Ateliers-list placeholder). The old `bloc.dataset.type`-keyed CSS color-coding is preserved as a best-effort cosmetic cue: derive `data-type` by matching `nom` case-insensitively against the 4 preset labels when it still matches one, falling back to a neutral/default style otherwise — not covered by any AC, decided here rather than raised as a second question.

</frozen-after-approval>

## Code Map

- `web-board/src/js/seance.js:6-15,109-119` — `seance.blocs[]` shape to change: `{type, exerciceId, duree, notesCoach}` → `{nom, ateliers: [], notesCoach}`. `duree` moves from Bloc-level to per-Atelier (each Atelier snapshot carries its own `duree`; see Story 3.2 for auto-total, but the field must exist per-Atelier now).
- `web-board/src/js/seance.js:200-314` (`renderBlocList`/`createBlocEl`) — currently looks up one `ex = allExercises.find(e => e.id === bloc.exerciceId)` and renders one thumb/name/picker; becomes a loop over `bloc.ateliers`, each with its own thumb/name/"Changer"/"Supprimer" and its own up/down position within the Bloc. Bloc name becomes an editable text input bound to `bloc.nom`. `data-type` for CSS is derived from `nom` (case-insensitive match against the 4 preset labels; default style otherwise).
- `web-board/src/js/seance.js:316-333` (`addBloc`/`removeBloc`/`moveBloc`) — `addBloc(type)` creates `{type, exerciceId: null, duree: ..., notesCoach: ''}`; becomes `addBloc(presetNom)` creating `{nom: presetNom, ateliers: [], notesCoach: ''}`.
- `web-board/src/js/seance.js:338-352` (`updateMaterialSummary`) — iterates `bloc.exerciceId` via `allExercises.find`; must iterate `bloc.ateliers` and read the snapshotted `materiel` field directly (no more live lookup needed once Ateliers snapshot their own materiel — simpler than today).
- `web-board/src/js/seance.js:366-415` (`openExercisePicker`/`filterModal`) — `openExercisePicker(blocIdx)` currently sets `seance.blocs[blocIdx].exerciceId`; needs to push a new Atelier (snapshotting `ex.name`, `ex.notes` or a description field, `ex.explanation?.material`, and a default `duree`) into `seance.blocs[blocIdx].ateliers` instead. `filterModal()` filters on `ex.category` — Epic 2 replaced the Bibliothèque's own filter with `ex.thematique`; this picker should match that (filter on `thematique`, not `category`) for consistency, though the epic context flags the shared `bibliotheque.js` extraction as not-yet-built — keep this picker's own inline filter logic for now, just point it at `thematique`.
- `web-board/src/js/seance.js:475-616` (`buildDocument`) — Story 3.4 owns the full recap grid, but this story's own Bloc-model change means the current single-exercice-per-bloc rendering here would break if left untouched; this story updates it minimally to loop over `bloc.ateliers` (one doc-bloc section per Atelier, keeping today's layout/classes) so the existing print path keeps working — not a redesign.
- `web-board/pages/seance.html:87-90` — the 4 `addBloc(...)` button `onclick` calls; change args to the preset label strings (e.g. `addBloc('Échauffement')`).
- `web-board/data/seances/` is currently empty — no existing saved Séance data to migrate.
- Exercice fields available to snapshot into an Atelier (per Epic 2): `name`, `thematique`, `category`, `duree`/`nbJoueurs`/`niveau` (optional), `notes`, `explanation.material` (existing nested field, already used by `updateMaterialSummary`/`buildDocument` today — not touched by Epic 2, still the real source of "matériel").

## Tasks & Acceptance

**Execution:**
- [x] `web-board/src/js/seance.js` -- change `seance.blocs[]` shape to `{nom, ateliers: [], notesCoach}` and update `newSeance()`/`addBloc(presetNom)` to match
- [x] `web-board/src/js/seance.js` `createBlocEl` -- render a list of Ateliers per Bloc (thumb, name, duree, "Changer"/"Supprimer" per Atelier) instead of one exercice; keep Bloc-level up/down/remove
- [x] `web-board/src/js/seance.js` `openExercisePicker`/`filterModal` -- snapshot the picked Exercice's fields into a new Atelier on selection (push, don't just set an id); switch the category filter to `thematique`
- [x] `web-board/src/js/seance.js` `updateMaterialSummary` -- read `materiel` from each Atelier's snapshot, not via live `allExercises` lookup
- [x] `web-board/src/js/seance.js` `buildDocument` -- loop over each Bloc's Ateliers (minimal update to keep the existing print path working; full recap grid redesign is Story 3.4)
- [x] `web-board/pages/seance.html` -- update the 4 preset `addBloc(...)` button calls to pass the preset label string; add a `nom` text input to the Bloc editor UI
- [x] Add Atelier-level reorder controls (up/down) within a Bloc, alongside the existing Bloc-level reorder

**Acceptance Criteria:**
- Given the coach clicks "+ Échauffement" (or any of the 4 presets), when the Bloc is created, then its `nom` is pre-filled with that preset's label, but the coach can freely rename it afterward (e.g. to "Thème principal — jeu de transition")
- Given an "Opposition libre" Bloc (created via that preset), when it has zero Ateliers, then it renders using the same empty-state placeholder as any other Bloc with no Ateliers — no special-cased "opposition" behavior remains in the code
- Given a Bloc with zero Ateliers, when the coach adds one via the picker, then the Exercice's name/description/matériel/durée are copied into the Atelier immediately (not looked up live on every render)
- Given an Atelier already added to a Bloc, when the coach later edits and saves the source Exercice on the Board, then the already-added Atelier's snapshotted text is unchanged (no live update)
- Given a Bloc with two or more Ateliers, when the coach reorders them (up/down), then their order persists in `seance.blocs[i].ateliers`
- Given the exercise picker modal, when the coach picks a Thématique filter, then it filters on `ex.thematique` (not the legacy `ex.category`)
- Given a source Exercice is deleted from the Bibliothèque after being added as an Atelier, when the Séance is reopened, then the Atelier still shows its snapshotted name/description/matériel/durée with a placeholder instead of the schéma image (schéma was already sourced from a pre-baked `explanation.steps[0].snapshot`, which naturally disappears if the exercise is gone — no crash)

## Implementation Notes

- `seance.blocs[]` changed to `{nom, ateliers: [{exerciceId, nom, description, materiel, duree, snapshot}], notesCoach}`. `addBloc(presetNom)` creates an empty-Ateliers Bloc pre-named from the preset; the 4 buttons in `seance.html` now pass label strings.
- `createBlocEl`: Bloc name is a free-text `<input>` bound to `bloc.nom`; renders each Atelier via new `createAtelierEl` (thumb, name, duree, up/down/"Changer"/"Supprimer"). `blocDataType(nom)` derives the CSS `data-type` by case-insensitive match against the 4 preset labels, falling back to `'default'` (which resolves through the existing `var(--bloc-color, var(--muted))` CSS fallback — no new selector needed).
- `openExercisePicker`/`filterModal`: picking an Exercice snapshots `name`/`notes`/`explanation.material`/a default `duree`/`explanation.steps[0].snapshot` into a new Atelier; the picker's Thématique select now filters `ex.thematique` instead of the legacy `ex.category`.
- `updateMaterialSummary`/`buildDocument`'s material bar read `materiel` straight from each Atelier snapshot — no more live `allExercises` lookup.
- `buildDocument`'s Bloc loop renders one `.doc-bloc-atelier` section per Atelier (schema + name/duree/description), keeping the existing print classes/layout; a Bloc with zero Ateliers (including "Opposition libre") shows the same "Aucun exercice" placeholder.
- Added `moveAtelier`/`removeAtelier` for per-Atelier reorder/removal, alongside the existing Bloc-level `moveBloc`.
- Verified: `node -c` on `seance.js`; round-tripped a Séance with the new shape through the real `/api/seances` POST+GET (confirmed exact structure preserved); manually traced every AC against the diff.
- **Review finding fixed (real functional bug):** the "Changer" button on an existing Atelier called `openExercisePicker(blocIdx, atelierIdx)`, but the function ignored `atelierIdx` and always `push`ed a new Atelier — "Changer" silently duplicated instead of replacing. Fixed: when `atelierIdx` is provided, the picked exercise now replaces `ateliers[atelierIdx]` in place (preserving the previously-set `duree`). Re-verified with a Node simulation: replacing atelier 0 of 1 now yields exactly 1 atelier with the new exercise's data and the old duration.
- **Review finding fixed (unescaped HTML):** `atelier.nom`/`description`/`materiel` (free text snapshotted from user-entered Exercice fields) were interpolated raw into `innerHTML` in both the editor (`createAtelierEl`) and the printable document (`buildDocument`), including inside an `alt="..."` attribute — an Exercice name/notes containing `<`, `>`, `&`, or `"` could break markup or inject HTML into the printed sheet. Added a shared `escapeHtml()` helper and applied it to `atelier.nom`, `atelier.description`, the consolidated `materiel` string, and (for consistency, since it's the same new-field pattern) `bloc.nom` in both the editor input's `value` attribute and the document's `.doc-bloc-name`. Re-verified: saved a Séance with `<script>`/`<img onerror>`/`&`/`"` in these fields through the real server; `escapeHtml` output checked directly.
- **Review finding fixed (responsive layout):** `.atelier-row` (new, `display: flex` with no wrap) combined with the fixed 200px `.bloc-thumb` and an inner row of name+duree-input+4 buttons had no wrap/stacking rule, unlike Blocs' old layout — on narrow tablet widths this could overflow. Added `flex-wrap: wrap` to `.atelier-row` and its inner header row, plus `min-width` hints so the name/actions wrap onto their own line under the thumb instead of overflowing.

## Review Triage Log

- **"Changer" duplicates instead of replacing an Atelier** — verdict: high, real functional bug, caused by this change. Fixed (see Implementation Notes).
- **Unescaped `atelier.nom`/`description`/`materiel`/`bloc.nom` in `innerHTML`** — verdict: high (markup/HTML injection from free-text exercise data into the editor and printable document). Fixed with a shared `escapeHtml()` helper.
- "No migration/normalization path for Séances saved under the old `{type, exerciceId}` schema" — verdict: false in practice. `web-board/data/seances/` is confirmed empty (no saved Séances exist yet), so there is no real data this affects; the codebase has never persisted a Séance under the old shape.
- "`blocDataType` falls back to `'default'` with no matching `[data-type="default"]` CSS rule" — verdict: false. Every consumer of `--bloc-color`/`--doc-bloc-color` already uses `var(--bloc-color, var(--muted))`, so an unmatched `data-type` degrades to the neutral color automatically — no missing rule.
- "`.atelier-row`'s fixed-width thumb + button row has no responsive wrap" — verdict: real, caused by this change (new layout, tablet-first product). Fixed: `flex-wrap: wrap` added to the row and its inner header, with `min-width` hints.
- "No UI to edit an Atelier's `description`/`materiel` after snapshot, only `duree`" — verdict: real gap but not required by this story's AC. Deferred.
- "Full re-render on every field edit could drop input focus mid-typing" — verdict: false. All the relevant listeners (`bloc.nom`, `notesCoach`, `atelier.duree`) use the `change` event, which fires on blur/commit, not per-keystroke — confirmed by reading the actual `addEventListener` calls, not just the claim.
- "Lost the old per-Bloc-type default duration (15/10/20 min) now that duration is per-Atelier" — verdict: real, minor, consistent with the new model (a Bloc no longer has a single type). Deferred.

