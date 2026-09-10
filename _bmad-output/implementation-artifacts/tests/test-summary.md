# Test Automation Summary

**Frameworks:** `node:test` (built-in, zero dependencies) for API tests, Playwright for E2E — matches the project's zero-build-tool architecture as closely as possible while still getting real browser coverage. First `package.json`/`node_modules` introduced into the repo for this purpose (devDependency only: `@playwright/test`).

## Generated Tests

### API Tests (`node:test`, `npm run test:api`)
- [x] `tests/api/exercises.test.js` — `/api/exercises` CRUD, `thematique` enum validation (valid/missing/invalid), id whitelist
- [x] `tests/api/seances.test.js` — `/api/seances` CRUD, Bloc/Atelier round-trip, confirms `dureeTotal` is never persisted
- [x] `tests/api/planning.test.js` — `/api/planning` CRUD, orphan-reference precondition (dangling `seanceId` survives the Séance's deletion), unfiltered history (2019-dated event)
- [x] `tests/api/security.test.js` — security headers (CSP/X-Frame-Options/nosniff), path traversal, id-based path-traversal rejection, 1MB body limit (413), static-asset query-string handling, no permissive CORS header (regression, see Security review below)

### E2E Tests (Playwright, `npm run test:e2e`)
- [x] `tests/e2e/board.spec.js` — double-click/tap ends a trajectory without adding a spurious point; the old "Terminer traj." button and the deleted Temps mort module are gone (404)
- [x] `tests/e2e/bibliotheque.spec.js` — Thématique filter, keyword search, empty-state on no matches
- [x] `tests/e2e/seance.spec.js` — build a Bloc with 2 Ateliers, durée total auto-updates, save/cleanup round-trip; Bloc name is free text and editable; empty-Ateliers Bloc shows the placeholder
- [x] `tests/e2e/planning.spec.js` — month/week toggle with consistent `aria-pressed` state; orphan warning renders on the calendar grid; "Ouvrir la séance →" only appears when a Séance is linked
- [x] `tests/e2e/seance.spec.js` (added post-security-review) — `notesCoach` can't break out of its `<textarea>` and execute script; `titre`/`theme`/`coach` render as literal text on the printable document, not executable markup

## Security review (post-generation)

A manual security review (no automated scanner — `origin/HEAD` isn't resolvable locally, no remote ever fetched) found and fixed 6 real issues, none caught by the generated tests above until regression tests were added for them:

1. **`notesCoach` broke out of its `<textarea>`** in the Séance editor (`seance.js:266`) — the most severe finding: unescaped free text closed the tag and injected arbitrary HTML/script directly in the editing page, not just on print.
2. Exercise-picker card (`ex.name`/`ex.notes`, `seance.js:479-482`) — unescaped into `innerHTML`.
3. Séance library card (`s.titre`/`s.theme`/`s.coach`, `seance.js:518-521`) — unescaped.
4. Printable document header (`seance.titre`/`theme`/`coach`/`objectif`, `seance.js:564-586`) — unescaped, visible on the exported/printed sheet itself.
5. `formatDate()` (`seance.js:687-691`) had no input validation — a malformed `date` (reachable via direct API call, bypassing the `<input type="date">` UI constraint) fed unescaped derived text into several of the above sites.
6. **`Access-Control-Allow-Origin: *`** on every API route (`server.js`) with no authentication — any website open in the same browser could read/write/delete local data while the server ran. Removed entirely (the app is always same-origin; no legitimate cross-origin caller exists), verified the full test suite still passes with it gone.

All 6 fixed with the existing `escapeHtml()` helper (already used correctly elsewhere in the file from Story 3.1) and verified against real payloads in a real Chromium page (not just source inspection): `window.__pwned` flags stayed `false`, dialogs never fired, payloads rendered as literal escaped text. Two of the fixes (notesCoach textarea-breakout, printable-doc title) now have permanent regression tests in `seance.spec.js`.

**Run:** `npm test` (API then E2E) · `npm run test:api` · `npm run test:e2e`

## Coverage

- API endpoints: 3/3 covered (`/api/exercises`, `/api/seances`, `/api/planning`), plus the shared `handleCrudRoute` security pattern
- UI features: one core workflow per epic covered (Board double-click, Bibliothèque filter/search, Séance builder, Planning week+orphan) — not exhaustive per-story AC coverage, by design (Keep It Simple: happy path + critical behaviors, not every edge case already verified manually during each story's build)

## Notes for future maintenance

- **`npm test` (running the full API suite via file glob) had a real race condition**: `node --test` runs test *files* in parallel by default, and all 4 API test files independently spawn `web-board/server.js` on the same hardcoded port 3000 — concurrent files fought over the port, causing sporadic leftover test data (one file's cleanup could hit a different file's server, or a server mid-shutdown). Fixed with `--test-concurrency=1` in the `test:api` script (forces sequential file execution). Verified with 3 consecutive clean `npm test` runs after the fix.
- The Planning orphan-detection E2E test now scopes its locator to its own event's unique title (`.filter({ hasText: uniqueTitre })`) instead of the bare `.event-chip--orphan` class, so it can't collide with any other orphan chip that happens to be on the calendar, and cleans up in a `finally` block so a failed assertion doesn't leak test data either.

- **Board E2E test requires two workarounds**, both documented inline in `board.spec.js`:
  1. The page auto-loads the most recently saved real exercise on open and would autosave onto it while drawing — the test clicks "Nouveau" first.
  2. That click triggers a native `confirm()` dialog (since the loaded exercise has content) that Playwright silently dismisses by default — the test explicitly accepts it (`page.once('dialog', d => d.accept())`).
  A real bug was caught during test development because of this: without the dialog-accept, "Nouveau" silently no-ops, and a naive double-click test would have kept polluting real seed data (`web-board/data/bibli/feinte-croise-handball.json` picked up 3 stray drawn trajectories during test iteration before the fix — restored from the Story 2.1 migration backup).
- **Bibliothèque tests are coupled to the current real dataset** (e.g. asserting exactly one `gardien`-classified exercise, matching "Espagnole" by name) — there's no seed/fixture mechanism in this project, so these tests will need updating if the real Bibliothèque data changes materially.
- **Séance E2E test cleans up its own saved Séance via the API** (`request.delete`) using a unique test-prefixed title to find it — safe to re-run.
- All API tests use `test_`-prefixed, timestamp-unique ids and delete every artifact they create in an `after` hook.
- Verified: two consecutive full `npx playwright test` runs plus one `npm run test:api` run, all 31 tests passing, zero drift in real seed data (`web-board/data/bibli/*.json` path counts unchanged), zero leftover files in `web-board/data/{seances,planning}/`.

## Next Steps

- Run tests in CI if one gets set up (`npm ci && npx playwright install chromium && npm test`)
- Consider a small seed-data reset script if the Bibliothèque test's coupling to live data becomes a problem
- Add more edge cases as needed (e.g., Séance's "Changer" replace-in-place, week-view navigation across a year boundary) — current coverage favors breadth across all 4 epics over depth in any one
