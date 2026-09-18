# PRD Quality Review — prd-haweb-2026-09-06

## Overall verdict
This is a tight, honest single-operator PRD that mostly earns its shape: FRs carry testable consequences, non-goals are explicit, and the one real assumption is tagged and indexed correctly. The main gaps are the thin justification for why FR-1 (double-click) is the single ergonomic fix worth making, and a shallow Success Metrics section that leans on one hard-to-measure primary metric. Nothing here is broken; the risk is mostly around whether SM-1 can actually be observed.

## Decision-readiness — adequate
The PRD does make real decisions and states them plainly: retiring the Temps mort module (§4.1, §5) is stated as a firm removal, not a "consideration" — "il est définitivement retiré (§5), pas seulement déprioritisé" (§6.2). The trade-off is named (coach loses in-app timeout board, falls back to a physical board) rather than hidden.

However, some open questions are softer than they look. Open Question 3 (§8) — "Le champ 'niveau/catégorie d'âge' (FR-5) doit-il suivre une liste fermée... ou rester texte libre ?" — is a real fork with no leaning stated, which is good, but Open Question 2 (compte rendu de match horizon) has no decision owner or trigger condition, just a deferral. That's acceptable for a solo-operator PRD but means a reader can't tell if it's "revisit in 3 months" or "revisit never."

### Findings
- **low** Open Question 2 has no revisit trigger (§8.2) — "à quel horizon reconsidérer cette fonctionnalité" is left fully open with no condition (season count, feature request, etc.) that would prompt re-opening it. *Fix:* add a concrete trigger, e.g. "revisit if match tracking is requested for 2+ consecutive seasons."

## Substance over theater — strong
No persona theater: there is exactly one persona (the coach), and JTBDs (§2.1) map directly to features. No NFR boilerplate — the PRD deliberately has no generic NFR section at all; the closest thing (§2.1's "sans connexion internet") is a real, specific constraint restated concretely in §5 ("100% locales... aucun appel réseau" also in FR-8). The Vision (§1) is specific to this product — it names the two competing tools by name (tactical-board.com, entrainement-handball.fr) and the exact failure mode (unusable offline), which is the opposite of a swappable vision statement.

## Strategic coherence — strong
The thesis is clear and stated up front: consolidate three disconnected workflows (drawing, inspiration-browsing, calendar-tracking across two external sites) into one offline tool (§1). Every feature block (Board, Bibliothèque, Séances, Calendrier) maps to one of the five JTBDs in §2.1, and each Feature's Description line explicitly says "Realizes UJ-X." SM-1 (§7) is the only primary metric and it directly validates the thesis (stopped using the two external tools), not an activity count. SM-C1 is a genuine counter-metric (guards against FR-5's richer fields discouraging quick saves) rather than a token gesture.

## Done-ness clarity — strong
Every FR (FR-1 through FR-12) has a "Consequences (testable)" block with concrete, checkable conditions — e.g. FR-1's "clôt la trajectoire au dernier point simple-cliqué avant le double" and FR-8's "environ 4 schémas d'Ateliers par page." Adjective-only language is largely absent; the one soft spot is FR-8's "environ 4 schémas" (§4.3), which is a soft bound rather than a hard one, but it's explicitly flagged as approximate rather than dressed up as precise, so it reads as an honest tolerance rather than vague marketing language ("reasonable," "user-friendly" do not appear anywhere in the FRs).

### Findings
- **low** FR-8's page density is a soft target ("environ 4 schémas... par page", §4.3) with no stated tolerance or minimum/maximum. *Fix:* state a range (e.g. "3 to 5 depending on schema complexity") so an implementer knows what breaks acceptance.

## Scope honesty — strong
Non-Goals (§5) does real work — it lists four concrete exclusions, not filler. `[ASSUMPTION]` appears once (FR-2, §4.1) and is correctly indexed in §9 with matching text — roundtrip is clean. `[NOTE FOR PM]` appears twice (§4.4 on the "adversaire" field, §6.2 on match reports) and both sit at genuine deferred-decision points, not safe checkpoints. Open-items density (3 Open Questions + 1 Assumption + 2 Notes-for-PM) is low, appropriate for a low-stakes, single-operator, already-partially-built product — not a green-light-to-build-cold PRD.

## Downstream usability — adequate
Glossary (§3) is thorough and terms are used consistently across FRs (Exercice, Atelier, Bloc, Séance, Thématique all appear with matching capitalization throughout §4). FR IDs are contiguous (FR-1–FR-12, no gaps or dupes) and cross-references resolve (e.g. FR-7 references FR-5, FR-9 references §4.4, FR-11 references §4.3). UJs each have a named protagonist ("le coach") and are referenced by ID from feature Description lines.

One gap: this PRD explicitly says it feeds "les refontes et développements à venir" (§0) — it is chain-top-ish even though solo — but there's no explicit statement of what downstream artifact type follows (architecture doc? direct story breakdown?), so a downstream workflow has to infer scope boundaries from FR consequences alone. This is a minor issue since the FRs are detailed enough to source-extract from directly.

## Shape fit — strong
This is correctly shaped as a solo-operator capability spec: no over-formalization (only 3 UJs, not overloaded with personas or B2B stakeholder maps), and UJs are used precisely where they carry weight (they trace directly to Realizes tags on every feature). §2.2 "Non-Users (v1)" explicitly rules out multi-user framing rather than silently omitting it. Brownfield handling is good — §0 and §4.1/§4.2 clearly flag "déjà partiellement construite" and "conservé tel quel," and existing vs. new behavior is distinguished per-FR (e.g. FR-2's Notes: "Les autres fonctionnalités existantes... sont conservées telles quelles").

## Mechanical notes
- Glossary drift: none found — Exercice/Atelier/Bloc/Séance/Thématique/Match usage is consistent in capitalization and singular/plural across all sections checked.
- ID continuity: FR-1 through FR-12 are contiguous and unique; UJ-1/2/3 and SM-1/2/3/C1 are contiguous and unique. No dangling references found (FR-6 to FR-9 in SM-3 range check out; FR-1 to FR-9 in SM-1 range checks out).
- Assumptions Index roundtrip: clean — the single inline `[ASSUMPTION]` in FR-2 (§4.1) is faithfully mirrored in §9, and §9 has no orphan entries.
- UJ protagonist naming: all three UJs open with "Le coach" and carry a concrete scenario (evening prep, filtering by theme, revisiting a past opponent) rather than a generic stand-in.
- Required sections: all sections a solo-operator, brownfield, already-partially-built product PRD needs are present (Vision, Target User, Glossary, Features/FRs, Non-Goals, MVP Scope, Success Metrics, Open Questions, Assumptions Index). No missing section.
