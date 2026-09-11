# Epic 2 Context: Bibliothèque — Enrichissement & Recherche

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Coaches need to organize and retrieve exercises efficiently as their library grows. This epic gives every Exercice a Thématique classification (Attaque, Défense, Gardien, Enclenchement), lets the coach filter the Bibliothèque by it, adds keyword search across name/postes/matériel (combinable with the Thématique filter), and enriches the exercise fiche with three optional fields (durée estimée, nombre de joueurs, niveau/catégorie d'âge) that feed the future Séance composer (Epic 3). A prerequisite one-time migration reclassifies existing exercises, which today use an unrelated `category` taxonomy, onto the new Thématique enum.

## Stories

- Story 2.1: Migration de la taxonomie vers Thématique
- Story 2.2: Assigner une Thématique et filtrer la Bibliothèque
- Story 2.3: Recherche par mot-clé + champs enrichis de la fiche

## Requirements & Constraints

- Thématique is a closed set of exactly 4 values: `attaque | defense | gardien | enclenchement`. Every Exercice carries exactly one.
- The Thématique filter restricts the Bibliothèque list; keyword search must be combinable with it using logical AND.
- Keyword search matches (case-insensitive substring) at minimum: exercise name, poste(s) impliqué(s), and matériel requis.
- The three new fiche fields (durée estimée, nombre de joueurs requis, niveau/catégorie d'âge) are optional — saving an Exercice must never be blocked or slowed by their absence. Only `name` and Thématique are required.
- Niveau/catégorie d'âge: closed list vs. free text is left to implementation judgment (no architectural constraint either way).
- Existing Bibliothèque behavior (explicit save only, load, delete, JSON export/import) must keep working unchanged.

## Technical Decisions

- **Server-side validation is mandatory** (AD-10): the `/api/exercises` POST route must validate Thématique against the 4-value enum before writing to disk — not just client-side form validation — following the same validation discipline already used for id whitelisting (`^[a-zA-Z0-9_-]+$`) in `server.js`'s `handleCrudRoute` (`web-board/server.js:47`, POST handler ~line 71+).
- **Field placement**: FR-5's durée/nbJoueurs/niveau must live as top-level fields on the Exercice JSON (sibling to `name`/`category`), not nested. This is a change from current behavior.
- **Migration needed — taxonomy**: existing files in `web-board/data/bibli/*.json` use a `category` field with values like `echauffement`, `physique`, `offensif`, `defensif`, `montee_balle` (confirmed in sample file `web-board/data/bibli/Echauffement gardien croise-handball.json`, and referenced throughout `web-board/src/js/app.js` — e.g. lines ~1627, 1681, 1697, 1744, 1754, 1756, 1769, 1770, 2502 — and `web-board/src/js/seance.js` lines ~388, 406). A one-time mapping pass to the new Thématique enum is required before the shared filter can be trusted; the mapping table itself (which old category maps to which Thématique) is an implementation judgment call, not specified by planning docs.
- **Migration needed — field reconciliation**: `web-board/pages/explanation.html` (lines ~525-535) already writes its own editable fields today, but nested under `data.explanation.doc.*` (`objectif`, `miseEnPlace`, `regulations`, `conseils`, `duree`, `nbJoueurs`, `nbGardiens`, `niveau`). Note `duree`/`nbJoueurs`/`niveau` already exist there in nested form — decide whether to migrate this existing nested data up to top-level Exercice fields, or merge/read from both locations. Target shape is top-level; migration mechanics are left to implementation.
- **Shared client module**: exercise fetch/filter/search/render logic should be extracted into a shared module `web-board/src/js/bibliotheque.js`, loaded via `<script>` by any page needing it (board, séance, planning) — do not duplicate this logic per page. Filtering logic currently lives ad hoc in `app.js` (~line 1744-1770) and `seance.js` (~line 388-406) and should move here.
- **No network dependency**: no page may load any script/style/fetch from a non-localhost origin.
- Data conventions already in place and to be preserved: ids match `^[a-zA-Z0-9_-]+$`, request bodies capped at 1MB, path traversal guarded, security headers (CSP, X-Frame-Options, nosniff) applied — same pattern as existing CRUD routes.
- No enveloping wrapper on API responses; errors are plain HTTP status + `{error}` JSON body.

## Cross-Story Dependencies

- Story 2.1 (taxonomy migration) must complete before Story 2.2's filter can be trusted, since the filter reads the `thematique` field the migration populates.
- Story 2.2's Thématique filter and Story 2.3's keyword search must compose (logical AND) in the same Bibliothèque UI/module.
- The enriched fields from Story 2.3 (durée, nbJoueurs, niveau) are consumed later by Epic 3's Séance composer (Ateliers snapshot these values when added to a Séance) — Epic 2 must land the top-level field shape before Epic 3 can rely on it.
