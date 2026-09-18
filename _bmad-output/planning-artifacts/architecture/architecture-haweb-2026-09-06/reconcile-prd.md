---
title: Reconciliation — ARCHITECTURE-SPINE vs PRD (haweb-2026-09-06)
status: draft
created: 2026-09-06
---

# Reconciliation: ARCHITECTURE-SPINE.md vs prd.md

## FR coverage check (FR-1 → FR-12)

All twelve FRs appear in the spine's Capability → Architecture Map (lines 124-133) or are directly bound in an AD's front-matter `Binds:` field:

| FR | Spine coverage |
| --- | --- |
| FR-1 | Map row; explicitly "no new AD" (board-local UX change) |
| FR-2 | Map row → AD-6 |
| FR-3, FR-4 | Map row → AD-1, AD-7 |
| FR-5 | Map row → AD-1, AD-4 |
| FR-6, FR-7 | Map row → AD-3 |
| FR-8 | Map row → AD-2, AD-3, AD-4 |
| FR-9 | Map row → AD-7 |
| FR-10, FR-11, FR-12 | Map row → AD-5, AD-7 |

No FR is unaccounted for. Coverage check: **pass**.

## Gaps / silently dropped details

1. **SM-C1 counter-metric (field-count discipline) has no architectural expression.** The PRD explicitly warns not to let FR-5's new fields (durée, nb joueurs, niveau) become required/heavy enough to discourage a quick save (§7, SM-C1 counterbalances SM-2). The spine's FR-5 row and AD-1/AD-4 say nothing about these fields being optional or about preserving fast single-click save — a later implementation could make them mandatory without violating any stated invariant.

2. **FR-9's "explicit save only" semantic is not encoded as a rule.** The PRD is explicit that "Une Séance non explicitement sauvegardée n'apparaît pas dans la liste des séances disponibles pour le Calendrier" — i.e. no autosave/draft-leak into the calendar's séance picker. The spine's FR-9 map entry just points to `/api/seances` + AD-7 (generic CRUD security), which says nothing about save being explicit-only. An implementation could add autosave and nothing in the spine would flag it as a violation.

3. **Blanket "no internet dependency" is only enforced piecemeal, not as a standing invariant.** PRD §5 Non-Goals states the whole app is "100% locale" with no service internet required at all (not just for PDF). The spine only encodes this for the PDF path (AD-2: "no PDF library... print-CSS") and mentions no runtime deps in Stack. Nothing stops a future page (e.g. Calendrier or Bibliothèque) from pulling a CDN font/script, which AD-7's security pattern wouldn't catch since it only governs server routes, not client asset sourcing.

4. **FR-11's click-to-open behavior isn't bound to any AD.** PRD FR-11 requires that clicking a planned Séance in the Calendrier opens that Séance (or its PDF) for consultation/réédition. The spine's AD-5 only specifies the calendar-entry *storage* shape (reference by `seanceId`, orphan handling) — the actual navigation/open behavior on click has no architectural anchor, so it's easy to implement the reference correctly while forgetting the required UX affordance.

5. **FR-5's "no change to existing Bibliothèque behavior" note is unmentioned.** The PRD explicitly says existing save/load/delete/export-import-JSON behavior on exercise fiches "est conservé sans changement" while adding the three new fields. The spine's AD-1/AD-4 describe the new shared client module and live-rendered schema but don't call out that export/import JSON must keep working unchanged when the schema gains fields — a straightforward but easy-to-regress detail if the JSON shape isn't treated as additive-only.

**Input:** prd-haweb-2026-09-06/prd.md vs ARCHITECTURE-SPINE.md
**Gaps found:** 5 (all FRs covered; gaps are in soft constraints / quiet PRD details, not missing FRs)
