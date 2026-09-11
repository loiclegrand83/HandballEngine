# Epic 3 Context: Séance — Construction & Export

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let the coach compose a training Séance from named Blocs (échauffement, thème principal, retour au calme...), each containing one or more Ateliers picked from the Bibliothèque, adjust each Atelier's duration with the Séance total recalculating automatically, save and reopen a Séance in progress, and produce a print-ready export (via browser print) laid out as a compact multi-Atelier grid — so the coach can plan a full session and walk onto the pitch with a printed sheet.

## Stories

- Story 3.1: Build a Séance from Blocs/Ateliers (picker from Bibliothèque, snapshot at add-time, reorder)
- Story 3.2: Adjustable Atelier durations with auto-recalculated total
- Story 3.3: Save and reopen a Séance
- Story 3.4: Printable export of the Séance (window.print, fixed-grid recap)

## Requirements & Constraints

- A Séance is built from named Blocs; each Bloc holds one or more Ateliers chosen from the Bibliothèque. Blocs and Ateliers must be reorderable before export.
- Each Atelier's duration is editable; the Séance's total duration is auto-computed and recalculated on every change — it is never stored.
- A Séance can be saved mid-construction and reopened later for further edits, before export or before being placed on the Calendrier. An unsaved Séance must never appear on the Calendrier (it isn't persisted).
- Export produces a browser-print output only (no PDF library): a compact multi-Atelier grid, roughly 3–5 schémas per page depending on content complexity — not a hardcoded count. Each printed Atelier cell shows schéma, short description, matériel, and durée.
- The richer Exercice fields (durée, nbJoueurs, niveau, added in Epic 2) are optional and never block a fast save — relevant if Séance/Atelier UI surfaces them.

## Technical Decisions

- **Atelier = snapshot, not live link.** When an Exercice is added to a Séance as an Atelier, its text fields (nom, description, matériel, durée) are copied into the Séance's own JSON at that moment. Editing the source Exercice afterward does not change an already-built Séance. Only the Exercice `id` stays a live reference, used solely to re-render the schéma. If the source Exercice is later deleted, the Atelier keeps its snapshotted text but shows a placeholder instead of the schéma.
- **Duration is always derived, never persisted.** Total Séance duration is computed at render time from the current Ateliers' durée fields, at every read site (builder UI, Calendrier tile, print export) — it is never written to the Séance JSON.
- **Recap/export grid.** One fixed cell template (schéma + description + matériel + durée), filled in Bloc order, using CSS `break-inside`/`break-after` for automatic page breaks — no manual per-page cell count, no manual reordering in the export view itself (reordering happens earlier, in the builder).
- **No PDF library.** Export is `window.print()` against the print CSS already present in `src/css/seance.css`. Do not add a PDF dependency.
- **Shared Bibliothèque client module.** All client-side fetch/filter/search/render logic against `/api/exercises` is meant to live in one shared module, `src/js/bibliotheque.js`, loaded by any page (board, séance, planning) that needs to browse/filter exercises. This module does not yet exist in the repo — Epic 3 work that touches the exercise picker should extract/use it rather than keep a bespoke copy.
- **Schema rendering module.** Canvas schema rendering is meant to be extracted into a reusable `src/js/schema-render.js` (taking raw items/paths) shared by Séance recap and Calendrier. This module does not exist yet either; currently the Séance code renders schémas from a pre-baked `snapshot` image stored on the exercise's first explanation step (`ex.explanation.steps[0].snapshot`), not from a live canvas render — reconciling this with AD-4's "always render live" intent is a live gap to resolve during implementation.
- **Server route pattern.** Any new/modified route (e.g. Séance validation) must follow the existing `handleCrudRoute()` pattern in `web-board/server.js`: id validated against `^[a-zA-Z0-9_-]+$`, resolved path re-verified inside its target directory, 1MB body cap, security headers applied.
- **Existing codebase — NOT greenfield.** A substantial Séance builder already exists and Epic 3 stories extend/modify it rather than build from scratch:
  - `web-board/server.js:171` — `/api/seances` route already registered via generic `handleCrudRoute(req, res, '/api/seances', SEANCES_DIR)`, with no custom validation function (exercises has one, `validateExercise`; seances does not — Story 3.1–3.3 may need one).
  - `web-board/data/seances/` already contains saved Séance JSON files.
  - `web-board/pages/seance.html` (152 lines) + `web-board/src/js/seance.js` (643 lines) — a working three-view app (editor / library / printable document) already implements: Séance state (`titre, date, theme, coach, dureeTotal, objectif, blocs[]`), Bloc CRUD (add/remove/reorder via `moveBloc`), an exercise picker modal (`modalCat` category filter + `modalSearch` keyword filter via `filterModal()`), material summary aggregation, save/load/delete against `/api/seances`, and a `buildDocument()` function that renders the printable recap page consumed by `window.print()` (wired to `btnPrint`).
  - Gaps vs. Epic 3 requirements to check against current code: `dureeTotal` is currently stored as a manually-edited field (`fDuree` input, `collectMeta()`) rather than auto-computed from Ateliers (violates AD-9 as currently implemented — needs to become derived); Blocs currently hold a single `exerciceId` each rather than an Atelier list with snapshotted text (violates AD-8's snapshot model — currently a live `exerciceId` lookup via `allExercises.find()`, not a copy); the exercise picker filters on `ex.category` (old taxonomy), not the new Thématique enum from Epic 2; there's no `bibliotheque.js`/`schema-render.js` extraction yet — this picker/render logic is currently inlined in `seance.js`.
  - `web-board/src/css/seance.css` (730 lines) already contains editor, library, and document/print-specific styles (`.doc-bloc`, print rules) to build on.

## Cross-Story Dependencies

- Story 3.1 (Bloc/Atelier snapshot model) is a prerequisite for 3.2 (per-Atelier duration must live per-Atelier, not per-Bloc as today) and for 3.4 (export grid renders per-Atelier cells).
- Story 3.3 (save/reopen) underlies Epic 4's Calendrier linking: only a saved Séance can be referenced by a Calendrier event, and Calendrier tiles will need the same derived-duration computation as the builder (AD-9).
- The Bibliothèque picker in Story 3.1 depends on Epic 2's Thématique enum and search fields being available on Exercice records, and should converge on the shared `bibliotheque.js` module once it exists (also used by Board and Calendrier).
- Schema rendering for the export grid (Story 3.4) depends on the same `schema-render.js` extraction referenced by Epic 2/Board work — coordinate rather than duplicate canvas-rendering logic.
