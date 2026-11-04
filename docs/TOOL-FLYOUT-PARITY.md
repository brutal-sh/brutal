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

## Remaining

The earlier Script gap list is superseded by [Script implementation and executed evidence](SCRIPT-PARITY.md).
Editable-icon `.pen` writing remains refused by the existing content guard and requires its
own roundtrip correction; placement/history does not qualify saving. The observed reference
opening with Icon remembered focuses Rectangle despite Icon being checked; Open Pen still
focuses the selected radio. This focus policy, exact Icon inspector order/controls and the
tool glyph remain open.

Exact glyphs, every hover/disabled/read-only/light/display-scale state, offline placement, native
scaling pointer/modifier/multiselection behavior and whole-product parity remain unqualified.
A corrected subset of spacing/focus does not accept the whole menu.
