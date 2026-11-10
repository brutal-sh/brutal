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
The cause remains unknown; no compensating offset is added to Open Pen. A separate
Hug-height parent probe reports zero parent height in unsaved state; that probe does
not qualify Hug-parent behavior or justify changing the shared Hug algorithm.

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
