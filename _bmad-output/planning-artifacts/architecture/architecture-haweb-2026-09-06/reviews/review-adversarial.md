---
title: Adversarial Review — ARCHITECTURE-SPINE.md (HaWeb)
type: review
reviewed: architecture-haweb-2026-09-06/ARCHITECTURE-SPINE.md
against: prd-haweb-2026-09-06/prd.md
created: 2026-09-06
verdict: fail — 6 holes found, spine needs tightening before build
---

# Adversarial Review — HaWeb Architecture Spine

Method: for each pair, both units are shown obeying every AD to the letter, then shown producing an incompatible result anyway. Each finding proposes the specific tightening (new AD, tightened Rule, or explicit edge-case clause) that closes it.

---

## Finding 1 — AD-5's orphan-reference rule has no owner and no shape ("séance introuvable")

**Pair:** Calendrier dev (FR-10/11/12) vs. Séances dev (FR-9, delete flow).

AD-5 says: "Deleting a Séance does not cascade-delete its calendar reference automatically... surfaced as 'séance introuvable' if the referenced id is missing." Both devs can honor this literally and still diverge:

- Séances dev implements `DELETE /api/seances/:id` per AD-7 (id validated, path re-verified, security headers) — nothing in AD-7 or AD-5 says it must check `data/planning/` for references before deleting. Following the letter, they ship a delete with zero awareness of `planning/`.
- Calendrier dev, independently, decides *where* "séance introuvable" is detected: at read-time when hydrating the month view (client fetches `/api/seances/:id`, gets 404, renders a placeholder), or at click-time only (FR-11's "cliquer sur une Séance planifiée... ouvre cette Séance" — dev defers the check entirely to the click handler, so the month grid shows nothing wrong until clicked).

Both are AD-5-compliant. Result: the calendar can silently show a *phantom* event with no visible label for weeks, then break differently depending on whether the dev chose grid-time or click-time detection — one shows "séance introuvable" tiles in the month view, the other shows a live-looking séance card that 404s only on click. Neither is wrong per the Rule; the Rule specifies the string but not *when* the check fires, so UJ-3 ("revoir ce qui a été travaillé") is inconsistently satisfiable.

**Also unaddressed:** what happens on the *reverse* direction — a séance is un-saved (FR-9: "une Séance non explicitement sauvegardée n'apparaît pas dans la liste... pour le Calendrier") after it was already placed on a date. FR-9 only gates *future* placement, not existing placements of a séance that gets un-saved/deleted-while-draft. AD-5's orphan rule technically covers this (same "introuvable" path) but nothing forces the two devs to agree that un-saving and hard-deleting produce the same downstream state.

**Fix:** Tighten AD-5's Rule to specify: (a) orphan detection happens at *render time of the calendar view* (not lazily on click), so every orphaned tile is visibly marked before interaction; (b) define the exact JSON shape the client renders for an orphan (e.g. `{seanceId, resolved: false}` vs. omitting resolution and re-checking via a separate existence call) — currently nothing says whether `/api/planning` inlines séance-exists status or the client must N+1 it against `/api/seances`.

---

## Finding 2 — No single owner for "Atelier" data: Bibliothèque's FR-5 fields vs. Séances' FR-6 snapshot-vs-reference ambiguity

**Pair:** Bibliothèque dev (FR-5, richer fields on Exercice) vs. Séances dev (FR-6/FR-7, Atelier = "Exercice choisi... pour être inclus dans une Séance").

AD-1 says Bibliothèque access/filter/search logic is centralized in `bibliotheque.js`; AD-4 says schema is always rendered live from source, never snapshotted. Neither AD says whether an **Atelier's non-schema fields** (durée, description, matériel) are a *live reference* (re-fetched from `data/bibli/<id>.json` at render/export time) or a *snapshot* pinned at the moment the Atelier was added to the Séance.

FR-6's consequence is explicit that this is ambiguous by design: "Chaque Atelier ajouté conserve la référence à l'Exercice source (description, matériel, schéma)" — "référence" here could mean an id pointer (live) or could mean "keeps a copy of" (colloquial French, common in this kind of spec). FR-7 makes it worse: "La durée par défaut d'un Atelier est pré-remplie depuis la durée estimée de l'Exercice source... et reste modifiable" — this is explicitly a *copy-on-add with independent mutation*, i.e. a snapshot for durée specifically.

Two devs, both AD-4-compliant (AD-4 only binds the *schema* to live rendering):
- Bibliothèque dev, extending FR-5, adds a `niveau` field and assumes all Atelier fields are looked up live from `data/bibli/<id>.json` at Séance-recap-build time (consistent with AD-4's spirit, even though AD-4 literally only mentions schema).
- Séances dev implements Ateliers as `{exerciceId, durée, notes}` stored inside `data/seances/<id>.json`, copying `description`/`matériel` into the Séance record at add-time (matching FR-7's explicit copy-then-modify pattern for durée), because re-fetching every Bibliothèque field per Atelier per render felt architecturally consistent with "conserve la référence" read as "keeps its own copy."

Both comply with every AD (AD-1, AD-4, AD-7 say nothing about this). Result: editing an Exercice's `matériel` or `description` in the Bibliothèque after it's been added to a Séance either updates every Séance that references it (live-lookup implementation) or leaves stale copies (snapshot implementation) — and which one happens depends on which dev built which side first, non-deterministically. This directly risks the failure mode AD-4 was written to prevent for schemas ("a stored snapshot... silently going stale") but for every *other* Atelier field, which AD-4 doesn't cover.

**Fix:** New AD (or extend AD-4) explicitly stating: which Atelier fields are live-referenced (id-only, re-fetched at render: description, matériel, niveau) vs. which are copy-on-add-and-independently-mutable (durée, per FR-7's explicit "pré-remplie... et reste modifiable"). State the exact `data/seances/<id>.json` Atelier shape: `{exerciceId, durée, ...}` and confirm no other field is duplicated.

---

## Finding 3 — AD-3's "3–5 per page" grid has no rule for schema-complexity variance within one page

**Pair:** Two devs building FR-8's recap export independently — one handling the CSS grid/print-break mechanics, one handling schema rendering density (AD-4's `schema-render.js` consumer).

AD-3's Rule: "renders Ateliers into a CSS grid (3–5 per page...), populated in Bloc order, with break-inside/break-after... driving automatic page breaks." FR-8's consequence: "Le PDF regroupe entre 3 et 5 schémas... par page **selon la complexité des schémas**."

This is a per-page density decision that depends on schema complexity, but:
- The **grid/CSS dev** implements a fixed grid (e.g. `grid-template-columns: repeat(2, 1fr)` yielding a constant 4-per-page, or a CSS `auto-fill` with a fixed cell min-size) — this is literally what AD-3 mandates ("Fixed auto-filling grid"), and is print-break-safe.
- The **schema-render dev**, calling `schema-render.js` per Atelier per AD-4, produces canvases of *wildly different aspect ratios/complexity* (a 2-player static schema vs. an 8-player multi-phase schema with paths) — nothing in AD-4 or AD-3 says schema-render must normalize output size, so a complex schema either overflows its fixed grid cell (clipped/illegible on the printed page — the actual field problem this PRD exists to solve, since the PDF is used live on the pitch) or a "auto-fill" grid with variable-height cells breaks AD-3's implicit "3-5 per page" invariant when one complex Atelier consumes the visual space of two cells, silently regressing to 2 per page with no rule saying that's acceptable.

Both devs are AD-3/AD-4-compliant. The "selon la complexité des schémas" clause in FR-8 is never operationalized into an architectural Rule — it's a UX judgment call the spine punts entirely, but AD-3 asserts a *fixed* grid, which structurally can't flex per FR-8's stated intent. This is a direct FR-vs-AD tension, not just a missing edge case.

**Fix:** AD-3 needs a Rule for how "fixed grid" and "selon la complexité" coexist: either (a) fix at exactly 4-per-page always and drop the complexity-adaptive language from being architecturally binding (push back to PM/UX as a v1 simplification), or (b) define a complexity metric (e.g. count of `items`+`paths` in the Exercice's schema data) with explicit thresholds mapping to 3 vs 4 vs 5 per page, computed before layout, so both devs compute the same page-count for the same Séance.

---

## Finding 4 — AD-7's route pattern doesn't specify concurrent-write/last-write-wins semantics, and FR-7's "recalculated at every modification" invites two owners of the same total

**Pair:** Séances dev implementing FR-7 (client-side running total) vs. Calendrier dev implementing FR-11 ("cliquer sur une Séance planifiée... ouvre cette Séance... pour consultation/réédition").

AD-7 governs route-level security (id validation, path containment, body cap, headers) but says nothing about **where the durée-total is computed or stored**. FR-7: "le total... est calculé automatiquement... recalculé à chaque modification." Two devs, both AD-7-compliant:

- Séances dev computes the total client-side only (never persisted — pure derived UI state recalculated from `Blocs[].Ateliers[].durée` on every render) — consistent with "recalculé à chaque modification" read literally as *never stale, always fresh from source*.
- Calendrier dev, needing to show a séance's duration on a calendar tile without loading the full Séance builder UI (a reasonable month-view optimization), persists a cached `dureeTotale` field into `data/seances/<id>.json` at save-time so the planning page can read it directly from `/api/planning` → `/api/seances/:id` without recomputing client-side.

Both are AD-7-compliant (same CRUD route, same security checks). Now there are two representations of "the total": a derived-only one (Séances page) and a persisted-cache one (Calendrier reads), and nothing in the spine says the persisted cache must be recomputed on every Bloc/Atelier edit — so editing a Séance's Ateliers updates the live builder's total instantly but the calendar tile shows a stale cached total until the next explicit save, an inconsistency invisible until the coach notices the calendar disagrees with the séance he's editing.

**Fix:** Add to the Consistency Conventions table (or a new AD) that derived/computed values (durée totale, schema-derived complexity from Finding 3) are *never persisted* — always recomputed from source fields at read time, matching the spirit of AD-4's live-rendering rule but generalized beyond schemas. This closes both Finding 2's durée ambiguity and this one in a single Rule.

---

## Finding 5 — Two owners of "Thématique" validity: FR-3's closed enum vs. AD-1's "thin wrapper" claim

**Pair:** Bibliothèque dev (FR-3, enum enforcement) vs. server/CRUD dev (AD-7, generic route).

FR-3: "Chaque Exercice sauvegardé porte exactement une Thématique parmi les 4 valeurs listées [Attaque, Défense, Gardien, Enclenchement]." This is a **data-validity invariant**, but AD-1 states the shared client module is "a thin client wrapper, never a second copy of the data" and AD-7's Rule only validates the *id* (`^[a-zA-Z0-9_-]+$`), path containment, and body size — it says nothing about validating field *values* against the FR-3 enum.

Two devs, both AD-compliant:
- Client dev puts the enum-of-4 dropdown and validation only in the Board's save form (client-side only), per AD-1's "thin wrapper" language — assumes validity is a UI concern, not a server concern, since AD-7 never mentions field-level validation as part of "the existing CRUD/security pattern."
- A second dev, months later, builds a bulk-import/fix-up script or a future integration hitting `/api/exercises` directly (curl, a migration script) — nothing server-side rejects `{thematique: "Milieu"}` or a missing thematique, because AD-7's Rule is exhaustively about id/path/size/headers, not payload schema. FR-4's keyword search and FR-3's filter then silently drop or mis-bucket any record with an invalid/absent Thématique, with no error raised anywhere.

**Fix:** Either extend AD-7 to state explicitly that field-level validation (enum membership for Thématique, presence of required FR-5 fields) is out of scope for the server (client-only, accepted risk given single-local-user context) — or add a one-line Rule that `/api/exercises` POST/PUT validates `thematique` server-side against the same 4-value list the client uses, sourced from one shared constant (not duplicated in both `bibliotheque.js` and `server.js`). As written, the spine is silent, so two devs will default to different assumptions about whether the server ever guards this invariant.

---

## Finding 6 — AD-6 "fully removed" vs. AD-5/FR-11 calendar Match events: no shared convention prevents a differently-shaped near-future removal

Minor / lower-severity, included for completeness. AD-6 mandates deleting `timeout.*` files outright rather than flagging. FR-2's `[ASSUMPTION]` flags this as unconfirmed with PM (§8 Open Question 1). If a future dev, reading AD-6's Rule literally ("deleted, not feature-flagged or commented out") applies the same instinct to Match events when match-reports are eventually reconsidered (§8 Q2, PRD explicitly anticipates this "v2" revisit) — they might delete the placeholder `{type:'match', adversaire}` shape's read paths entirely when building a real match-report feature, rather than migrating it, since AD-6 sets a repo-wide precedent of "remove don't hide" that AD-5's Deferred note ("placeholder... not a committed schema") doesn't explicitly override for *migration* purposes (only says it's not committed, doesn't say old records must be preserved/migrated).

**Fix:** Not urgent for v1, but worth a one-line note in AD-5's Deferred section: any future Match schema change must provide a migration path for existing `data/planning/*.json` match records, distinguishing this from AD-6's "delete outright" precedent which applies to *dead code*, not *live user data*.

---

## Summary Table

| # | Pair | AD(s) technically satisfied | Incompatibility | Severity |
|---|------|------------------------------|------------------|----------|
| 1 | Calendrier vs. Séances-delete | AD-5, AD-7 | Orphan-detection timing (grid-render vs. click-time) unspecified | High — breaks UJ-3 |
| 2 | Bibliothèque-FR5 vs. Séances-FR6/7 | AD-1, AD-4, AD-7 | Atelier field ownership (live-ref vs. snapshot) unspecified per-field | High — silent data staleness |
| 3 | Grid/CSS vs. schema-render | AD-3, AD-4 | "Fixed grid" vs. "selon la complexité" is a direct FR/AD tension | High — breaks the printed artifact used on-field |
| 4 | Séances-total vs. Calendrier-tile | AD-7 | Derived value persisted by one consumer, not the other → stale cache | Medium |
| 5 | Client validation vs. server CRUD | AD-1, AD-7 | Enum validity (FR-3 Thématique) has no assigned owner | Medium |
| 6 | AD-6 precedent vs. future Match schema | AD-6, AD-5 | "Delete don't hide" applied to code could be misapplied to user data at v2 | Low |

## Recommendation

Do not proceed to sprint planning until Findings 1–3 are closed with tightened/new ADs — they each produce a build-time coin-flip between two equally-compliant implementations that diverge on user-visible behavior (silent phantom calendar entries, stale séance content, illegible/miscounted printed recap pages). Findings 4–5 are worth a one-line Convention-table addition each before build starts; Finding 6 can be deferred to the v2 match-report work with a note left in AD-5's Deferred section now.
