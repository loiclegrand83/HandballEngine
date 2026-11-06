---
title: Rubric Review — ARCHITECTURE-SPINE (HaWeb)
reviewed: ARCHITECTURE-SPINE.md (architecture-haweb-2026-09-06)
against: prd.md (prd-haweb-2026-09-06), web-board/ brownfield codebase
date: 2026-09-06
verdict: CONDITIONAL PASS — one real divergence point missed (data taxonomy migration), one schema-shape decision left silent (FR-5 field location), rest of the spine is sound and well-calibrated
---

# Rubric Review — HaWeb Architecture Spine

## Verdict

**Conditional pass.** The spine is well-scoped for a solo-operator, zero-dependency, local tool, and six of its seven ADs are enforceable and correctly targeted at real brownfield divergence points. However, it misses one concrete divergence point that the codebase already exhibits (the existing `category` taxonomy on Exercice records is incompatible with the PRD's Thématique enum, with no migration/mapping rule), and it is silent on where the FR-5 fields actually live in the JSON shape relative to existing code — a gap that could let Bibliothèque, Séances, and the fiche diverge on how they read the same data. Neither is fatal, but both should be closed with a short addendum before implementation starts, since both are exactly the kind of "two units disagree about the same field" risk this altitude exists to prevent.

## Checklist Walk

### 1. Fixes the real divergence points for the level below — misses none

Mostly yes, with one miss.

- AD-1 (shared Bibliothèque module) correctly targets a real, present-tense divergence: `src/js/app.js` already implements its own inline filter (`libraryFilter.value`, `ex.category`) with zero keyword search, and Séances/Calendrier will need the same browse/filter/search behavior. Centralizing it is the right call.
- AD-2 (no PDF lib) is grounded in the real existing pattern — `seance.js:90` already calls `window.print()`, `seance.css` already has print rules (`@media print`, `break-inside: avoid`) and `explanation.css` has an established print pattern (`page-break-after: always`). Correctly ratifies rather than invents.
- AD-3 (fixed auto-fill grid) correctly forecloses a real two-path risk (grid vs. free-canvas) for FR-8.
- AD-4 (schema always rendered live) correctly generalizes existing `explanation.html` canvas-render logic into a shared module before Séances/Calendrier can each reinvent it or bake in a stale snapshot.
- AD-5 (calendar events as references) correctly prevents Séance-content duplication into `data/planning/`.
- AD-6/AD-7 ratify existing deletion intent and the existing CRUD/security pattern (verified against `server.js`: `isValidId` regex, path-containment check, `MAX_BODY_BYTES`, `setSecurityHeaders` all present exactly as described).

**Miss:** The PRD's Thématique enum (FR-3: *Attaque, Défense, Gardien, Enclenchement* — exactly 4 values) is a **new, closed enum**. The live data in `web-board/data/bibli/*.json` already populates a `category` field with a **different, existing taxonomy**: `echauffement, physique, offensif, defensif, montee_balle` (from `app.js`'s `categoryLabels` map, confirmed against actual sample files, e.g. `Espagnole-handball.json` has `"category": "offensif"`). None of these five existing values is a Thématique value, and the existing set also conflates a Bloc-level concept (`echauffement`, "retour au calme" territory) with the exercise-level Thématique. The spine does not mention this at all — not as an AD, not in Deferred, not as an Open Question. Left unaddressed, this is a genuine risk that Board's existing filter, the new shared `bibliotheque.js` filter, and any migration script disagree about what a valid Thématique value is, or that existing exercises silently fail to match any of the 4 new filter buckets. This is exactly the class of divergence AD-1 exists to prevent, but AD-1 assumes a clean `thematique` field already exists on `/api/exercises` items — it doesn't.

### 2. Every AD's Rule is enforceable and actually prevents its stated divergence

Yes for all seven, with the caveat on AD-1 above (enforceable, but doesn't cover the field-taxonomy migration that its own stated goal — "consistent behavior as fields evolve" — implies it should).

- AD-6 and AD-7 are marked `[ADOPTED]` and are directly checkable (file deletions; route pattern match) — good, low-ambiguity rules.
- AD-2, AD-3, AD-4, AD-5 all name a concrete artifact/pattern and a concrete negative ("no PDF library", "no drag-and-drop", "no snapshot persisted", "never inlined") — all falsifiable in code review.

### 3. Nothing under Deferred could let two units diverge

Checked each of the five Deferred items:
- PDF library — correctly deferred (no unit depends on this today).
- Drag-and-drop reorder — correctly deferred (AD-3 already pins the v1 layout algorithm, so no unit can build an incompatible one).
- Match report data structure — correctly deferred; AD-5's placeholder shape is explicitly flagged "not a committed schema," so no unit can build on it as if it were.
- Niveau/catégorie closed-list vs free text — correctly deferred as implementation/UX judgment; low blast radius since it's a single field's validation, not a shared contract.
- Week-view rendering — correctly deferred; confirmed against `src/js/planning.js` (grep found no week/semaine handling today — it is genuinely month-view-only), so this is an additive change inside one existing module, not a boundary two units could disagree across.

No item here creates cross-unit divergence risk. This dimension of the checklist passes cleanly.

### 4. Named tech is verified-current

The Stack table names only Node.js ≥18 (unversioned floor, matches README) and explicitly zero runtime dependencies (`core http/fs/path only`). Verified against `server.js`: no `require()` of any third-party package, confirmed CRUD implementation uses only `fs`/`path`/`http`. Nothing here can go stale because nothing is pinned to a version that could drift. This is the correct amount of tech-naming for this altitude and stakes — no findings.

### 5. Ratifies rather than contradicts the brownfield codebase

Strong overall, one shape ambiguity:

- Confirmed the CRUD pattern description (AD-7) matches `server.js` line-for-line (regex, path check, body cap, security headers, all three routes registered).
- Confirmed the print-CSS pattern (AD-2) matches existing `seance.css`/`explanation.css`.
- Confirmed `pages/timeout.html`, `src/js/timeout.js`, `src/css/timeout.css` exist today exactly as AD-6 describes them for deletion.
- **Gap:** FR-5's three fields (`durée`, `nombre de joueurs`, `niveau`) are described by the PRD as new additions and by the spine's Structural Seed as new bibli-record fields (`data/bibli/<id>.json ... (+ FR-5 fields: durée, nbJoueurs, niveau)`). In the actual codebase, UI for these three fields **already exists** in `pages/explanation.html` (inputs `#exDuree`, `#exNbJoueurs`, tag-select `#tagNiveau`), but they are read/written under a nested `data.explanation.doc.*` object, not as top-level Exercice fields — and no sample file in `data/bibli/` currently has any of the three fields populated (`grep` for `duree|nbJoueurs|niveau` across all 7 files: zero matches). So there are two live possibilities the spine doesn't distinguish between: (a) treat `explanation.doc.duree` etc. as the canonical location and have Séances (FR-7's default-duration pre-fill) reach into that nested path, or (b) promote these to top-level Exercice fields as the Structural Seed's shorthand implies, requiring a small migration/normalization step for the nested existing UI. Either is fine, but the spine should say which — otherwise Séances (FR-7), the fiche (FR-5), and Bibliothèque filtering are liable to each assume a different path for the same value, which is precisely the divergence class this altitude is supposed to foreclose.

### 6. Covers the PRD's capabilities (FR-1 through FR-12)

Confirmed complete via the Capability → Architecture Map: all twelve FRs are listed with an owning location, and all but FR-1 name a governing AD (FR-1 is explicitly and correctly called out as "board-local UX change, no new AD" — a reasonable judgment call, since it's a self-contained interaction fix with no cross-unit surface). No FR is silently missing.

### 7. Every dimension this altitude owns is decided, deferred, or an open question

- **Naming, data/formats, state/mutation/auth/errors/logging** — all covered in the Consistency Conventions table, each with a concrete convention (dates as `YYYY-MM-DD`, no envelope, `{error}` body, no-auth rationale tied to PRD §2.2). No gaps here.
- **Deployment & environments / infra-provider strategy** — absent from the spine, and correctly so: this is a solo-operator, fully local `node server.js` tool with no environments to diverge across (no staging/prod split, no provider). Silence here is a legitimate non-concern, not a gap, given the calibration instruction — flagging it as *decided-by-omission* would be manufacturing risk that doesn't exist for this system.
- **Operations (the one sub-dimension worth separating out from "deployment")** — this is where the spine's silence is *not* fully free of risk, even at local-tool stakes. Two things are structurally true of the codebase and un-addressed by any AD or Deferred entry:
  1. **Write atomicity.** `handleCrudRoute`'s POST handler calls `fs.writeFileSync(filePath, ...)` directly, with no temp-file-plus-rename step. A crash or power loss mid-write can leave a truncated/corrupt JSON file. This matters more under this PRD than it did before, because FR-12 explicitly promises season-long, no-depth-limit historical recall from `data/planning/` and `data/seances/` — silent corruption of one file has a real chance of surfacing to the user as "my season history is gone," which is the kind of thing an architecture doc should at least acknowledge and consciously accept or defer, rather than leave unstated.
  2. **Backup/data-loss posture.** There is no mention anywhere (spine or PRD) of whether `data/` is expected to be backed up, version-controlled, or otherwise protected. For a single physical machine with no cloud story this may well be a legitimate "coach's responsibility, out of scope" call — but it should be an explicit Deferred/Open-Question line rather than silence, since a completely silent dimension is indistinguishable from "nobody thought about it" versus "we consciously decided it's out of scope."

  Recommend adding one Deferred line (or Open Question) along the lines of: *"Write atomicity and backup strategy for data/*.json — accepted risk for v1 given single-operator, single-machine deployment; revisit only if data loss is actually experienced."* This costs one line and closes the "whole dimension left silent" failure mode the rubric flags.

## Summary of Findings

| # | Severity | Finding |
| --- | --- | --- |
| 1 | **Should-fix before build** | No AD/Deferred/Open-Question addresses the mismatch between the PRD's new Thématique enum (Attaque/Défense/Gardien/Enclenchement) and the existing `category` taxonomy already live in `data/bibli/*.json` (echauffement/physique/offensif/defensif/montee_balle). This is a real, present-tense divergence point, not a hypothetical one — it will surface the moment `bibliotheque.js` (AD-1) is built against `/api/exercises`. |
| 2 | **Should-fix before build** | FR-5 field location is ambiguous: existing `explanation.html` UI already writes `durée/nbJoueurs/niveau` into a nested `explanation.doc.*` object, not top-level Exercice fields, and no live data file has them populated yet. The spine's Structural Seed implies top-level fields without reconciling this. Séances (FR-7's duration pre-fill) needs one canonical path. |
| 3 | **Minor / hygiene** | Operations dimension (write atomicity, backup posture) is fully silent rather than explicitly deferred or accepted-risk, despite FR-12's "no depth limit" historical-recall promise raising the stakes of silent data corruption above baseline. One line of explicit Deferred text would close this. |
| 4 | **Non-finding (confirmed correct)** | Deployment/environment/infra-provider dimension is correctly absent — legitimate non-concern for a solo-operator local tool, not a gap. |
| 5 | **Non-finding (confirmed correct)** | All seven ADs, the Consistency Conventions, the Stack table, and the Capability→Architecture Map were independently checked against the live `web-board/` codebase (`server.js`, `app.js`, `seance.js`, `planning.js`, CSS print rules, `pages/timeout.*`) and found accurate — the spine ratifies rather than contradicts the brownfield code everywhere except finding #2 above. |

## Recommendation

Add a short addendum (new AD or two Deferred/Open-Question lines) covering:
1. How existing `category` values map onto (or are migrated to) the new Thématique enum, and what happens to exercises whose current category has no clean mapping (e.g. `montee_balle`, `echauffement`).
2. Canonical JSON location for the FR-5 fields (top-level vs. nested under `explanation.doc`), so Bibliothèque, Séances, and the fiche read/write the same path.
3. One line accepting or deferring write-atomicity/backup risk for `data/*.json`, given FR-12's unlimited-history promise.

With those three additions the spine would be a full pass against this rubric.
