# Font ownership candidate

[MOD-03](https://trello.com/c/4ehkJaOM) is not accepted: native font interaction and rendering
have not executed because macOS reports a locked desktop. The source change and bounded
browser/owner evidence below do not establish full font workflows or Pen parity.

## Responsibilities

`packages/core/src/text/fonts.ts` decreases from 1,014 to 595 physical lines. `FontManager`
retains loaded bytes, source and coverage state, style aliases, registration orchestration and
its public facade. Existing font parsing, shaping, resolver and web-provider owners remain.
Six internal owners separate responsibilities rather than forwarding public exports:

| Owner under `packages/core/src/text/font/` | Lines | Responsibility |
| --- | ---: | --- |
| `catalog.ts` | 195 | Bundled catalog, local permissions/catalog reads and family-face discovery. |
| `loading.ts` | 123 | Bundled, host and downloaded reads, retry sharing and stale-host rejection. |
| `providers.ts` | 71 | Provider generations, registration state and per-provider invalidation. |
| `fallback.ts` | 126 | CJK/Arabic fallback packs and pending request lifetimes. |
| `metadata.ts` | 57 | Variation and named-instance metadata caches and family/style selection. |
| `reads.ts` | 34 | Shared read lifetimes and byte identity. |

The existing `font/sources.ts` owns `BundledFontLocator`; the same public text entry continues
to export it. Browser `window.queryLocalFonts`, `FontFace` and `document.fonts` access remains
at the existing `fonts.ts` boundary. The catalog receives a bound query getter. No dependency,
platform allowlist expansion, new suppression or forwarding-only public shim is added.
The main owner's retained loaded-state lifecycle remains above the usual 200–300-line guidance;
595 is a measured review boundary, not a claim that line count alone proves good architecture.

## Executed evidence

- Before: 145 font tests / 305 assertions pass. After: 146 / 312 pass across 19 files.
  Review identifies a missing `parseFontStyle` import in extracted variation metadata. A new
  public lifecycle case fails with that exact error, then passes after the import is restored.
  It checks missing/static/variable/slanted/cache/replacement behavior.
- Wider text, renderer, Figma text and Vue typography contracts: 376 tests / 1,471 assertions
  pass across 39 files. Public named exports/signatures, source/Vue/shared-test types,
  architecture, focused lint and package metadata/export/contents/Publint/ATTW checks pass.
- Ten named visual cases pass before any font owner changes and after the extraction in
  Chromium and WebKit: variable weight/optical size, international first paint, delayed mixed
  fallback and substitution. Five export assertions use zero pixel tolerance. The pending
  dark viewport retains its existing screenshot tolerance. Controls show actual glyphs.
- The broader workflow suite reports six passes and three failures on the candidate. A
  separate controlled run restores the exact original two font owners, holds the six new
  helpers outside the source tree, builds and runs the identical nine cases: six pass and
  the same three fail. All eight candidate files are then restored with matching SHA-256
  digests and package outputs rebuilt. No snapshots are updated during this comparison.
- The normal production build and the separate native-test compile both pass. The latter
  builds only the isolated debug binary; no native font interaction is exercised. Existing
  build warnings remain in the retained logs.
- Independent review confirms those matching failures and restored source digests and finds
  no additional concrete refactor defect. This does not establish universal external
  subclass/override equivalence or every possible font workflow.

Private receipts: `scratch/mod03-font-unit-final-2026-11-06.log`,
`scratch/mod03-text-integration-2026-11-06.log`,
`scratch/mod03-browser-strict-before-2026-11-06.log`,
`scratch/mod03-browser-isolated-2026-11-06.log`,
`scratch/mod03-font-workflows-2026-11-06.log`,
`scratch/mod03-workflow-original2-2026-11-06.log`,
`scratch/mod03-workflow-control2-driver-2026-11-06.log`,
`scratch/mod03-normal-build-2026-11-06.log`,
`scratch/mod03-native-build-2026-11-06.log` and
`local-evidence/mod03-fonts-2026-11-06/before/`. Private receipts are retained locally;
this document records their result without publishing user data.

## Open acceptance

Historical tracked controls remain unchanged. Explicitly named `*-current` and pending-dark
controls capture the pre-refactor source; preserving them proves bounded refactor stability,
not that old mismatches are correct or actual Pen output matches.

| Task | Observed gap and next criterion |
| --- | --- |
| [FONT-EXPORT-BOUNDS](https://trello.com/c/vw3MaeLF) | Mixed-script edit export is 1,324 × 292 versus the old Chromium control's 1,324 × 288. Establish expected bounds with matched fonts and an equivalent actual Pen fixture. Retain pending-theme/edit-outline drift and the separate old substitution viewport mismatch as unresolved fixture/reference evidence. |
| [FONT-LOCAL-PICKER](https://trello.com/c/IMBhByZW) | Selecting the mocked local family leaves Inter. Determine real font bytes/provider behavior and qualify selection, rendering, history and reopening; do not infer a production defect from an incomplete mock alone. |
| [FONT-CJK-REPAINT](https://trello.com/c/alOGuXJ8) | Delayed fallback reaches ready glyphs but the test observes zero callbacks where it expects one. Trace readiness and callback lifetime, then assert the actual delayed render contract. |

The first original-control build fails before browser execution because a new unused helper
still imports the moved type. The second control holds all six helpers and succeeds at
building the original closure. Both receipts remain; a failed control is not counted as
browser evidence. An earlier candidate browser attempt has one startup timeout during
concurrent package validation; the isolated rerun passes all ten. Its exact concurrency
cause is not established. Future build/pack validation is kept sequential with browser runs.

Native GUI acceptance remains unexecuted. Build/compile evidence, when available, is a separate
packaging check and cannot close MOD-03. Preserve the main installation, user profiles,
credentials, recovery data and unrelated icon work. The full independent design and
functionality parity goal remains active.
