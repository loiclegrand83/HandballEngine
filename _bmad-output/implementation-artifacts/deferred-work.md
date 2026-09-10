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
