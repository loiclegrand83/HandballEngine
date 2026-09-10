- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-migration-de-la-taxonomie-vers-thematique.md`
  summary: No deprecation/reconciliation path documented for the legacy `category` field now that `thematique` exists alongside it.
  evidence: Review noted both fields will coexist indefinitely with no stated plan; not required by this story's scope (explicitly kept `category` untouched), but worth a future decision once Epic 2 UI work settles.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-migration-de-la-taxonomie-vers-thematique.md`
  summary: `web-board/scripts/migrate-thematique.js` has no `--dry-run` flag to preview mapping decisions before writing.
  evidence: Review suggestion for a one-off script; not needed for this run (already interactive with a backup), but would help if the script is ever reused for a larger dataset.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-migration-de-la-taxonomie-vers-thematique.md`
  summary: `web-board/scripts/migrate-thematique.js` has no `require.main === module` guard, so its mapping logic can't be imported/unit-tested separately from running the full interactive migration.
  evidence: Review suggestion; the script is a one-off (not part of the running app), so no test suite currently covers it — low priority unless it's reused or extended.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-migration-de-la-taxonomie-vers-thematique.md`
  summary: The migration script logs only to stdout; no machine-readable report file (e.g. JSON) is written alongside the timestamped backup for later audit.
  evidence: Review suggestion for auditability of a one-off data migration; the backup directory itself is the recovery mechanism today.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-assigner-thematique-filtrer-bibliotheque.md`
  summary: The 4-value Thématique enum (`attaque|defense|gardien|enclenchement`) is now duplicated across `board.html` (two `<select>`s' options), `styles.css` (badge selectors), and `app.js` (`thematiqueLabels` map + a separate validation array in `loadExerciseFromData`) — 4+ copies with no single source of truth, so a future 5th value or a spelling fix needs several synchronized edits and a typo in one copy would silently produce an always-empty filter.
  evidence: Review finding on Story 2.2. The natural fix is the shared `web-board/src/js/bibliotheque.js` client module already earmarked by the architecture (AD-1) for board/séance/planning to consume — consolidating the enum there once that module exists (likely when Epic 3's Séance picker needs shared library logic) is more proportionate than introducing a new shared file just for this one array now.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-recherche-mot-cle-champs-enrichis-fiche.md`
  summary: Bibliothèque search (`matchesSearch`/`deriveSearchIndex`) does plain substring matching with no accent/diacritic normalization (`normalize('NFD')` stripping), so an unaccented query can miss accented values.
  evidence: Review suggestion; not required by Story 2.3's AC (case-insensitive substring is all that's specified), but would improve real-world usability for French text.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-recherche-mot-cle-champs-enrichis-fiche.md`
  summary: The player/gardien "is this a human item" detection (`item.id.startsWith('player')`/`startsWith('G')`) is now duplicated a third time in `deriveSearchIndex`, matching two pre-existing inline copies elsewhere in `app.js` (around lines 616 and 1362) — no shared helper exists.
  evidence: Review finding; pre-existing duplication pattern, not introduced by this story, but a future id-convention change would need to update three call sites with no test coverage to catch a missed one.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-recherche-mot-cle-champs-enrichis-fiche.md`
  summary: Bibliothèque cards (`renderLibrary()`) don't surface the new `duree`/`nbJoueurs`/`niveau` fields visually — they're searchable and editable but not shown at a glance on the library tile.
  evidence: Review suggestion; not required by Story 2.3's AC, which only requires the fields to exist and be optional/editable.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-construire-seance-blocs-ateliers.md`
  summary: Once an Atelier is snapshotted into a Bloc, only its `duree` is editable in the builder UI — `description` and `materiel` have no edit field, only "Changer" (replace with a different Exercice entirely) or "Supprimer".
  evidence: Review suggestion; not required by this story's AC (snapshot-at-add-time + reorder + replace), but a coach who wants to tweak the copied description/matériel text for this specific Séance currently can't.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-construire-seance-blocs-ateliers.md`
  summary: The old per-Bloc-type default duration (échauffement=15, retour au calme=10, other=20 min) was dropped when duration moved from Bloc-level to per-Atelier; new Ateliers default to a flat 15 min with no type-based nudge.
  evidence: Review observation; consistent with the new per-Atelier model (a Bloc no longer has one type), but loses a small piece of the old UI's guidance. Not required by any AC.
