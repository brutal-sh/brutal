# Fixed-device browser backdrop qualification

The numerical macOS defect is reproduced and repaired in source `d5b8cc1b1`,
whose tree is identical to isolated `e552c2622`. The complete clean source gate
passes with literal zero clones. Full visual Pen parity and mixed native-sequence
reliability remain open; a native regression does not accept those criteria.

## Observed mismatch

The same durable test fails against the preserved original binary and passes
against the candidate. Width and height comparisons remain exact; x/y keep the
original 0.05 CSS-pixel bound.

| Preset and dimension | Original native value | Rendered CSS value | Candidate native value |
| --- | --- | --- | --- |
| Phone width | 334.0876777251185 | 334.078125 | 334.078125 |
| Tablet height | 267.54237288135596 | 267.53125 | 267.53125 |

Native WebKit probes show that raw truncation is insufficient near a layout-unit
boundary: `389.99999999999994` renders at 390 CSS pixels. A separate containing
block probe shows that snapping a global coordinate can disagree with snapping
its CSS local offset. The adapter resolves float precision and layout units
relative to that original containing block. The unit granularity agrees with
[WebKit's layout-unit definition](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/LayoutUnit.h)
and [Blink's current definition](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/platform/geometry/layout_unit.h).
Those definitions do not establish unexecuted platform behavior.

The ideal fit, backdrop CSS, device viewport and zoom are retained. Fixed-device
projection supplies its containing-block origin to the native adapter, which
uses the resolved CSS rectangle for open, resize and layout. Origin metadata is
removed before IPC. Desktop defaults remain unchanged. No native dependency,
permission, timeout, retry, screenshot baseline or comparison tolerance changes.

## Executed controls and limits

- Original binary: both durable native cases fail on the exact dimension checks.
- Candidate: both durable cases pass; the unchanged full capture controls with
  Phone/Tablet starting state pass all four cases, including pixels, capture,
  animation, scroll restoration and Undo.
- Focused unit group: 11 cases and 51 assertions pass. Native/general test types,
  scoped lint and formatting pass.
- The earlier broader 16-spec retained candidate passes 12 specs and fails four
  (25 cases pass, five fail). History availability, overlay focus, preview focus
  and reload address remain unclassified here. The geometry cases pass in that
  sequence. These results neither attribute nor waive the separate failures.
- At the unchanged current source `5ef81a295`, the canonical original 16-spec
  sequence subsequently passes all 30 cases in 66 reported seconds. A preceding
  failure-only diagnostic copy also passes. No repair is made; the earlier
  intermittent causes remain unclassified on the sequence parent.

Actual `/Applications/Pen.app` 1.2.22 is checked on the same owned local content:
Phone Screenshot offers Full Page and Visible Area, and fixed-device zoom actions
are disabled. The original Tablet preference and Home view are restored; only
the newly created reference tab is closed, and the owned server is stopped.
Its physical 3000×1874 window is not matched to the 1280×800 logical test fixture;
no exact Pen pixel or geometry comparison is claimed.
The subsequent reference attempt can read menus but CUA reports its screenshot
unavailable. Home remains unchanged; that attempt supplies no new visual evidence.

## Same-window reference follow-up — 2026-11-11

CUA Raise restores actual Pen 1.2.22 screenshot delivery. Its captured window is
2992×1866 pixels. The isolated current native build runs at that physical size,
with a measured 1496×933 CSS viewport and device-pixel ratio 2. The canonical
driver uses physical outer-window pixels; an initial logical-size assumption
fails before comparison. A second setup attempt misses a selected-layer-only
entry; the working fixture uses the always-available browser header button.
Neither setup failure is attributed to application behavior.

Desktop, Phone and Tablet open the More menu on the same synthetic tall-page
content. The four zoom controls are enabled on Desktop at 50% and disabled on
Phone/Tablet in both apps. Native and DOM backdrop widths/heights remain exactly
equal; the existing 0.05 CSS-pixel position bound is retained. The isolated native
journey passes, restores its original window size and closes its owned server.
Stable menu captures wait for the actual opening animation to finish; captures
made during that animation are not accepted as final visual states.

This comparison identifies remaining differences rather than accepting visual
parity. Fixed-device surroundings use the editor canvas color in Open Pen while
Pen uses its panel background. The source switches that one theme slot to the
existing panel token. Pen also has a 16 CSS-pixel footer with an import-height
handle: an actual drag reduces the visible region and reveals hatching below;
dragging down restores the full region. Open Pen lacks that control. This is the
existing [BROWSER-CLIP](https://trello.com/c/Ou2ZtFCB) gap. Double-click full-page
import is a static tooltip contract and is not executed in the reference.

Matching window dimensions does not match stored sidebar widths: the candidate
surface starts at x401.796875/y102 CSS pixels, while the reference's sidebar and
footer yield different content bounds. A lossless reference export and exact
cross-app pixel comparison remain unavailable. Native screenshots and numerical
records stay private under `local-evidence/browser-reference-2026-11-11/`.
No proprietary implementation is copied into the source. Pen's owned comparison
tabs are closed, and its original Home, Tablet and full-height state are restored.

The rebuilt background candidate executes the same three-preset native journey
successfully (2.2 reported seconds). Both final fixed-device captures are inspected:
sampled surrounding pixels change from RGB 24/24/27 to 39/39/42, matching the existing
dark panel token. Full lint, formatting, documentation and changelog checks pass;
independent source/evidence review finds no confirmed defect. This is dark-theme
background evidence in an isolated native build, not installed delivery, full
light-theme acceptance, footer completion or an exact Pen pixel comparison.

REA additionally parses the selected packaged `out/app-window.js`: one source,
33 findings, no parse failure. Its semantic analysis remains partial, with
19,158 unselected inventoried files and an explicit unknown-retention ceiling.
This is static evidence, not runtime bounds proof or a full application analysis.
Private originals, failed setup attempts, source manifests and native receipts
remain in `local-evidence/browser-fixed-backdrop-2026-11-10/`. No private history
payload or proprietary implementation is added to the repository.

[STAB-BROWSER-BACKDROP-FIXED](https://trello.com/c/j6yjFgIw) remains open for the
remaining source/reference checks. [SURF-BROWSER](https://trello.com/c/8J2BOlBG)
retains the full surface comparison; the native-sequence parent remains Verify.
