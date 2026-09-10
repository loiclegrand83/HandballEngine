---
title: 'Suppression du module Temps mort'
type: 'chore'
created: '2026-09-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Temps mort module (half-time tactical board) is not part of this product's direction anymore and must be fully removed — not hidden or disabled — from the home screen, navigation, and the repository itself.

**Approach:** Delete `web-board/pages/timeout.html`, `web-board/src/js/timeout.js`, `web-board/src/css/timeout.css`, and remove the `.card--timeout` link/style block from `web-board/index.html`. No other reference to the module exists (no server route, no data directory, no other page links to it).

</frozen-after-approval>

## Implementation Notes

- Deleted `web-board/pages/timeout.html`, `web-board/src/js/timeout.js`, `web-board/src/css/timeout.css`.
- `web-board/index.html`: removed the `.card--timeout` link/card and its style rule.
- No server route or `data/` directory referenced the module — confirmed via search across `server.js` and `data/`.
- Went beyond the code deletion to clean stale documentation describing the removed module (same class of issue caught by review on Story 1.1): `web-board/README.md` (Pages table, "Temps Mort" section, architecture tree/file list) and `web-board/Documentation-et-Guide.md` (module count, ToC, startup bullet, entire §5 "Tableau Temps mort" section, Android tablet note, file table) — all references removed and remaining sections renumbered (5→10 in the guide) to keep the ToC and headers consistent.
- No `Content-Security-Policy` in `server.js` enumerates page/asset names (not path-specific), so removing the three files needed no CSP change — confirmed via `grep -n timeout server.js` (no match).
- **Review finding fixed:** while renumbering, §7 "Page d'explication & Fiche document" kept subsection numbers `6.1-6.3` from before the shift (a pre-existing mismatch with its own `## 7.` parent heading, made more visible now that every section around it was just renumbered correctly) — corrected to `7.1-7.3`.

## Review Triage Log

- §7 subsections still numbered `6.1-6.3` after the renumbering pass — verdict: low (cosmetic doc numbering), but trivial to fix while already editing this exact file for the same reason. Fixed.
- "Documentation-et-Guide.md still says Version 1.1.0 while index.html footer says v1.5.0" — verdict: false for this spec. Pre-existing version-string mismatch, not introduced or made worse by this diff (this change touches neither version string); out of scope for a module-removal chore.
- "README's architecture tree/Pages table never lists the Planning module" — verdict: false for this spec. Pre-existing gap unrelated to Temps mort; this diff only removes timeout entries from that same table, it doesn't own filling in unrelated missing entries.
- "'3 modules' (README tree comment) vs 'quatre modules' (Documentation-et-Guide.md) wording inconsistency" — verdict: false for this spec. Both phrases predate this diff and neither line was touched by it; different documents, different pre-existing counting conventions.
- "No CHANGELOG entry for the removal" — verdict: false. No CHANGELOG file exists in this repo; introducing one is out of scope for this story.
- "CSP not explicitly verified for page-specific entries" — verified: `server.js`'s CSP is not path-specific (confirmed via grep), so no change was needed. Note added to Implementation Notes.
- "`.claude/settings.local.json` unrelated permission grants riding along" — verdict: false for this spec. Pre-existing local file, not staged or touched by this change (confirmed at commit time by explicit file selection).
- "Untracked `web-board/start.sh`, `.agents/`, `.claude/skills/` risk being swept into this commit" — verdict: false. Commit uses explicit `git add <files>`, never a broad `git add -A`/`.`.

