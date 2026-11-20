# Note Fill sizing

Reference: actual `/Applications/Pen.app` 1.2.22, measured 2026-11-10 through its
document tools. This qualifies individual observations below; complete visual and
functional acceptance and the parent Note-reference task remain open.

## Reference measurements

| Layout                                        | Authored sizing                                   | Observed body/allocation                                                    |
| --------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Root                                          | Width Fill fallback 200; height Fill fallback 550 | 250 × 219; authored fallback strings remain separate from the body minimum. |
| Root                                          | Width Fill fallback 420; height Fill fallback 550 | 420 × 219.                                                                  |
| Vertical 600 × 500 parent, padding 20         | Width Fill; height 400                            | 560 × 219.                                                                  |
| Vertical or horizontal fixed parent           | Width 300; height Fill                            | 300 × 219; Fill height does not stretch the Note.                           |
| Vertical parent                               | Two Notes, both axes Fill                         | Each 560 × 219, Y20 and Y239.                                               |
| Vertical parent, first Note has 14 hard lines | Both axes Fill                                    | First height 356, second Y376 and height 219.                               |
| Parent width grows 600 → 800                  | Width Fill                                        | Note width 560 → 760.                                                       |
| Horizontal parent, two Fill-width Notes       | Width 600, padding 20                             | Each width 280, X20 and X300.                                               |
| Same row shrinks to width 400                 | Width Fill                                        | Each retains minimum 250, X20 and X270, overflowing the parent.             |
| Fixed parent with centered height alignment   | Height Fill                                       | Intrinsic 219 height, Y140.5 in a 500-high parent.                          |

The reference tool initially reports an extra 50 on child Y positions in unsaved
state. Exported body pixels and newly reopened copies report the positions above.
The cause remains unknown; no compensating offset is added to Brutal.

## Hug-parent candidate, 2026-11-11

The saved matrix is copied byte-for-byte to a new owned URI and reopened through
the actual Pen document tools. Eight controls confirm that Fill-height Notes do not
contribute to the parent's Hug height, while their visible bodies remain intrinsic:

| Control | Parent height | Note allocation |
| --- | --- | --- |
| Row, all Fill, fallback 500 | 500 | Y20, height219. |
| Row, Fill Note and fixed 50-high rectangle | 90 | Y20, height219. |
| Column, two Fill Notes, first 14 hard lines | 500 | Heights356/219, Y20/376. |
| Column, first Fill and second fixed219 | 259 | Heights356/219, Y20/376. |
| Same column, both authored fixed219 | 615 | Heights356/219, Y20/376. |
| Row, fixed Note | 259 | Y20, height219. |
| Mixed row, centered | 90 | Note Y−64.5. |
| Mixed column, centered, gap12 | 259 | Notes Y−164/204. |

The initial independent regression records five failures in eight cases. The
unpublished candidate resolves the Note-specific contribution, then asks Yoga to
place the intrinsic bodies inside the resolved parent. Ordinary wrapping keeps its
existing Yoga behavior; a review-discovered wrapped-row regression has a dedicated
test. The candidate does not change authored Fill strings or serialize measured body
sizes as parent fallback values.

Additional actual Pen observations report a zero fallback with parent height0 and
Note Y20/376; fallback20 with centered children gives Y−277.5/78.5. A nested Hug
ancestor reports279 with inner259. These are saved after observation but not freshly
reopened: the next Pen MCP call returns a plan-usage block. They remain weaker
reference evidence than the eight reopened controls. The candidate's zero/small
fallback tests exercise a Yoga padding projection; fresh native reference acceptance,
asymmetric padding and other alignment states remain open.

The grouped candidate passes 119 focused engine/editor cases, including 13 new Hug
regressions. Independent review finds and resolves a wrapped-row correction and a
minimum-height/distributed-spacing case. The layout implementation is grouped under
`layout/notes/`; the browser Note driver retains all 11 methods while separating
setup, selection, components, paints and read probes. All seven touched TypeScript
modules satisfy the 300 code-line, 50 function-line and complexity10 checks.

Six Chromium/WebKit sizing/Hug cases pass. The two Hug snapshots cover the complete
frame and overflow at 710×750; the existing sizing snapshots cover 650×650. Both use
zero pixel tolerance. The retained-Fill journeys assert save/reopen values without an
additional snapshot. The session avatar sits outside the Hug canvas crop.
The broader inspector and component states belong to the complete Note cohort and
remain separate from this six-case sizing/Hug result.
After the driver grouping, the complete cohort passes 26 Chromium/WebKit cases,
including Note creation, inspector/context actions, components, sizing and Hug.
The rebuilt native candidate executes the new Hug case and the original sizing and
component cases: three specs pass on binary SHA-256
`dfd5ebb62bab074040bb51ff2bb0cc5e618636e6e0b7c4a7f33fd1727c09d92a`.
The native path imports through the existing drop fixture, saves through the native
file API and closes/reopens through Recents; trusted OS File Open/Save As dialogs are
not qualified by that path.

The first full quality run stops at an ATTW Vue prepack failure. Isolated Vue ATTW
then passes; the original failure remains unclassified. Separate MCP startup logs
contain a CodeMirror override error and do not establish that packaging failure's
cause. No dependency manifest, lockfile, timeout or threshold is changed. The complete
canonical unit command, including heavy fixtures, records 10,115 passes, one Windows-only
skip and the same strict Note raster failure at 12,792 changed channels (exit1).
Completed quality and browser receipts are retained with the grouped source manifest;
earlier failed runs stay separate. Source and tests retain these qualification boundaries.
The final complete `bun run check` exits zero with zero duplicate-code groups using
the established Bun, Git LFS and Gitleaks toolchain; the earlier missing-scanner PATH
failure is retained separately. Scanner rules and thresholds are unchanged.
This section does not extend the previous published commit's acceptance or establish
complete Hug/Note parity.

## Independent implementation and executed checks

The candidate accepts the existing Fill grammar, preserves exact authored fallback
strings through repeated `.pen` saves, and measures a Note's height from its text.
After flex allocation, its generated text body is laid out again at the allocated
width. A Fill edit records the chosen axis, including an instance whose current size
equals its master's; a later Fixed edit saves the visible size. Typing a fixed height
retains the entered authored height while the visible body remains intrinsic.

Executed source checks cover fixed horizontal/vertical parents, both Fill axes,
root minimum/fallback, parent resize, siblings, centering, component overrides,
three repeated saves/reopens, exact Undo/Redo, cancellation and read-only refusal.
The browser test opens the authored fixture through File, changes both toggles,
types height 450, saves through File, verifies the emitted document, reopens it and
checks geometry, content, fallback strings and disabled read-only controls. A second
case types both dimensions while Fill stays checked and verifies that Escape restores
a draft before save/reopen. The layout snapshot covers the two flow Notes at zero
pixel tolerance; it does not include the session-random avatar or accept Pen UI parity.

The browser read-only check exposed an enabled custom size field inside a disabled
fieldset. The shared size field now explicitly disables its number and sizing
controls when the editor becomes read-only.

The rebuilt test-only native binary executes the sizing case and the existing Note
component case. The sizing path imports the fixture, changes Fill controls, exercises
native-menu history, commits numeric fields with Enter, saves through the native file
API, closes the tab and reopens it through Recents. It verifies both fixed and retained
Fill values in the saved document and refuses disabled clicks without changing sizing.
The driver reports enabled buttons inside a disabled fieldset; a separate probe confirms
`:disabled` and unchanged click behavior, so acceptance asserts those actual conditions.
This does not qualify trusted OS Tab traversal or the native Save As dialog.

Private binary identity: SHA-256
`d5959799308c4a30bc3831c74ee0d70e59ee93cb30fb6d38c479bd02cbfaf6f1`.
The source-change manifest retains all 19 changed runtime files against base
`daa2b476d1ce646a653f5facdcf6938e8d88b70c`; no production app is installed.

The full canonical unit run, including heavy fixtures, records 10,102 passes, one
Windows-only skip and the existing strict Note raster failure at 12,792 changed
channels. That run covers the semantic implementation before the final import-only
alias correction; all 730 bundled JavaScript/CSS/HTML files remain byte-identical
afterward, and the rebuilt native pair passes again. No raster threshold changes.

Core layout orchestration is separated from `layout/flex/`, leaf configuration and
`layout/apply/geometry.ts`.
Vue layout actions share one preview owner and separate property, axis-size, sizing
and alignment operations. This is bounded modularization, not whole-app acceptance.

The combined quality command exits zero with zero duplicate-code groups. The full
unit command still exits one for the strict raster failure above; the two results
are separate acceptance evidence.

## Preserved refusals and gaps

Hug Note dimensions, dimension variables, malformed Fill strings, custom bodies,
unqualified styles/effects and unsupported component structures retain explicit
refusals. The existing typed nested replacement policy can materialize its enclosing
instance; these Fill tests do not accept linked replacement parity. Strict Note
raster equality remains a separate open task and is not waived by layout assertions.

The private receipt directory is `local-evidence/note-fill-2026-11-10/`. Reference
exports, saved/reopened copies, raw tool observations, failed original regressions
and candidate logs remain local. The committed synthetic fixture contains independently
authored test content, with no copied vendor artwork or implementation.
