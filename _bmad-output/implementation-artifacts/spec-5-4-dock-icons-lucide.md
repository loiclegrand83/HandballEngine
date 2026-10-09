---
title: 'Dock icons are real, recognizable symbols'
type: 'feature'
created: '2026-10-09'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dock icons are emoji set via CSS `::before { content: "🎮" }` per `data-tool` attribute. QA found only 4/10 correctly guessable without a tooltip — icons like 🎮 (Joueurs) and 🎯 (Assets) carry no semantic link to their function, undermining the "click without thinking" goal.

**Approach:** Replace the 10 Dock bar icons and the panel header icon with vendored Lucide SVGs (v1.53.0, ISC license, already downloaded to `web-board/assets/icons/`), using the fixed semantic mapping from the architecture spine. Dock bar icons use CSS `mask-image` (not `background-image`) so they keep inheriting `color` from the existing `.dock-icon`/`.active`/`:hover` state rules — the current emoji approach has no color theming to preserve, but the SVG replacement should not regress that capability now that it's available. The panel header icon (a plain `<span>`, no state theming) uses a simple `<img>` injected via JS.

## Boundaries & Constraints

**Always:** Reuse the already-vendored SVG files in `web-board/assets/icons/` (do not re-fetch or modify them). Preserve every existing `.dock-icon` hover/active/disabled/focus CSS state exactly as-is — only the icon rendering mechanism changes, not the interaction states around it. Keep the `aria-label`/`title` attributes on Dock buttons unchanged (already correct per-tool labels).

**Never:** Do not use `<img>` for Dock bar icons (loses `currentColor` theming needed for active/hover states). Do not load any icon from a CDN — local vendored files only (inherited AD-11). Do not touch the Assets-mode grid icons (`ASSET_ITEMS`, separate emoji set for placed equipment, out of scope — this story is Dock *navigation* icons only, not in-game asset icons).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default Dock icon state | Page loads, no tool selected | Each of the 10 Dock icons shows its mapped Lucide glyph (e.g. Joueurs = people icon), colored `var(--color-text-secondary)` per existing `.dock-icon` rule | N/A |
| Hover a Dock icon | Coach hovers "Joueurs" | Icon recolors to `var(--color-text-primary)` exactly as today (existing `:hover` rule still applies to the SVG via mask) | N/A |
| Active/selected Dock icon | "Joueurs" panel is open | Icon recolors to `var(--color-primary)` (yellow) exactly as today's `.active` rule | N/A |
| Panel header icon | Joueurs panel opens | Panel header shows the same Lucide "users" glyph as the Dock bar icon, via an `<img>` in the `.panel-icon` span | N/A |

</frozen-after-approval>

## Code Map

- `web-board/assets/icons/*.svg` -- already vendored (10 files: users, cone, route, play, library, clipboard-list, calendar, tag, layout-grid, undo-2), Lucide v1.53.0, ISC license -- reuse as-is, no changes needed to the files themselves
- `web-board/src/css/dock.css:184-229` -- the `::before { content: "<emoji>" }` block per `data-tool` -- replace each `content: "emoji"` with `mask-image: url('../../assets/icons/<lucide-name>.svg'); mask-size: contain; mask-repeat: no-repeat; mask-position: center; -webkit-mask-image: url('../../assets/icons/<lucide-name>.svg'); -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; background-color: currentColor;` (mask technique: the SVG shape becomes a stencil, `background-color: currentColor` paints through it, so existing `color` state rules keep working)
- `web-board/src/css/dock.css:186-190` -- `.dock-icon::before` base rule (`font-size: 24px; line-height: 1;`) -- add `display: inline-block; width: 24px; height: 24px;` so the mask has explicit box dimensions (font-size alone doesn't size a mask)
- `web-board/src/js/dock.js:30-41` -- `DOCK_ICONS` array (`icon: '🎮'` etc.) -- change each `icon` field from an emoji string to the Lucide filename (e.g. `icon: 'users.svg'`), used only by `setPanelHeader` below
- `web-board/src/js/dock.js:109-115` -- `setPanelHeader(toolName)`, currently `panelIcon.textContent = toolConfig.icon` -- change to `panelIcon.innerHTML = '<img src="../assets/icons/' + toolConfig.icon + '" alt="" width="24" height="24">'` (path relative to `pages/board.html`, matching how other asset paths resolve from that file)

## Tasks & Acceptance

**Execution:**
- [ ] `web-board/src/css/dock.css` -- replace all 10 `::before { content: "emoji" }` rules with `mask-image`-based rules per the fixed Lucide mapping (Joueurs=users.svg, Assets=cone.svg, Trajectoires=route.svg, Animation=play.svg, Bibliothèque=library.svg, Séance=clipboard-list.svg, Planning=calendar.svg, Postes=tag.svg, Vue=layout-grid.svg, Annuler=undo-2.svg); add explicit `width`/`height`/`display` to the base `::before` rule -- Dock bar icons become real Lucide glyphs that still respect hover/active color states
- [ ] `web-board/src/js/dock.js` -- update `DOCK_ICONS`'s `icon` fields to Lucide filenames; update `setPanelHeader` to inject an `<img>` instead of setting emoji text -- panel header icon matches its Dock bar counterpart

**Acceptance Criteria:**
- Given the Dock bar renders, when I inspect each of the 10 icons, then each shows its mapped Lucide glyph, not an emoji
- Given I hover a Dock icon, when I check its computed color, then it matches `var(--color-text-primary)` exactly as before this change (state theming preserved)
- Given a panel is open, when I check its active Dock icon, then it's colored `var(--color-primary)` (yellow) exactly as before
- Given I open any panel, when I look at the panel header, then its icon matches the same Lucide glyph as that tool's Dock bar icon

## Implementation Notes

Both planned tasks applied exactly as Code Map specified — no surprises, no scope growth. Verified via Playwright: all 10 SVGs load from `localhost:3000/assets/icons/` (no CDN), all 10 `mask-image` URLs correctly mapped per tool, default/hover/active color states all transition correctly through the existing CSS rules (`rgb(160,165,176)` → `rgb(234,230,220)` on hover → `rgb(245,196,0)` yellow when active), panel header `<img>` renders the matching icon. Screenshot of the Dock bar confirms all 10 icons render as distinct, recognizable Lucide glyphs — not emoji, not blank boxes.

Review found one real gap: no degradation path for browsers without CSS `mask-image` support, where icons would render as empty boxes — strictly worse than the emoji they replace. Patched with an `@supports not (mask-image: ...)` block (matching the codebase's existing fallback pattern already used for `backdrop-filter` in `glassmorphism.css`) that re-shows the original emoji as text content only when masks aren't supported. Re-verified no regression in the normal (mask-supporting) path.

## Verification

**Manual checks (if no CLI):**
- Load the board in a browser, visually confirm all 10 Dock icons show distinct Lucide glyphs (not emoji, not blank boxes)
- Hover each icon, confirm color changes as before (lighter on hover)
- Open a panel, confirm its Dock icon turns yellow (active state) and the panel header shows the matching icon
- Check browser devtools Network tab shows the SVGs loading from `web-board/assets/icons/`, not any external URL

## Review Triage Log

- **medium, patch** — no degradation path for CSS `mask-image` unsupported browsers; icons would render as empty 24×24 boxes, worse than the emoji they replace (which always rendered something). Confirmed: codebase already has an established `@supports not (...)` fallback pattern for an analogous case (`backdrop-filter` in `glassmorphism.css`). Patched: added `@supports not (mask-image: url('a.svg'))` block re-showing the original emoji as `content:` text, matching that existing convention. Re-verified no regression in the normal mask-supporting path.
- **false, pre-existing, out of scope** — dead CSS (`.asset-item`, `.dock-back-button`, `.dock-assets-grid`) targeting class names dock.js's Assets-mode grid doesn't actually create (it uses `.asset-grid-item`, `.assets-back-button`, `.assets-grid` instead). Confirmed real but unrelated: these classes were never touched by this story's diff, and this story's own Boundaries explicitly rule out touching the Assets-mode grid.
- **false** — `alt=""` on the panel header `<img>` flagged as discarding semantic meaning. Disproven: the icon sits immediately beside `<h2 id="panelTitle">`, which already announces the panel's purpose as text to screen readers — `alt=""` on a redundant decorative image next to equivalent text is the WCAG-correct choice, not a regression.
- **low, rejected** — no `onerror` handler on the panel header `<img>` for a hypothetical future typo in `DOCK_ICONS`. No present defect — all 10 filenames verified correct and loading.
- **low, rejected** — icon filenames duplicated between `dock.js` (`DOCK_ICONS`) and `dock.css` (per-selector `mask-image` rules), no enforced sync. Reasonable refactor idea, consistent with the existing codebase pattern of `data-tool` also living in both HTML/CSS and JS — not a functional defect.
- **false** — different relative path depths (`../../assets/icons/` in dock.css vs `../assets/icons/` in dock.js) flagged as brittle. Both verified correct and working via Playwright (all 10 Dock SVGs + panel header icon load successfully) — the different depths are simply because the two files sit at different nesting levels; not a bug.
- **low, rejected** — no LICENSE/provenance file recorded for the vendored Lucide SVGs. Reasonable documentation practice, but not required by the driving architecture spine (AD-5 only requires filename-matches-slug and no CDN reference) — cosmetic addition, not a defect.
- **false** — redundant `width="24" height="24"` baked into the SVG root elements flagged as wasteful. Disproven: standard Lucide export format: ignored harmlessly when used as `mask-image` (sizing comes from `mask-size: contain`), and correctly matches the `<img width="24" height="24">` usage — no scaling artifact, works as verified.
- **false** — inconsistent accessibility stance claimed between the two icon rendering paths (mask `::before` vs `<img alt="">`). Disproven: a `::before` pseudo-element is inherently excluded from the accessibility tree by construction (no `alt` is possible on it) — pairing it with `alt=""` on the one real `<img>` DOM node is the correct, consistent choice for each technique's context, not an inconsistency.
