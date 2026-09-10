# Epic 4 Context: Calendrier — Planification & Historique

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The coach needs a single Calendrier where planned Séances and Matchs are visible together, so training and competition can be planned in advance and reviewed after the fact (e.g. checking what was worked on before the same opponent last season). This epic delivers month/week toggling, placing Séances and Matchs on dates, and unrestricted navigation back through the current season's history.

## Stories

- Story 4.1: Vue mensuelle/hebdomadaire (toggle month/week views, same events shown in both)
- Story 4.2: Planifier Séance et Match (associate a saved Séance to a date; create a Match event; click-to-open; orphan-reference handling)
- Story 4.3: Historique du Calendrier (navigate to past dates, no depth limit within the current season)

## Requirements & Constraints

- Month and week views must display the same events for the covered period — no divergence in what's shown between granularities.
- A Séance can be placed on a date only by reference (by id); creating a Match event requires at minimum a date and an opponent name (`adversaire`).
- A date can carry zero, one, or several Séances and/or Matchs.
- Clicking a placed Séance opens it for consultation/re-edit (its builder view, not a copy).
- Only explicitly-saved Séances are selectable for placement — an unsaved/in-progress Séance never appears in the Calendrier's picker (this is a Séance-builder-side convention, not a Calendrier-side check).
- Past-date navigation has no depth limit within the current season.
- Match report data (beyond date + opponent + optional score/notes) is explicitly out of scope for v1 — the current lightweight Match shape is not a committed schema for future match reports.

## Technical Decisions

**This is not greenfield.** A working Planning/Calendrier module already exists and Epic 4's stories extend/fix it rather than build from scratch (same pattern as Epic 3's pre-existing Séance builder):

- `web-board/pages/planning.html` (135 lines), `web-board/src/js/planning.js` (272 lines), `web-board/src/css/planning.css` — a functional month-view calendar with an add/edit modal for two event types, toolbar (prev/next month, "today", add training, add match), and toast feedback.
- `web-board/server.js` already exposes `/api/planning` as a generic CRUD route over `web-board/data/planning/` (`PLANNING_DIR`, line 10; route wired at line 173) — no new route needed.
- `web-board/data/planning/` currently has no event files (empty) — no real data to migrate.
- **What already works:** month grid rendering (`renderCalendar()`), create/edit/delete of events via modal (`openModal`, `saveEvent`, `deleteCurrentEvent`), loading Séances into a link dropdown (`loadSeancesForLink`) for the "lien Séance" field, month prev/next/today navigation (`bindToolbar`).
- **What's missing for this epic:**
  - Week view does not exist at all — only month view is implemented; `renderCalendar()` and the toolbar are month-only. Story 4.1 must add a week view and a toggle, reusing the same `events` data.
  - Orphan-reference detection (AD-5) is not implemented: `renderCalendar()` renders `seanceId`-linked events without checking the Séance still exists. Story 4.2 must resolve every `seanceId` against `/api/seances` at grid-render time and show an inline "séance introuvable" state — not only when clicked.
  - Field naming drift: the current event shape uses `type: 'entrainement'` with a `seanceId` field and free-text `titre`/`notes`/`heure`, whereas the architecture's AD-5 describes `type: 'seance'|'match'`. Treat `'entrainement'` as the existing on-disk type name for a placed-Séance event; no forced rename is mandated, but confirm terminology consistency when touching this code.
  - Séance duration on calendar tiles, if shown, must be computed at render time from the Séance's current Ateliers — never read from a persisted total field (durations are never persisted for a Séance).
- CRUD routes generally follow: id whitelist `^[a-zA-Z0-9_-]+$`, resolved-path containment check, 1 MB body limit, security headers (CSP, X-Frame-Options, nosniff) — already applied by the shared `handleCrudRoute` helper `/api/planning` uses; no new security work needed unless a new route is added.
- No internet dependency: any week-view or grid logic added must not load external resources.

## Cross-Story Dependencies

- Story 4.1 (week view) and Story 4.2 (placement + orphan detection) both touch `renderCalendar()`/its successor — sequence or coordinate so week view doesn't have to be retrofitted with orphan-detection logic added separately for month view.
- Story 4.2 depends on Story 3.3 (Séance save/reopen) already existing and enforced: only saved Séances populate the "lien Séance" picker (`loadSeancesForLink`).
- Story 4.3 (history navigation) is largely satisfied by extending the existing prev/next navigation to weeks and by verifying no artificial limit exists in `viewYear`/`viewMonth` stepping — likely a light verification/extension task once 4.1 is done, not new infrastructure.
