# PRD Quality Review — HaWeb (v2, §4.5 Extraction vidéo update)

## Overall verdict

The §4.5 addition (FR-13, UJ-4, SM-4/SM-C2) is built with the same discipline as the rest of the PRD — testable consequences, explicit Out of Scope, a properly scoped NFR exception — and does not weaken the product's core offline commitment in the sections that were actually touched (§5, §6.2). The one real defect is that the update stopped one layer too early: §1 Vision and §0 Document Purpose still assert the "sans connexion internet" claim in absolute terms, unqualified and without a pointer to the §5 exception, so a reader who only reads the top of the document (the most likely reading path for a vision statement) will reasonably conclude §4.5 contradicts it. This is a one-line fix, not a structural problem.

## Decision-readiness — strong

The trade-off being made — accepting a scoped internet dependency to ship an experimental feature — is stated as a decision, not smoothed over. §5's Non-Goal keeps the blanket claim as the rule and calls out the exception by name with a boundary ("le reste de l'application reste utilisable sans connexion même quand cette fonctionnalité n'est pas disponible"), which is exactly the kind of scoping this rubric wants. The `[NOTE FOR PM]` in §6.2 ("son caractère expérimental… justifient de ne pas la coupler au risque du MVP") sits at a real tension — a lesser PRD would have quietly folded this into MVP scope for completeness. Open Questions 4 and 5 (extraction service/provider, supported video platforms) are genuinely undecided and correctly deferred to architecture/implementation rather than answered in the next sentence.

### Findings
None — no fix needed here.

## Substance over theater — strong

FR-13's NFR note is specific and load-bearing ("exception assumée et isolée au NFR §5… qui continue de s'appliquer à toutes les autres fonctionnalités"), not boilerplate — it does actual scoping work rather than restating "must be reliable." SM-4/SM-C2 are a genuine metric/counter-metric pair, not activity theater: SM-C2 exists specifically to prevent SM-4 from being gamed by hiding extraction errors, which is the correct shape for a feature whose main risk is silently-wrong data.

### Findings
None.

## Strategic coherence — adequate

UJ-4 and FR-13 follow the PRD's existing thesis (single local tool replacing external sites) — the extraction feature is framed as *reducing another external dependency* (a third site/workflow for finding video inspiration) rather than as an unrelated capability bolted on. Deliberately excluding it from MVP (§6.2) and marking it experimental keeps the MVP's coherence intact — the core Board/Bibliothèque/Séances/Calendrier arc is untouched by this addition.

### Findings
- **medium** — Vision-thesis tension not addressed in §1 (§1 Vision, §4.5) — The Vision statement's closing claim ("sans dépendre d'une connexion internet") is the PRD's thesis statement, and §4.5 is a genuine, if scoped, exception to it. The PRD resolves this correctly at the Non-Goals level (§5) but never revisits the Vision paragraph itself, leaving the document's own north-star claim unqualified. See Mechanical/contradiction finding below for the concrete fix.

## Done-ness clarity — strong (one minor gap)

FR-13's four consequences are concretely testable: link triggers retrieval+generation with no manual step, Phase count matches detected action (not fixed), generated Exercice uses the standard Glossary shape (no separate data structure), and extraction failure never blocks manual creation. This matches the rigor of FR-1 through FR-12.

### Findings
- **low** — Undefined threshold for "trop éloigné" (§4.5, FR-13 consequence 4) — "Si l'extraction échoue ou produit un résultat jugé trop éloigné de la vidéo" leaves the accept/reject boundary to the coach's subjective judgment. Acceptable for a single-operator tool where the coach is both user and judge (unlike a multi-user PRD, there's no downstream ambiguity about who decides), but worth flagging since it's the one soft criterion in an otherwise testable FR. *Fix:* none required; optionally note in §8 Open Questions if the PM wants a more objective bar later (e.g., minimum Phase/Trajectoire match confidence) — likely over-engineering for v1.

## Scope honesty — strong

This is the update's strongest dimension. The Out of Scope block under FR-13 is thorough and specific (no accuracy guarantee in v1, no dedicated correction UI, no local file upload — link only), the feature-specific NFR explicitly names itself as "une exception assumée et isolée," and §6.2's `[NOTE FOR PM]` states the de-scoping rationale honestly (experimental accuracy + third-party dependency) rather than silently dropping FR-13 from MVP without explanation. Glossary §3 adds an "Extraction vidéo" entry consistent with how other terms are defined (function + pointer to §4.5).

### Findings
None.

## Downstream usability — strong

IDs are contiguous and resolve: UJ-4 follows UJ-3, FR-13 follows FR-12, SM-4/SM-C2 follow SM-3/SM-C1, and every cross-reference (Realizes UJ-4, Validates FR-13, Counterbalances SM-4) is accurate. The Glossary entry for "Extraction vidéo" means §4.5 can be pulled out and read standalone, consistent with how §3 supports the rest of the PRD.

### Findings
None.

## Shape fit — strong

This is a solo-operator capability spec, and §4.5 stays in that shape: UJ-4 keeps the single named protagonist ("le coach") used throughout, and the feature is not over-formalized with additional personas or a separate mini-PRD-within-a-PRD structure. Marking it "post-MVP, expérimental" directly in the section heading (§4.5) and in Glossary is a good, honest shape signal — it tells a downstream reader at a glance that this feature carries different risk than §4.1–4.4 without needing a separate risk-register section.

### Findings
None.

## Mechanical notes

- **Contradiction risk in §0 and §1 (not fixed by this update):** Both §0 ("le tout en local, sans dépendance internet") and §1's closing Vision sentence ("sans dépendre d'une connexion internet ni jongler entre plusieurs sites web") state the offline claim in absolute terms with no reference to §4.5/§5's exception. The update correctly touched §5 (Non-Goals) and §4.5's own NFR note, but left the two sections a first-time reader is most likely to anchor on unqualified. Recommended fix: append a short qualifier to §1's closing sentence, e.g. "…sans dépendre d'une connexion internet ni jongler entre plusieurs sites web *(à l'exception ponctuelle et isolée de l'Extraction vidéo post-MVP, voir §5)*" — and similarly a parenthetical in §0. This is the one substantive gap this review found; everything else the update touched is internally consistent.
- Glossary drift: none found — "Extraction vidéo," "Exercice," "Phase" used identically in §2.3, §3, §4.5, §6.2, §7.
- ID continuity: clean (FR-13, UJ-4, SM-4, SM-C2 all contiguous, no gaps/dupes).
- Assumptions Index roundtrip: unaffected by this update — no new `[ASSUMPTION]` tag was introduced for §4.5, which is appropriate since nothing about the feature is inferred rather than stated.
- `updated: 2026-09-10` in the frontmatter matches this session's date; `status: final` was not reset to reflect the reopened/updated state — worth a PM decision on whether a "final, amended" or version marker is wanted, but this is a process nicety, not a content defect.
