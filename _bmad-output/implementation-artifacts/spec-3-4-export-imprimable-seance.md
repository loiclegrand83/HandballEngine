---
title: 'Export imprimable de la Séance'
type: 'feature'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `buildDocument()` (Story 3.1's minimal update) renders each Bloc's Ateliers as a single stacked column (one full-width schéma+text row per Atelier), and forces the whole Bloc to avoid breaking across print pages (`.doc-bloc { page-break-inside: avoid }`). This doesn't match the required "grille compacte multi-ateliers (3 à 5 schémas par page selon la complexité)" — a fixed-cell grid, filled in Bloc order, with CSS auto page-breaks (no fixed per-page count, no manual reordering) — and per-cell durée/description/matériel display is incomplete (matériel is only shown in one consolidated bar at the top of the document, not per Atelier cell, as required).

**Approach:** Change each Bloc's Ateliers from a stacked column to a compact CSS grid (`grid-template-columns: repeat(2, 1fr)`, one fixed cell template: schéma + name/durée + short description + matériel), still grouped under their Bloc's header (kept — nothing in the requirements says to drop Bloc grouping, and losing it would be a real usability regression for a printed sheet the coach reads on the pitch). Move the page-break control from the whole Bloc (`.doc-bloc`) down to each individual Atelier cell (`break-inside: avoid` per cell, not per Bloc), so a Bloc with several Ateliers can flow across a page boundary between cells instead of forcing the entire Bloc onto one page or leaving large gaps. Add `materiel` to each cell's content (currently missing per-cell, only in the top consolidated bar, which stays as a "everything needed across the whole Séance" summary).

</frozen-after-approval>

## Implementation Notes

- `web-board/src/js/seance.js` `buildDocument()`: each Bloc's Ateliers now render into a `.doc-bloc-grid` container of `.doc-atelier-cell` cells (fixed template: schéma, name+durée, short description, matériel) instead of a stacked column. Bloc headers/grouping/rail-color coding kept as-is.
- `web-board/src/css/seance.css`: `.doc-bloc-grid` is a 2-column CSS grid (`repeat(2, 1fr)`); removed the now-fully-dead `.doc-step*` rules (pre-existing dead code left over from before Story 3.1's Atelier refactor) and the old `.doc-bloc-atelier`/`.doc-bloc-content` single-column rules, replaced with the new cell classes. Moved page-break control from the whole Bloc (`page-break-inside: avoid` on `.doc-bloc`, removed) down to each Atelier cell (`break-inside: avoid` on `.doc-atelier-cell`, in the base rule so it applies universally, not just under `@media print`); added `break-after`/`break-inside: avoid` on `.doc-bloc-header` so a header can't be orphaned alone at the bottom of a page. No fixed per-page cell count anywhere — the grid and page breaks flow naturally with content.
- Verified: `node -c` on `seance.js`; CSS brace-balance check; a standalone Node script confirming the cell markup (2 cells rendered, HTML-escaped, matériel shown/omitted correctly per cell); a real Séance with 2 Ateliers in one Bloc and an empty "Opposition libre" Bloc round-tripped through the live `/api/seances` server.
- Did not open a browser to visually confirm print rendering (no `run`/browser step executed, consistent with every other story in this project) — verification was via code/markup inspection and the live-server data round-trip.
- **Review findings fixed:** removed a dead `@media print` rule referencing the now-deleted `.doc-step-attention` class; added `break-inside: avoid` to `.doc-bloc-notes-coach` (it had none after the blanket whole-Bloc break rule was removed, so it could now split across a page); added `overflow: hidden` to `.doc-atelier-schema` and aligned the image's `max-height` to the container's `min-height` (110px, was 140px) so square image corners can't poke past the rounded container and photo cells can't grow taller than placeholder cells in the same grid row; the schema `alt` text now falls back to `"exercice"` instead of an empty string when an Atelier has no name.

## Review Triage Log

- **Dead `@media print` rule for the deleted `.doc-step-attention` class** — verdict: real leftover, simple fix. Removed.
- **`.doc-bloc-notes-coach` has no break protection after the whole-Bloc rule was removed** — verdict: real, caused by this change. Fixed: added `break-inside: avoid`.
- "`.doc-bloc-header`'s `break-after: avoid` might not reliably keep the header glued to the grid that follows it, across all print engines" — verdict: real in theory (CSS fragmentation support varies by engine) but not simple to fully guarantee — `break-after: avoid` is the correct, standard CSS mechanism for this and is well-supported in Chromium (this app's primary target, per the architecture's browser-print approach); pursuing further belt-and-suspenders CSS for edge-case print engine gaps is disproportionate here.
- **Image could overflow its rounded container / inconsistent card heights (min-height 110px vs img max-height 140px)** — verdict: real, simple fix. Fixed: `overflow: hidden` added, image `max-height` aligned to 110px.
- "Matériel printed both in the aggregated top bar and per-cell — possible redundancy" — verdict: false, working as intended. FR8's AC explicitly requires each Atelier cell to show its own matériel; the aggregated bar is a separate, pre-existing "everything needed for the whole Séance" checklist. They serve different purposes, not a duplication bug.
- "Odd Atelier count leaves an empty gap in the 2-column grid" — verdict: false, accepted consequence of the explicitly-required "fixed cell template" (AD-3) — spanning the last cell to fill the gap would deviate from that requirement, not fix a bug.
- **`alt="schéma "` (trailing space, empty name) when an Atelier has no name** — verdict: real, trivial fix. Falls back to `"exercice"` now.

