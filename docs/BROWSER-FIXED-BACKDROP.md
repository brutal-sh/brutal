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
| -------------------- | --------------------- | ------------------ | ---------------------- |
| Phone width          | 334.0876777251185     | 334.078125         | 334.078125             |
| Tablet height        | 267.54237288135596    | 267.53125          | 267.53125              |

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
parity. Fixed-device surroundings use the editor canvas color in Brutal while
Pen uses its panel background. The source switches that one theme slot to the
existing panel token. Pen also has a 16 CSS-pixel footer with an import-height
handle: an actual drag reduces the visible region and reveals hatching below;
dragging down restores the full region. Brutal lacks that control. This is the
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

## Height control candidate — 2026-11-11

The BROWSER-CLIP candidate adds the observed 16 CSS-pixel footer, a fixed-device
rim and a hatched clipped region. A prepared page image keeps its captured scale while the
surface clips it; the native child resumes before that image is released. Capture failures
cancel the gesture, and an older result cannot own a newer gesture. Pointer cancellation and
Escape restore the prior height. Arrow keys, Shift, Home and End adjust the focused control;
Enter or double-click requests a full-page import.

Whole-page imports can clip the editable root while retaining descendants outside it; selected
element imports retain their original dimensions. Existing destination, read-only, font/image,
late-result and document Undo protections remain. Clip height stays in workspace memory.
No provider, credential, browsing-history or global preference policy changes.

Thirty Chromium/WebKit checks execute the real surface and height composables, with dark
and light render/axe states, cancellation, late rejection, failed capture, stable image scale
and hide/resume transitions at the bridge boundary for Desktop, Phone and Tablet. Deliberately removing each of the three
surface repairs makes its exact assertion fail; the candidate bytes are restored afterward.
The browser owner suite executes 86 cases and 343 assertions after the final dock signature
refactor. Strict 300-code/50-function-line, complexity-10, four-parameter/depth-four checks pass
all 23 browser source modules. These bounded results do not establish actual native pointer
behavior or full Pen parity.

The isolated native driver emits MouseEvent rather than PointerEvent for its pointer action.
A retained diagnostic sees no pointerdown at the grip, no error/overlay and no drag. The two
failed drag cases and narrowed diagnostic are not evidence of a product failure or pass;
no driver patch, fake pointer or app event fallback is added to make this gate green.
A readiness-corrected isolated WebView probe executes two cases: keyboard clipping with a
smaller editable root, two retained fixture panels including the off-edge panel at y=1500,
full-page import at height 1800, and one Undo per import. The initial fixture sends ArrowUp
while aria-disabled=true during loading; that ignored key is not a product failure. A separate
initial assertion wrongly counts immediate children rather than the two nested fixture panels;
its corrected assertion checks both 200 × 120 panels and the off-edge y=1500 position. Both failure receipts
remain. Driver-delivered KeyboardEvent and programmatic focus do not establish trusted OS
keyboard or pointer behavior. The canonical native height spec then executes both cases successfully (1.9s).

Actual Pen's minimum height, fixed-device import clipping policy and double-click result are
still unexecuted. Compact/wide/tall, matched light/dark and native pointer comparisons remain
open. The Mac is locked during re-entry; no security or permission setting is changed.
Private receipts: `local-evidence/browser-clip-2026-11-11/`, including three failing controls,
four browser captures, source review and native diagnostics. BROWSER-CLIP stays Building;
SURF-BROWSER and full beta remain open. This candidate is not installed over the normal app.

The source candidate is published privately as `bb399a9b4`; its normal-app installation
remains withheld. The broader original 16-spec sequence plus the height spec executes
29 passing and three failing cases across 17 specs (14 pass, three fail). The failures are
menu focus, editor focus after browser hiding, and reload address availability. All three
also occur when the pre-refactor `e3c70fbc6` is rebuilt and runs the same three byte-identical
specs and routing guards. That baseline additionally fails two preview setup cases. This
comparison does not establish their cause or native reliability; no timeout or assertion is
waived. The [native sequence record](NATIVE-RETAINED-SEQUENCE.md) retains both results.

## Docked import-height reference follow-up

Actual Pen 1.2.22 on the same 1,800px synthetic page supplies a further bounded
reference observation. Two coordinate drags in expanded Coding Mode leave the
layout unchanged. In the docked browser, dragging the grip upward reveals hatching;
a further drag reaches a stable minimum, and repeating the upward drag retains it.
The displayed capture suggests a 240 CSS-pixel surface at device-pixel ratio two;
this is image-read geometry, not an exported DOM measurement.

With Tablet selected, the full-height Import action creates a body frame whose
inspector reads 200×1,800. Import at the minimum height creates a second frame with
the same dimensions. The fixture has two 200×120 absolute sections at y32 and y1500;
its observed root width does not establish general body-width projection. On this
fixture, reduced fixed-device preview height does not truncate the editable import.
Double-clicking the grip restores the full browser height and removes hatching;
the layer tree retains two roots, with no additional import observed. This exposes
remaining minimum, fixed-device import and double-click differences in the current
Brutal candidate; those behavior gates stay open.

Only the newly created reference document is closed. Pen returns to its original
Home view with Tablet preference retained; the owned local server is stopped.
No design-MCP call, direct reference-file edit, permission change or user-document
edit is used. Desktop/Phone semantics and exact lossless cross-app pixels remain
unverified. Private observations: `local-evidence/browser-clip-2026-11-11/actual-pen-height-followup.json`.

## Reference-height repair qualification — 2026-11-11

The measured Tablet differences now have a bounded candidate repair: the preview has a 240 CSS-pixel surface minimum, fixed Phone/Tablet imports retain the full editable page, and double-click/Enter restores full preview height without requesting an import. The actual Import button remains the import action. Desktop clipped-import policy is retained pending its own reference execution. A REA-opened renderer hash and its common minimum/reset handler corroborate the earlier actual Tablet UI observations; static policy does not establish every preset/window runtime state.

A new delayed-capture pointer control fails in both browser engines before the ownership repair: pointer-up ends the gesture but leaves capture pending. Releasing that canceled preparation synchronously invalidates its backdrop generation; successful drags retain their frame, and stale captures cannot own newer work. Both engines now pass that control, reset before capture completion and late-rejection checks. Independent source review confirms the existing async-action, overlay, visibility and disposal guards remain intact.

The final serial browser run passes 34 cases; two additional focused minimum-capture cases pass, and both resulting images are inspected. The browser owner suite passes 86 cases/343 assertions. All seven changed source modules meet 300-code/50-function-line, complexity-10, four-parameter/depth-four checks. The complete static quality gate exits zero with literal zero clones on these same product bytes. A later native-fixture scheduling/readiness correction changes no product source or assertion/timeout and passes its owning type check.

The exact rebuilt isolated native binary `fc9073881bd7a6a796303b76bfb331bdf68d3846808ffbb22e40739ce9cede8e` passes all four current height cases. Archived original `ee89cb9d0aecbe6059e5f06c96dd1e96edcf4d2bb824dbc866746382d5807277` still imports Tablet at 820 rather than 1,800 pixels. A fresh-process reset comparison makes that original add an extra design root and fail, while the candidate preserves the root IDs and passes. Programmatic native events remain software delivery evidence, not trusted OS double-click acceptance.

Retain all failed controls: early Home-key setup, a WebKit story-loading failure during an overlapping build, the native callback waiting on animation frames paused by child-view focus, and mixed original sequences whose legacy Enter import makes the reset negative control nondiscriminating. Those sequences are not evidence of a repaired global native race. The final fresh-process comparison preserves the assertions and deadlines and uses explicit public readiness; no timeout, skip, threshold or original failure is waived. The original target binary is restored after each comparison; user installations and profiles are unchanged.

The grip tooltip deliberately retains the actual Pen wording, “double-click to import the full page,” although both observed reference behavior and its reset handler clear the height override without adding a design root. This upstream wording discrepancy is recorded rather than silently changing the requested reference copy.

BROWSER-CLIP remains unaccepted for matched compact/wide/tall and dark/light native comparisons, actual Desktop/Phone import/minimum semantics and trusted gestures. SURF-BROWSER, native reliability, beta and full parity remain open. Private source manifests, original/candidate binaries, case logs, inspected minimum captures and `reference-repair-qualification.json` live under `local-evidence/browser-clip-2026-11-11/`.
