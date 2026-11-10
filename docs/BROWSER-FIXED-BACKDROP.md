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
- The broader 16-spec retained candidate passes 12 specs and fails four
  (25 cases pass, five fail). History availability, overlay focus, preview focus
  and reload address remain unclassified here. The geometry cases pass in that
  sequence. These results neither attribute nor waive the separate failures.

Actual `/Applications/Pen.app` 1.2.22 is checked on the same owned local content:
Phone Screenshot offers Full Page and Visible Area, and fixed-device zoom actions
are disabled. The original Tablet preference and Home view are restored; only
the newly created reference tab is closed, and the owned server is stopped.
Its physical 3000×1874 window is not matched to the 1280×800 logical test fixture;
no exact Pen pixel or geometry comparison is claimed.

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
