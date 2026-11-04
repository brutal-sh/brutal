# Tool flyout parity

Target: installed `/Applications/Pen.app`1.2.21. Move/Primitives are web menus inside its editor; the brand popup is a separate native menu. Visual measurements and behavior evidence remain distinct. Full tool/menu parity is open.

## Observed reference

The Move flyout offers Move(V) and Scale(K). Opening it through the actual app focuses the selected Move radio; the native accessibility footer records that focus. Primitives offers Rectangle(R), Ellipse(O), Polygon, Icon, Script, Import Image or SVG… and Import Figma, with no separator before imports. Private captures: `pen-move-tools-2026-10-31.txt/.png`, `pen-primitives-menu-2026-10-31.txt/.png`. The reference shader document remains clean and unchanged.

The privately extracted shipped bundle/CSS establish these desktop measurements at the default16px root:10px side offset,28px item height,12px text,16px icons,12px check, a4px negative indicator margin,11px shortcut text with16px left padding,128px minimum popup width,8px popup radius and6px item radius. The measured values are implemented independently; vendor source/assets remain ignored private reference material.

## Independent correction

Open Pen used8px side offset,14px check, an indicator column4px farther right, smaller corners and no shortcut inset. Those desktop values now follow the measurements. The extra desktop separator and Import Figma ellipsis are removed. The existing mobile offset/check/separator are retained. Initial desktop focus now targets the checked radio in the opening menu; it neither changes the active tool nor edits the document. The hook uses the existing menu focus event and searches only that menu.

The new focused-Move assertion reproduced a real mismatch before the hook (`tool-flyout-focus-before.log`). Final16 browser workflows pass in26.1s (`tool-flyout-focus-browser-final.log`), including Move/Scale focus, remembered Star focus while another tool is active, Escape/trigger focus return, one-step Scale geometry/text/stroke Undo, cancellation, Icon/image/Figma insertion, direct Frame creation, vertical toolbar keyboard navigation and two mobile modes.

Earlier failures also exposed inherited horizontal-toolbar and Frame/Section-flyout test assumptions. The tests now exercise the observed vertical rail and direct Frame action. The first revised Frame fixture mistakenly called the rectangle helper, which switches tools; a direct drag corrected it. These fixture failures are retained in `tool-flyout-browser.log` and `tool-flyout-browser-final.log`; no product timeout was raised.

The final isolated native check passed in55.8s (`tool-flyout-focus-native-accepted.log`): actual UI buttons opened Move and Primitives; the checked Move, Scale and Rectangle radios received focus; physical Scale→Move choices and Escape dismissal retained selected IDs/document name/dirty state and returned trigger focus. Earlier choice/dismissal runs passed in58.9s and88.6s before the focus correction; those qualify only their earlier code. Three operator binds expired before interaction, including two around context handoffs. They are setup failures retained in the private logs; no product timeout was raised. Source/Vue/test types, full lint (existing warnings) and architecture passed. Test placement/changelog, the normal frontend/native bundle, deep strict signature and native-test bridge/symbol exclusion passed. The candidate was not installed over the main profile.

## Icon placement and default catalog —2026-11-04

Actual Pen still presents the seven-entry catalog above. Icon is a radio: it arms without a
picker or document edit, then places a white24×24 Lucide heart named “Icon” centered on the
click. A drag also leaves it24×24. Placement returns to Move while the menu remembers Icon.
The screenshot of the reference's48×48 selected box at2x is centered on the delivered drag
start(950,220), establishing the anchor separately from size. An independent legacy `icon`
document also opens in Pen with editable heart/lucide,24×24 and white Fill controls.

Open Pen reuses icon loading, paths, selection and subtree history for this placement tool.
Default Primitives hides Line/Star; Customize toolbar and stored explicit choices retain them.
Object → Insert Icon retains the picker, browsing, recent icons and chosen-glyph insertion.
Explicit placement keeps fractional parent-local coordinates and rejects stale graph, parent
identity, page and read-only state after loading. Slot claiming and insertion share one Undo
batch; locked instance and library content retain their guards. App loading failures use the
existing localized error notification.

Forty-eight owner checks/140assertions pass, including reproduced off-page/replaced-parent and
inherited-slot defects. Nineteen browser workflows pass, covering the picker, swap/recolor,
restoring hidden Star, one-shot placement, history, remembered selection, cancellation and
parent-local centering in Chromium/WebKit. The centered-anchor regression fails at Y50 instead
of38 before the correction. Earlier probe/parser failures and a16-pass/two-fail/one-skipped run
remain separate: the latter reaches Undo before the closing menu unmounts and assumes integer
mouse delivery at a fractional canvas edge. The corrected tests wait for actual closure and
allow less than one horizontal CSS pixel of input quantization; exact explicit coordinates
remain an owner assertion.

The139.3s native journey physically opens the owned document, arms Icon without an edit/picker,
places the real loaded heart, measures its center against the delivered pointer, returns to
Move, undoes/redoes the same subtree IDs, checks the remembered seven-entry menu, rearms and
cancels. Source bytes remain unchanged and the screenshot is inspected. The first observer
listens on the canvas rather than its input surface and misses the pointer; a separate corrected
document-capture observer qualifies the journey, without a product input change. Private
receipts are in icon-tool-2026-11-04, including native-placement-observer.log and
native-placement-last.png. This does not qualify editable-icon Save/reopen.

## Editable named-icon saving, 2026-11-04

Open Pen independently writes unedited24px Lucide artwork as an editable legacy `icon`
with its library, glyph name and uniform color. Derived paths are omitted only after checking
the recorded drawing, every path's default fields, its supported paints and tint metadata.
Frame properties still pass through the ordinary writer and diagnostics. Unsupported content
is refused before output, without changing the graph. Other libraries, options, sizes and
older icons without the drawing baseline remain unsupported; this is an incremental unit.

The drawing baseline retains float32 coordinate precision independently of the resize-tolerant
glyph indicator. Independent review reproduces a fractional vertex/stroke edit being lost
under decimal rounding; the corrected regressions refuse both edits. FIG reopen adds explicit
handle-mirroring, mirrored stroke weight and empty sentinel/cache defaults. Normalizing only
those equivalent values retains fractional FIG geometry and permits named-icon export.
Nonempty content and actual edits remain guarded. The optional metadata is recorded when
Core places, loads, resets or swaps an icon; existing files remain readable.

Executed:146 related owner checks/475 assertions,13 browser workflows including Save/Open
in Chromium/WebKit, and a2.2s isolated native placement/color/Save/close/Recents-reopen journey.
The native test sets the first output path through the save API, changes color through the
real field's change handler, delivers the native Save event, checks disk bytes and uses the
tab/Home/Recents controls. Its initial OS picker and physical keyboard replacement are not
exercised. Reopening retains editable heart controls, color and clean state without rewriting
the saved file. Browser tests exercise actual download/upload controls; provider fixtures in
browser/model tests qualify mechanics, while native placement loads the real provider glyph.

Failed receipts remain separate: the first Chromium download probe encounters the local-file
picker instead of the configured download path; the WebKit probe reads a field absent from
its projection helper. Native replacement appends text after the controlled input restores
its value; the corrected integration fixture dispatches the field change explicitly. An old
element handle remains detached after closing its document; fresh controls and loaded artwork
are required after reopen. These setup corrections do not establish physical keyboard input.
The initial package build times out; its fresh run with sleep inhibition passes.
Private receipts:icon-pen-roundtrip-2026-11-04. Source-only followup review independently
passes25 checks/61 assertions and finds no further defensible defect; it is not native proof.

## Primitives focus and compact icon structure, 2026-11-04

The actual app's remembered Icon remains checked while Primitives initially focuses Rectangle.
Desktop opening now follows that policy, including keyboard opening, arrow navigation and
Escape/trigger focus return. Move/Scale retains its selected-radio policy; mobile keeps its
existing handling. Remembered customized Star still stays checked while Rectangle takes focus.
Opening or navigating the menu does not select a different tool or edit the document.

A fresh REA observation of the running Pen window confirms Icon below Fill and no Stroke,
Flow segmented row or Clip content checkbox for the selected named icon. Compact Open Pen
now follows that section/control structure. Advanced retains its original controls and order;
ordinary and mixed frame controls keep their existing behavior. This does not yet match the
Fill row, separate glyph/family selectors, tool/header glyphs or all inspector pixels.

Executed:49 browser workflows across Chromium/WebKit, including icon/picker/save workflows,
the retained custom Star choice, Move/Scale, mobile keyboard behavior, compact/Advanced return,
ordinary/mixed frame clipping and unchanged selected-node data. The 3.6s isolated native journey
checks section order, absent frame-only controls, remembered Icon with initial Rectangle focus,
arrow movement, Escape/trigger return and the existing Save/Recents round trip. Its viewport is
1496×933 at scale2, matching the reference window's logical size; both screenshots are inspected.
The initial 19-workflow pass precedes the extra controls; the next24 run retains22 passes and
two fixture failures from a nonexistent return button. The corrected31 and final49 runs retain
their separate results. The first focus probe's exact name omits the R shortcut; its corrected
two-engine regression demonstrates the actual wrong-focus result before the source change.
A native setup import uses a browser-only alias before switching to the owning public SDK
export. That failed run does not qualify UI behavior. Private receipts:icon-toolbar-focus-2026-11-04.
Source-only review finds no defensible regression; it is not additional runtime acceptance.

## Icon paint loading — 2026-11-04

The actual Pen1.2.21 app renders an icon's gradient, alpha and enabled state, and draws
nothing for an omitted or empty fill. A wider icon samples the gradient in its parent
bounds while its square glyph remains centered. Independent owned probe documents and
Pen's exported images are private in icon-paints-2026-11-04; no vendor artwork is added.

Open Pen applies those paint stacks to the glyph's tinted fills and strokes, retaining
intrinsic opacity and stroke geometry. Nested reusable instances resolve the original
glyph before applying replacement paints. The regression first produces two green paints
instead of one, then passes with the expected opacity and retained instance override after
component synchronization. Loaded icons rebase their artwork fingerprint after centering
and painting, so an authored non-square icon does not immediately appear modified.

The two headless comparisons report zero changed pixels with the existing comparator's
0.1 color threshold and anti-alias exclusion. They are **not exact matches**: decoded RGBA
differs at1,457/67,200 pixels in the first sheet and2,238/109,200 in the extended sheet;
the largest channel difference is118. Exact paired pixels remain unaccepted.

Executed coverage includes304 owner tests with922 assertions, a browser File Open canvas
snapshot with sampled solid/alpha/disabled/empty/gradient colors, and the existing icon
picker/placement/save workflows. A native WebView journey dispatches a synthetic file drop
through the app's real document-opening handler, checks opaque/half-alpha/disabled pixels,
and displays the named icon controls. The existing native placement/color Save/Recents
round trip also passes. This does not prove a physical OS drop or the system Open panel.
Earlier native probes mistakenly used the FIG-only loader and the browser-URL helper;
those failures are retained and do not qualify `.pen` loading.

The broader fill-mode snapshot run fails on the existing avatar/background image, both
with this change and after restoring the three changed production files to the parent
source. Its remaining two scenarios do not run in that batch. The baseline is not refreshed,
and this is not an all-canvas-suite pass. Complete Icon Fill editing and paint persistence,
image/mesh/shader/bound-variable projection and exact icon/header/toolbar pixels remain open.

## Remaining

The earlier Script gap list is superseded by [Script implementation and executed evidence](SCRIPT-PARITY.md).
Remaining icon families/sizes/options, older metadata, physical Save-panel/keyboard delivery
and exact paired icon pixels require additional qualification. Initial Primitives focus and
the named compact section/control structure have the bounded evidence above; complete Icon
inspector controls and the tool glyph remain open.

Exact glyphs, every hover/disabled/read-only/light/display-scale state, offline placement, native
scaling pointer/modifier/multiselection behavior and whole-product parity remain unqualified.
A corrected subset of spacing/focus does not accept the whole menu.
