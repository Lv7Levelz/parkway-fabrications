# Task 106 — navigation repair and rendered verification

Review branch: `codex/task-106-navigation`.
Base main: `fb9a20bfc76cc3e685664d6c68f8e52af5acdd8d` (PR #3 merged).
No merge or deployment is part of this change.

## What was reproduced

The actual staging URL is https://lv7levelz.github.io/parkway-fabrications/.
On 29 September 2026, the deployed homepage, stylesheet, navigation script and shared script were fetched and compared with current main. All four were byte-for-byte identical. Responses used GitHub Pages `Cache-Control: max-age=600`; the homepage reported `Last-Modified: Tue, 29 Sep 2026 07:48:16 GMT`. There is no evidence of stale assets in those responses. This cannot establish what an earlier visitor's browser had cached.

| Deployed asset | SHA-256 matching current main |
|---|---|
| index.html | `2d2f0a295406c3367c4f26d003105ca9851e3638b2b66d461bf02de2` |
| styles.css | `c835bddcc104a40a165020015e8f918627c702bbbef590ffe503e0cc5c7d6cbf` |
| navigation.js | `23cc0291a46ec5f5dfb25450d8a5ffdf3378ba6c45395073f525b92901393c3b` |
| script.js | `a8a8aac662962cd512f51028bf89f0715d803eea7af1ffc2107aa0233614d57e` |

A cloud-browser inspection of the real site showed Capabilities visibly opening through keyboard focus. Tabbing into its submenu and pressing Escape left the panel visibly open. The old Escape handler closed the panel and then focused its summary; the group's focusin handler immediately reopened it. A source-only robots/link audit could not detect this.

Other input conflicts in the same code:

- `mouseleave` closed a panel even while a keyboard user was working inside it.
- Unconditional focus-opening competed with a summary's native toggle on pointer/touch activation.
- Closing a panel could leave focus inside hidden submenu content; resizing to compact navigation could hide the focused element.
- Services-specific CSS and shared dropdown CSS both styled the same elements. This duplication was removed, rather than adding a third override layer.

The report does **not** assert that every ordinary desktop hover was broken. The current deployed hover behaviour is independently recorded by the CI staging probe. An earlier blanket failure to open on hover cannot be attributed to caching without evidence.

## Repair

- One shared `.nav-group` / `.nav-disclosure` / `.nav-dropdown` stylesheet; obsolete service-only classes and duplicate rules removed.
- Native details/summary and real HTML anchor links retained. All three disclosures share a native `name` so the no-JavaScript fallback is exclusive in supporting browsers; JavaScript also closes sibling panels.
- Keyboard focus-opening is separate from pointer activation. Hover opens only for a fine pointer that supports hover and the existing desktop breakpoint.
- Escape suppresses automatic focus-opening during focus restoration and leaves the panel closed.
- Mouse-leave respects keyboard focus; close operations restore focus before hiding submenu links.
- Outside click, focus leaving navigation, and crossing the responsive breakpoint close stale state.
- Desktop dropdowns have a viewport-relative height limit with scrolling; compact navigation retains its existing scrollable panel.
- Existing mobile-toggle code in `script.js` is unchanged. The navigation module coordinates dropdowns and accessible toggle labels without touching RFQ logic.

The main headings remain normal links to `services.html`, `sectors.html` and `capabilities.html`. Service/sector/capability content and all owner-dependent claims are unchanged.

## Verification and evidence

Commands:

- `npm test`
- `npm run check`
- `node --check navigation.js`
- `python3 scripts/build_frontend.py --mode staging --api-url https://staging-api.example`
- `python3 scripts/seo_audit.py --root dist --mode staging`
- `PARKWAY_TEST_ROOT=dist node scripts/test_navigation.cjs` (Playwright Chromium required)

The browser suite tests all 15 pages at 320, 390, 768, 1100, 1181 and 1440px. It exercises hover-to-last-link movement, actual keyboard Tab/Enter/Space/Escape, focus restoration, touch first/second tap, sibling exclusion, outside-click close, hub and submenu navigation, no-JavaScript disclosure, short desktop height and horizontal overflow. Hit-testing checks that submenu links receive input above page content, rather than merely having nonzero rectangles.

CI adds a browser job against the **generated staging build** and retains two separate artifacts:

1. `task-106-branch-navigation`: fixed-branch screenshots and browser assertion report.
2. `task-106-current-staging`: a fresh read-only probe of the currently deployed Pages site, including actual asset hashes, desktop hover/Escape screenshots and compact-width observations.

The deployed probe is deliberately a report, not a claim that main contains the branch fix. A reported live Escape failure remains a live failure. Browser-launch or staging-fetch errors fail that probe instead of fabricating a success.

Local browser checks use headless Chromium; CI uses the pinned Playwright Chromium distribution. Real-device Safari/Firefox and assistive-technology sessions are not claimed. Native disclosure names and focus indicators are verified, but this is not a whole-site accessibility certification.

## Scope and release boundary

All 15 source pages and the generated staging pages retain exact `noindex,nofollow`; robots blocking is retained. Protected backend, Supabase, RFQ form/JavaScript, Render, Turnstile, scanning, admin, email and public API configuration remain unchanged. No enquiry is submitted during testing.

Review the PR and its current CI artifacts. After an approved merge and Pages deployment, rerun the deployed probe and confirm asset hashes match the merged commit, all hover/keyboard/touch checks pass and Escape is closed in the screenshots. Until then, the current staging site remains on its existing main build.
