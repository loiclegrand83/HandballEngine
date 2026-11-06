# Version/Reality Check — ARCHITECTURE-SPINE.md (HaWeb)

Date checked: 2026-09-06
Method: web search (Node.js release schedule/EOL data) + local repo inspection (`README.md`, `web-board/`, installed `node --version`).

## Verdict

**Mostly sound, one stale assertion.** The zero-runtime-dependency / no-bundler / no-PDF-library decisions are internally justified (they follow from the existing codebase's own pattern, not from an external library claim) and don't need version-checking — there's no library version to go stale. The one genuinely version-sensitive claim, **Node.js ≥18**, is accurately transcribed from the project's own README but the README's floor itself is now behind current reality and wasn't reality-checked against the Node.js release calendar before being restated as the Stack floor.

## Findings

1. **Node.js ≥18 floor is stale as a security-relevant statement (not verified against Node's release calendar).**
   Node.js 18 reached end-of-life on 2025-04-30, and Node.js 20 reached end-of-life on 2026-04-30 — both are before today's date (2026-09-06). As of now, the only supported Node lines are 22 (Active/Maintenance LTS) and 24 (Current/soon LTS). The spine's own AD-7 explicitly binds every route to security controls (path traversal checks, body-size caps, `setSecurityHeaders()`), which makes the runtime's own patch status directly relevant — an "≥18" floor permits deployment on two dead runtimes with no further security patches. The spine footnotes this as "per README prerequisite, unchanged," which is honest about provenance but does not constitute a check that the floor is still reasonable; it's an inherited assertion, not a confirmed one.
   **Recommendation:** bump the floor to `>=22` (current Active LTS) in both the spine and `README.md`, or explicitly note in the spine that the inherited README floor is known-stale and out of scope for this feature work.
   Source: Node.js EOL schedule (endoflife.date / HeroDevs, checked 2026-09-06) — Node 18 EOL 2025-04-30, Node 20 EOL 2026-04-30.

2. **Local dev environment already exceeds the stated floor**, unremarked in the spine: `node --version` on this machine reports v24.18.1. This is consistent with (1) — the actual dev/runtime environment has moved past the documented floor without the doc being updated.

3. **Zero-runtime-dependency and no-PDF-library decisions verified against the actual repo, correctly.** There is no `package.json` in `web-board/`, confirming the "none" dependency claim is not aspirational — it's the current, checked state of the codebase. `AD-2`'s claim that `window.print()` + print CSS is "the existing pattern in `src/css/seance.css`" and AD-4's claim that canvas rendering "already used by `explanation.html`" should still be spot-checked against those files directly (not done in this pass — see below) since they're asserted as existing facts, not aspirations.

4. **No third-party library names or versions appear anywhere in the Stack table** besides Node.js itself — so there is no npm-package version drift risk to check (correct scope: a truly zero-dependency app has nothing else to verify). This is a legitimate reason the spine looks "unverified" at first glance — there's simply nothing else version-sensitive to confirm.

5. **Not independently re-verified in this pass:** whether `src/css/seance.css` currently contains print rules, and whether `explanation.html`'s canvas rendering logic is actually extractable as described in AD-4. These are asserted as present-tense facts about the existing codebase (not training-data claims about external libraries), so they fall under "reality-check against the existing project" rather than "web-research a version" — flagging so a follow-up pass can grep those two files directly before implementation starts.

## Not flagged (reasonable as-is)

- "No bundler / no PDF library" — these are scope-limiting decisions justified by the existing codebase's own conventions, not assertions about external tooling that could be outdated.
- Flat-file JSON CRUD pattern, `handleCrudRoute()` security invariants (AD-7) — described as already-adopted, verifiable directly in `server.js`, not a version claim.
