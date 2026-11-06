# Rubric Re-check — ARCHITECTURE-SPINE.md (2026-09-06)

Re-read fresh from disk (no reliance on prior review memory). Spine file: `_bmad-output/planning-artifacts/architecture/architecture-haweb-2026-09-06/ARCHITECTURE-SPINE.md`.

## 1. Prior Gap Status

### Gap 1 — Thématique enum vs. live `category` taxonomy — **CLOSED**
- AD-10 (lines 93–97) now locks the Thématique enum (`attaque | defense | gardien | enclenchement`) with a server-side validation rule on `/api/exercises` POST.
- Deferred section adds an explicit line, "**Category taxonomy migration**" (line 167), naming the concrete mismatch with the live `data/bibli/*.json` values (`echauffement/physique/offensif/defensif/montee_balle`) and requiring a one-time migration/mapping pass before AD-1's shared filter can trust the field. This is exactly the missing link previously absent — an AD plus a matching Deferred entry, not silence.

### Gap 2 — FR-5 field schema-shape (top-level vs. `explanation.doc.*`) — **CLOSED**
- Consistency Conventions table, "Data & formats" row (line 110) now states explicitly: FR-5's durée/nbJoueurs/niveau are top-level Exercice fields, and flags that `explanation.html` currently keeps its own fields nested under `explanation.doc.*`, requiring reconciliation before implementation.
- Deferred section adds "**FR-5 field location reconciliation**" (line 168) naming the concrete conflict and the two implementation options (migrate existing data up, or merge at read time), while fixing the target shape (top-level) as the spine's decision. This matches the Structural Seed's `data/bibli/<id>.json` comment ("+ FR-5 fields: durée, nbJoueurs, niveau", line 142).
- Since only one page (`explanation.html`) currently writes this shape, leaving the migration mechanics to implementation does not create a divergence risk between multiple units — the target shape is fixed, only the migration path is open.

### Gap 3 — Operations dimension (non-atomic `fs.writeFileSync`, no backup posture) — **CLOSED**
- Deferred section adds "**Write durability**" (line 169): explicitly names `fs.writeFileSync` (no atomic temp-file-then-rename, no backup), accepts it as-is for a solo local tool with no concurrent writers, and gives a concrete revisit trigger (actual data loss from an interrupted write). This is a proper explicit Deferred line rather than silence.

**All 3 previously identified gaps are closed** in the current revision.

## 2. Good-Spine Checklist Re-verification

### Every AD's Rule is enforceable
Walked all 11 ADs:
- AD-1: enforceable — single shared module file (`src/js/bibliotheque.js`) is a checkable location constraint.
- AD-2: enforceable — no PDF dependency; checkable via dependency manifest/package presence (none exists, zero-dep app).
- AD-3: enforceable — checkable CSS properties (`break-inside: avoid`, `break-after`) rather than a hardcoded count.
- AD-4: enforceable — single extraction point (`src/js/schema-render.js`), no persisted snapshot to check for.
- AD-5: enforceable — file shape checkable (`{date, type, seanceId | adversaire}`), plus a concrete render-time orphan-check behavior ("séance introuvable") that's testable.
- AD-6: enforceable and already adopted — deletion is a binary, checkable state.
- AD-7: enforceable and already adopted — references the existing `handleCrudRoute()` pattern with concrete checks (regex, path containment, size cap, headers).
- AD-8: enforceable — snapshot-at-add-time vs. live-id-only is a clear, checkable data-flow rule.
- AD-9: enforceable — "never written to `data/seances/<id>.json`" is a checkable negative constraint.
- AD-10: enforceable — fixed enum + named validation location.
- AD-11: enforceable — checkable via absence of non-localhost resource references; ties to an existing README claim.

No AD found with a vague or unfalsifiable Rule.

### Nothing under Deferred lets two units diverge
Reviewed all 9 Deferred bullets:
- PDF library, drag-and-drop, match-report shape, week-view rendering: single-owner implementation details, no cross-unit divergence risk.
- Category taxonomy migration: resolved by AD-10 fixing the target enum; only the *mapping of old data* is deferred, not the target values two pages could disagree on.
- FR-5 field location: target shape (top-level) is fixed by the spine; only migration mechanics deferred, single writer page.
- Write durability: single server.js, no multi-writer divergence possible.
- Niveau/catégorie closed-list-vs-free-text (PRD Open Question 3): this is the one item worth flagging for continued attention — it explicitly says "no architectural impact either way, left to implementation/UX judgment." Since `niveau` is read/rendered by any page using `bibliotheque.js` (AD-1) and by `explanation.html`, an eventual free-text field with inconsistent values (typos, casing) could degrade filter/search UX in the shared module, similar in kind to the category-taxonomy problem AD-10/Deferred just fixed for Thématique. It's lower severity (UX degradation, not data-shape mismatch) and PRD explicitly leaves it open, so it is arguably correctly scoped as Deferred rather than a gap — but it is the one remaining soft spot, see New Issue below.
- FR-9/FR-11 UX behaviors: explicitly justified as UX-local, not cross-unit, with a named existing convention it inherits from.

No Deferred item found that lets two implementation units silently pick different persisted behaviors for a shared field/format.

### Ratifies the brownfield codebase
- AD-6 and AD-7 are marked `[ADOPTED]`, explicitly describing current app behavior (dead-code removal, existing CRUD helper) rather than inventing new pattern.
- AD-11 explicitly cites the existing README §Sécurité claim (Google Fonts replaced by `system-ui`) as already-true, extending rather than contradicting it.
- Structural Seed matches existing directory layout (`web-board/`, `pages/`, `src/js`, `src/css`, `data/`) with NEW-marked additions only where new.
- Stack table correctly reflects zero-dependency Node core, matching a flat-file CRUD app.

No fabricated component or pattern contradicting the current codebase was found.

### AD IDs monotonic and unique
AD-1 through AD-11, sequential, no gaps, no repeats. Confirmed by direct scan of all eleven `### AD-N —` headings.

## 3. New Issue Found

**Minor, not blocking:** The Niveau/catégorie free-text-vs-closed-list Deferred item (line 165) is adjacent in kind to the just-closed category-taxonomy gap — a field consumed by the shared `bibliotheque.js` filter (AD-1) whose value-consistency is left unconstrained. Recommend implementation treat this with the same discipline as AD-10 (i.e., default to a closed list unless the PRD's Open Question 3 is explicitly resolved otherwise) even though the spine correctly declines to force an AD given the PRD leaves it open. This is advisory, not a spine defect.

## Verdict

**PASS.** All three previously identified gaps are now explicitly and correctly closed (one via a new AD + Deferred pairing, one via a Consistency Convention + Deferred pairing, one via a standalone Deferred entry). The good-spine checklist holds: every AD Rule is enforceable, no Deferred item creates cross-unit divergence risk, the brownfield codebase is ratified rather than contradicted, and AD IDs are monotonic/unique (1–11). One minor advisory note raised (Niveau/catégorie free-text risk) but it does not rise to gap status given the PRD explicitly leaves it open.
