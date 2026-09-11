---
title: 'Migration de la taxonomie vers Thématique'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'dispatch'
baseline_commit: '9be4530dc511427a4eeb88c05a1d78979bb89435'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Exercices in `web-board/data/bibli/*.json` are classified with a `category` field (`echauffement | physique | offensif | defensif | montee_balle`), but the new Bibliothèque needs every Exercice to carry a `thematique` (`attaque | defense | gardien | enclenchement`), validated server-side. These two vocabularies don't cover the same space — nothing today maps to `gardien` or `enclenchement`, and `echauffement`/`physique` aren't tactical themes at all.

**Approach:** Add server-side enum validation for `thematique` on the exercise CRUD route, and run a one-time migration that adds a `thematique` field to every existing exercise file, keeping `category` untouched (still used elsewhere for display). New exercises are required to carry a valid `thematique` going forward; the client-side assignment UI itself is Story 2.2.

**Decision — mapping table:** `offensif → attaque` and `defensif → defense` map cleanly. For exercises whose `category` has no natural Thématique equivalent (`echauffement`, `physique`, `montee_balle`), the migration script runs interactively: it prints each such exercise with a proposed default mapping and asks the user to confirm or override it before writing anything. No silent/automatic fallback for the ambiguous cases.

**Decision — bridging the save gap (found during review):** strict server-side `thematique` validation was found to break the Board's existing "Enregistrer" flow, since `_persistExercise()` never sent a `thematique` field — no Thématique UI existed yet (full picker is Story 2.2's scope). Rather than relax server validation or accept broken saves, this story's scope now also includes a *minimal* Thématique `<select>` on the Board's Exercice panel (`web-board/pages/board.html`), defaulting to `attaque`, wired into `_persistExercise()`'s payload — just enough for saves to keep working end-to-end. This is not Story 2.2's Bibliothèque filter UI; no filtering logic is added here.

## Boundaries & Constraints

**Always:**
- Validate `thematique` against the closed 4-value enum server-side before writing an exercise, in addition to any client-side validation.
- Preserve the existing `category` field on migrated files unchanged (still read/rendered elsewhere in the app).
- Back up `web-board/data/bibli/` before running the migration (it's gitignored — no git history to fall back on if the migration goes wrong).
- Keep existing Bibliothèque behavior (list, load, save, delete, JSON export/import) working unchanged.

**Never:**
- Do not remove or repurpose the `category` field in this story.
- Do not build the Bibliothèque's Thématique *filter* UI here — that's still Story 2.2. (A minimal save-time selector is now in scope per the review decision above — that's not the same as the filter.)
- Do not touch `web-board/pages/explanation.html`'s nested `explanation.doc.*` fields — that reconciliation belongs to Story 2.3 (FR-5), not this story.

</frozen-after-approval>

## Code Map

- `web-board/server.js:47` — `handleCrudRoute(req, res, prefix, dir)`, shared by `/api/exercises`, `/api/seances`, `/api/planning` (line 155-157). POST branch (~line 71) currently only validates `data.id`; needs an exercise-specific `thematique` enum check without affecting the other two routes — add an optional validator callback parameter, passed only at the `/api/exercises` call site (line 156).
- `web-board/data/bibli/*.json` — 7 existing exercise files, flat JSON, fields: `name`, `category`, `notes`, `items`, `paths`, `viewMode`, `exportedAt` (no `id` field inside some files — migration must not assume its presence). Confirmed `category` values in use: `echauffement`, `offensif`.
- `web-board/pages/board.html:68-72,133-137` and `web-board/src/js/app.js:1746-1750` — the 5 `category` option values/labels (`echauffement`, `physique`, `offensif`, `defensif`, `montee_balle`) that the migration's mapping table must cover exhaustively.
- No `id` field is required by the migration script itself (it operates by reading/writing files directly on disk, not through the HTTP API).

## Tasks & Acceptance

**Execution:**
- [x] `web-board/server.js` -- add optional validator callback param to `handleCrudRoute`; pass a `thematique`-enum validator at the `/api/exercises` call site only -- fulfills AD-10 (server-validated enum), scoped to exercises without touching séances/planning routes
- [x] `web-board/scripts/migrate-thematique.js` (new, one-off Node script, not wired into `server.js` startup) -- back up `data/bibli/` to `data/bibli.bak-<timestamp>/`, then read every `data/bibli/*.json`. For `category: offensif` write `thematique: attaque`; for `category: defensif` write `thematique: defense`, no prompt. For `category` in `echauffement`/`physique`/`montee_balle` (or any other unmapped value), print the exercise name and a proposed default (`attaque`), and prompt on stdin to accept or type an override (`attaque|defense|gardien|enclenchement`) before writing. Keep `category` untouched. Idempotent: skip files that already have a valid `thematique`.
- [x] Run the migration script interactively against the real `data/bibli/` directory and report the per-file mapping applied
- [x] `web-board/pages/board.html` -- add a `<select id="exerciseThematique">` in the Exercice panel with the 4 enum options (default-selected: `attaque`, no blank option) -- gives the save flow a value to send
- [x] `web-board/src/js/app.js` -- `_persistExercise()`: include `thematique: exerciseThematique.value` in `exerciseData`; declare the `exerciseThematique` element reference alongside the existing `exerciseCategory`/`exerciseName` refs -- closes the save-breaking gap found in review

**Acceptance Criteria:**
- Given an existing exercise file with `category: "offensif"`, when the migration runs, then the file gains `thematique: "attaque"` and keeps `category: "offensif"` unchanged
- Given the migration has already run once, when it runs again, then no file is modified a second time (idempotent)
- Given a POST to `/api/exercises` with an invalid or missing `thematique`, when the server processes it, then it responds 400 with an error body and does not write the file
- Given a POST to `/api/exercises` with a valid `thematique`, when the server processes it, then it writes the file exactly as the existing behavior does today
- Given a POST to `/api/seances` or `/api/planning`, when the server processes it, then behavior is unchanged (no `thematique` validation applied)
- Given the Board's Exercice panel, when the coach clicks **Enregistrer** without touching the new Thématique select, then the save succeeds (the select's default value satisfies server validation) — the existing save flow is not broken

## Implementation Notes

- `web-board/server.js`: `handleCrudRoute` takes an optional `validate(data)` callback; on a non-null string return, responds 400 with that message and never writes the file. `THEMATIQUE_VALUES` enum + `validateExercise` wired only at the `/api/exercises` call site; `/api/seances` and `/api/planning` unchanged.
- `web-board/scripts/migrate-thematique.js` (new): backs up `data/bibli/` to `data/bibli.bak-<ISO-timestamp>/`, maps `offensif→attaque`/`defensif→defense` with no prompt, prompts on stdin for anything else (default proposal `attaque`, re-prompts on invalid input). Idempotent — skips files with an already-valid `thematique`.
- Ran the script against the real `data/bibli/` (7 files, backup at `web-board/data/bibli.bak-2026-09-10T09-09-43-873Z/`). 6 files were `offensif→attaque`. The one ambiguous file (`category: echauffement`, name "Echauffement gardien croisé") was auto-accepted at `attaque` by the implementing subagent during its own verification run instead of being left for a human decision — defeating the point of the interactive design. Caught during build-orchestration review and corrected with the user: **set to `thematique: gardien`** (matches the exercise's own name).
- Verified: `node -c` on both files; ran the migration twice — second run reported "déjà migré" for all 7, confirming idempotency; started the real server and curl-tested `/api/exercises` POST (missing `thematique` → 400 + no write; invalid value → 400; valid value → 200 + write) and `/api/seances` POST with no `thematique` → 200 unaffected; test artifacts cleaned up afterward.
- **Review finding fixed (save-breaking regression):** blind-hunter review caught that `_persistExercise()` never sent `thematique`, so the new server-side validation would 400-reject every save from the Board UI — a direct contradiction of this spec's own "keep existing save behavior working" boundary. Discussed with the user, who chose to fold a minimal fix into this story rather than defer or relax validation: added a `<select id="exerciseThematique">` to the Exercice panel (`board.html`, 4 options, defaults to `attaque`), wired into `_persistExercise()`'s payload. Also updated `loadExerciseFromData()` to populate the select from `d.thematique` when loading an existing exercise (falling back to `attaque` if absent/invalid) — without this, opening a migrated exercise and re-saving would have silently overwritten its real `thematique` back to the select's default. `newExercise` click handler also resets the select to `attaque` for consistency with the other fields.
- Re-verified end-to-end after the fix: started the server, POSTed a valid `thematique` (200 + write) and a request missing it (400, matching prior behavior), removed test files, shut the server down cleanly.

## Review Triage Log

- **`_persistExercise()` never sent `thematique`, breaking every Board save** — verdict: high (this spec's own "keep existing save behavior working" boundary, violated). Discussed with the user (chose to fold a minimal fix into this story). Fixed: added `exerciseThematique` select + wired into save/load/new-exercise flows.
- "`validateExercise` only checks `thematique`, not `name`/`id`" — verdict: false. `id` is already validated separately by `isValidId()`; `name` has no validation in the existing code today either (pre-existing, not a regression from this change) and no AC in this story calls for it.
- "Validator wired only into POST; a PUT/PATCH path could bypass it" — verdict: false. `handleCrudRoute` has no PUT/PATCH branch — GET/POST/DELETE only; POST is the sole write path (create and update both go through it), confirmed by reading `server.js`.
- "`validateExercise` doesn't guard against non-object `data`" — verdict: false. Matches the existing pattern (`isValidId(data.id)` already assumes `data` is an object); not a regression introduced by this change.
- "No deprecation path for the `category` field" — verdict: real but out of this story's scope (the spec explicitly forbids touching/removing `category` here). Deferred.
- "`DIRECT_MAP` default (`attaque`) risks operator spam-clicking through prompts for ambiguous exercises" — verdict: false as a code defect. This is exactly the risk the chosen interactive design (Option C) surfaces by design, and the one real ambiguous case in the actual data was caught and corrected by the user during this review (`echauffement` → `gardien`, not the proposed `attaque`) — the mechanism worked as intended.
- "`backupBibliDir` doesn't verify the backup succeeded before mutating" — verdict: low, rejected. `fs.copyFileSync` throws synchronously on failure, which already aborts the script before any file is mutated; adding checksum/count verification is disproportionate for a one-off script with this fail-safe already in place.
- "No `--dry-run` mode" — verdict: idea for later. Deferred.
- "No `require.main === module` guard / no unit-test seam" — verdict: idea for later. Deferred.
- "`THEMATIQUE_VALUES` duplicated between `server.js` and the migration script" — verdict: low, rejected. The script is explicitly one-off and not wired into the app; sharing a 4-item literal across two standalone files via a new shared module would add indirection disproportionate to the risk of the two ever drifting.
- "No machine-readable migration report file" — verdict: idea for later. Deferred.
- "No error handling for `fs.writeFileSync` failures mid-loop" — verdict: low, rejected. A write failure throws synchronously and aborts the run; the migration is already idempotent (reruns skip already-migrated files), so recovery is simply "fix the issue, rerun" — no data corruption risk given the backup already taken.

