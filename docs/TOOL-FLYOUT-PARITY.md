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

## Remaining

Open Pen still exposes Line/Star in its default Primitives group and lacks Script creation, linkage, inputs, sandbox/live updates and conversion. Icon is an action rather than a radio tool. These are explicit functional/catalog gaps. Exact glyphs, every hover/disabled/read-only/light/display-scale state, native scaling pointer/modifier/multiselection behavior and whole-product parity remain unqualified. A corrected subset of spacing/focus does not accept the whole menu.
