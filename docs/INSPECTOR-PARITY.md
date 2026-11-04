# Inspector design and behavior parity

Target: actual `/Applications/Pen.app`1.2.21, rechecked in its installed Info.plist on2026-11-02. Full inspector and whole-product parity remain open. The reference is inspected through native UI and the private resource archive recorded in [reference provenance](PEN-REFERENCE.md).

## Selection wrapping —2026-11-04

In the observed unrotated cases, Pen's Add flex layout wraps sibling selections in a numbered frame, infers the flow
from their positions and retains the average nonnegative gap. Two80×60 rectangles at Y0/100
produce an80×160 vertical wrapper with gap40; two160×80 frames give gap20 and160×180.
Horizontal80×60 rectangles at X0/120 produce200×60, and tall80×300 rectangles still choose
horizontal200×300. Three80×60 rectangles at Y0/100/300 give gap90 and80×360. Overlapping
rectangles at X0/60 use gap0 and160×60. These are observed native inspector values.

Owned Pen Save As output establishes the sizing distinction: matching cross-axis bounds
become Fill children and the wrapper fixes that axis. Unequal widths or cross-axis offsets
keep their dimensions while the wrapper hugs both axes. Unequal child frames that already
hug their contents retain their own Hug sizing. Undo restores the original siblings and
clears selection. Open Pen routes its inspector, keyboard and menus through the shared
spacing-aware wrapper, while internal Slot authoring and the portable SDK keep their
existing default. Undo captures sizing before reparenting as well as affected geometry;
a nested Redo regression catches stale Fill inherited from the former parent.

Thirty owner checks/205assertions include the default policy, nested history, child Fill,
retained child Hug and development-server watcher. The two-axis canvas baseline is visually
inspected. Seventeen Chromium/WebKit wrapper, multi-layout and canvas workflows pass without snapshot
updates. The146.6s native accessibility journey requires a presented canvas at File Open and Recent
reopen. It selects two rectangles, wraps them through Add flex layout, verifies Undo/Redo,
resizes width80→120 with both Fill children following, verifies resize Undo/Redo, saves,
closes and reopens the owned file. The reopened120×160/gap40 geometry and unchanged saved
bytes are checked. The native screenshot is visually inspected; exact inspector pixels
remain open. The isolated and normal packages are87.75/81.25MiB; the normal package passes
strict signature verification. Private receipts:layout-wrap-native-physical.log and
layout-wrap-native-reopened.png.
Three cold development-start runs fail before a wrapper action at the unchanged15s test
limit. Running separately from types does not resolve it. Warming the editor entry through
Vite's existing warmup option lets the focused Chromium/WebKit inspector journeys pass;
this development-server change does not establish native startup behavior.

Rotation remains OPEN. For two90° rectangles, actual Pen initially displays180×80/gap60.
After Save As, its native child inspector shows80×80, then the wrapper shows60×80; a screenshot
confirms the narrow wrapper and a child outside it. The saved file retains rotation90,
width80 and Fill Height. Initial geometry, saved format and post-save geometry are distinct
observations. No general rotated-layout renderer correction or exact rotated parity is
claimed from that inconsistent state. Exact inspector pixels and whole-product parity remain
OPEN. Private owned facts/saves are named wrap-* in pen-multi-layout-reference-2026-11-03.

## Multi-frame flex controls —2026-11-04

Actual Pen exposes alignment and gap when any selected frame has a flex layout. Its frame
subset supplies the values: a rectangle plus a stack shows the stack's gap/padding; a freeform
frame plus a stack shows mixed gap and omits padding. Two selected stacks expose the three
distribution choices and paired/four-side padding before Dimensions. Owned Save As output
proves gap12.5 on both stacks and vertical padding20.5 on only the selected stack among a shape.

A separate actual-Pen fixture has a160×100 vertical frame, padding12, retained gap12.5,
Space Around and two40×20 children. Native child-position fields show(12,21) and(12,59).
Open Pen initially places them at(12,17.875) and(12,62.125): its canvas incorrectly adds the
retained numeric gap to distributed spacing. The shared layout correction excludes that gap
from Yoga, saved-size fitting and intrinsic sizing; generated-frame minimum spacing keeps its
existing exception. The installed Pen exporter still emits the gap alongside space-around:
that source observation does not establish equal canvas and HTML pixels.

Open Pen's compact multi-selection composes the alignment grid, variable-aware fields and
distribution choices for its applicable frames. Padding collapse shares the existing binding
and scale preservation logic. Screen-coordinate alignment respects each frame's direction
and retains its distributed mode. A reproduced cancellation defect removes an imported side
field when its last asymmetry disappears; holding the disclosure until commit/cancel corrects
that path while preserving genuine selection/disposal cancellation.

Seventy-two owner checks/288assertions pass. Twelve Chromium/WebKit layout/padding/canvas
workflows and the two-axis canvas snapshot pass; its framing is corrected and both frames are
visually inspected. A broader run records37 passes and one canvas-startup timeout before the
corner interaction; the separate four-workflow recheck passes that corner plus paired multi
padding bindings through Escape, invalid input, deactivation, selection changes and Undo/Redo.
These receipts remain separate. Source/Vue/test types, lint with existing warnings and
architecture pass; final test types/lint/docs/changelog include the binding and presentation
tests. One intermediate test-type run overlaps package regeneration and reports missing
exports; the stable-package repeat passes without a product change.

The304.7s native accessibility journey requires ready surfaces, a delivered frame and no
preparation overlay at File Open and Recent reopen. It edits mixed gap12.5, Undo/Redo,
Space Around, middle-right alignment/Undo, paired padding20.5 and left padding33.25 with
Undo/Redo. Child positions follow the measured distribution and updated padding; the selected
shape remains unchanged. Native Save contains the exact gap/distribution/four-side values.
After close/reopen, the mixed freeform/flex selection omits padding and the restored selection
retains its geometry. Post-reopen checks preserve saved bytes; the inspector screenshot is
visually inspected. Private receipts:multi-flex-native-presented.log and
multi-flex-native-restored.png. The test/normal packages are87.75/81.25MiB; the normal package
passes strict signature verification and both frontend/binary native-test-hook exclusion scans.

The first native attempt reaches its state assertions but fails visual acceptance while the
canvas waits to present. A separate focus probe presents a ready canvas but fails an overly
strict document-focus assertion. The corrected setup focuses the test window at both open
boundaries and checks actual presentation. A two-engine18.7s regression confirms that document
preparation waits while animation frames are paused and clears when they resume. No loader or
presentation-controller product code is changed; neither earlier native attempt qualifies the
final journey.

Exact panel and interactive-overlay pixels, additional mixed orientations/bindings, wrapper
spacing/name/sizing and whole-product parity remain OPEN. Private reference facts and owned
saves are in pen-multi-layout-reference-2026-11-03; named test logs start multi-flex-.

## Multi-selection Hug and authored sizing —2026-11-03

Actual Pen exposes Hug Width/Height when a selection includes a flex frame. The checkboxes
aggregate authored sizing across all selected layers. Rectangles and freeform frames retain
`fit_content(N)` intent without changing their fixed geometry; selected text freezes its
current measured box and saves fixed-width-height growth. Flex frames resize to their content.
Owned reference Save As files establish these distinctions. An Open Pen64×54 Hug export is
also opened in actual Pen and displays both Hug axes correctly.

Open Pen's compact multi-selection now shows those Hug controls, mixed states and frame-subset
flow controls. A selection's Flex Layout label follows its applicable containers. Authored
sizing retains deferred Hug in existing metadata without relaxing the portable Figma sizing
setter; import and supported Pen output preserve that intent. Fill and Hug remain mutually
exclusive per axis. A ratio-locked numeric edit composes both metadata patches so fixing one
axis cannot restore the other's old Hug flag.

Four new browser workflows cover mixed states, independent frame geometry, Fill-to-Hug intent,
Undo/Redo, Pen Save/reopen and flow applied to selected frames among shapes. The final30
Chromium/WebKit inspector/corner/Hug workflows pass after the ratio correction.135 owner
checks/552assertions include deferred sizing on frame/rectangle/text, bare fit_content, portable
setter refusal and the reproduced two-axis metadata regression. Source/Vue/test types, full
lint with existing warnings and architecture pass. Source-only review identifies the ratio
conflict before correction; its follow-up finds no remaining concrete defect.

The physical native journey executes File Open/select-two/Hug Height54/Hug Width64, two Undo
and two Redo actions, Save, Close/Recent reopen and reselection. Mixed freeform/flex states
match Pen; clicking Hug changes retained intent while preserving160×80 geometry, and one Undo
restores prior metadata and clean history. An eight-root selection then applies Hug across
rectangles, freeform frames, flex frames and text without changing any root's dimensions;
text growth becomes fixed. One Undo restores all recorded geometry, text growth and metadata.
The saved file remains byte-identical after the post-reopen checks; the native screenshot is
visually inspected. Private receipts:multi-hug-authored-native-physical.log,
multi-hug-authored-native-restored.png and pen-multi-layout-reference-2026-11-03/facts.json.
The journey passes in191.6s; the normal81.25MiB package builds, passes strict signature
verification and excludes native test hooks.

The earlier eligible-only interpretation is disproved by actual Pen saves and is not shipped;
its194.7s native result does not qualify the corrected model. An initial test assumes original
Hug fallbacks instead of current populated-frame dimensions; reference saves resolve that
assumption without changing the exporter. The ratio test's unsupported .pen ratio-lock save
attempt remains a refusal; that guard is retained. Multi-frame alignment/gap/padding, wrapper
spacing/name/sizing, exact visual variants and whole-product parity remain OPEN.

## Compact multi-selection header —2026-11-03

Actual Pen's two-layer header has an overlapping-outline-square icon, regular11px count,
24px icon slot,40px height and12px left/14px right insets. Collapse is its only inline action.
Open Pen's compact header uses those measured values and the installed Copy glyph; its previous
stacked-layer glyph and mask/Boolean header actions remain only in Advanced properties.

Twenty-six Chromium/WebKit compact inspector/corner workflows pass. The physical native
File Open/two-layer selection/header metrics/collapse/expand/Advanced/Design return journey
verifies40px height,12px left inset,24px icon slot,11px/400 text and a single compact collapse
button. Advanced still exposes Use as mask. Original file bytes, selection, scene version and
empty undo history stay unchanged. The native header is visually compared with the reference;
this does not qualify whole-panel pixels. Private receipts:multi-header-native-physical.log,
multi-header-native-restored.png and pen-multi-layout-reference-2026-11-03/facts.json.
The first browser filter selects no tests; the corrected inspector/corner file run is the
26-workflow acceptance run, with no baseline changes.

Remaining observed multi-layout differences: reference selected stacks show Flex Layout,
alignment, gap distribution, padding and Hug Width/Height. Reference add-layout creates
Frame1 with the existing gap (40 for two80×60 shapes at y0/100;20 for two160×80 frames at
y0/100), zero padding, fixed width and Hug height. Undo restores original nodes and is observed
with empty selection. Open Pen's current wrapper uses zero gap and both axes Hug. These are
recorded gaps, not behavior established by this header unit; full parity remains OPEN.

## Local HTML history —2026-11-03

Actual Pen's history contains the owned exported HTML beside web pages. Selecting its file
entry restores the visible address and Open Folder control; unrelated history is neither copied
nor cleared. Open Pen records completed registered file pages through the same bounded history
and deletion-generation barriers as web pages. Persisted file addresses are locators, not
navigation grants: selecting one calls the editor-only export authorization again, canonicalizes
and validates its visible regular HTML path, and checks existing filesystem deny rules. Query
and fragment are retained. Ordinary typed addresses remain web-only. Deleting a missing history
entry needs no filesystem access and grants no file authority.

The103.7s physical native File Open/select/Export/Close page/history recall/new document/recall
journey executes both same-document and cross-document delivery. Renaming only the owned output
then produces unavailable-file feedback with no child view; removing that one entry retains
the seeded owned HTTP visit. Final Close preserves original source design bytes and both
documents' selections and versions. The1604×2956 export capture contains both checker colors
and the frame background; the restored new-document screenshot is visually inspected.
Seventy-three owner checks/292assertions and11 compiled policy checks pass. The initial test-type
readonly-array mismatch is corrected without changing product behavior. Source review finds
no concrete defect, without qualifying native delivery. Private receipts:
file-history-native-physical.log, file-history-native-{inline,editor-restored}.png and the
owned historyRecall entry in pen-file-browser-reference-2026-11-03/facts.json.
Separate persistent test-app processes execute write565ms/read840ms stages: history survives
process termination, direct file navigation is initially rejected by the fresh registry, and
selecting the saved entry reauthorizes and renders its expected background. Source HTML bytes
and design state remain unchanged. The profile has a dedicated test identifier, with no file
associations or production credentials. Three existing native web-history workflows also pass
in40.8s, including bounded queued visits, loading/deletion and editor-reload persistence.
Normal-build restart, exact history pixels, additional
failure states and full parity remain OPEN.

## HTML file cache reload —2026-11-03

For authorized local HTML, Empty Cache and Reload skips the website-data confirmation and
uses WebKit's end-to-end revalidation, without clearing website storage or cookies. The native
callback checks the live URL, loading and navigation generation immediately before reloading;
this corrects a source-review race between two separately scheduled page checks. The shared
HTTP(S) confirmation/storage path is retained. Files still require the existing export registry.

A108.8s physical native journey exports relative-image HTML, records its original checker and
background pixels, changes only the owned output and image, then clicks More/Empty Cache and
Reload. Without a confirmation, the1604×2956 capture contains14,884 pixels each of the changed
blue/yellow image and4,708,656 new body-background pixels. Close returns to the editor with
source design bytes, selection and version unchanged; the restored editor is visually inspected.
Wrong-live-web and unregistered-existing-file requests are rejected. A separate809ms native
website regression clears current-origin stores/cookies, rejects a stale target and retains the
other origin’s storage. Seventy-one browser owner
checks/283assertions and11 compiled browser-policy checks pass. Private receipts:
file-cache-native-physical.log and file-cache-native-{relative,reloaded,editor-restored}.png.

Actual Pen's file menu closes without confirmation, but a temporary owned output change does
not produce observed changed pixels in that reference page. The output is restored byte for
byte. This qualifies the no-prompt menu state only; reference cache-refresh equivalence,
file history/restart, exact menus and full parity remain OPEN.

## HTML preview file actions —2026-11-03

Actual Pen's Open Folder reveals the exported HTML selected in Finder; Open in System Browser
opens that file in Brave. Open Pen provides the same actions for explicitly authorized exports.
An editor-only command rechecks the registered regular HTML path, canonical location and
existing filesystem deny rules. The shared external-link command remains web/mail only;
file pages gain no application IPC or broader filesystem scope.

The239.1s physical native File Open/select/Export/preview/Open Folder/More/Open in System
Browser/Close journey executes actual Finder and Brave delivery. Only the owned Finder window
and new browser tab are closed. A1604×2956 preview contains14,884 pixels of each checker color
and4,708,656 frame-background pixels. The restored editor is visually inspected. Source bytes,
selection and document version remain unchanged, with no ZIP or copied assets. The native
bridge rejects HTTP and an existing unregistered HTML path before opening anything.
Seventy browser owner checks/282assertions,11 compiled policy checks, source/Vue/test types,
full lint with existing warnings and architecture pass. Source review finds no concrete defect;
it does not establish the OS handoffs. Private receipts:file-opener-native-physical.log,
file-opener-native-inline.png, file-opener-native-editor-restored.png and
pen-file-browser-reference-2026-11-03/facts.json. File-specific cache, history, restart,
remaining menu geometry and whole-product parity remain OPEN.

## Standalone HTML body background —2026-11-03

Ten owned actual-Pen exports establish the body rule: one selected frame promotes its first
visible opaque solid paint. A rectangle, empty frame, gradient, translucent first paint or
multiple selected roots does not supply a body color. A later opaque paint does not replace
a translucent first paint; a disabled first paint is skipped. Overall node opacity does not
change the promoted color. The extra raw color-paint `opacity` probe is ignored by the reference
reader and does not establish editable paint-alpha behavior. All preferences are restored;
an incidental owned image-fixture nudge is undone toY0 without saving or changing its file.

Both standalone export styles use the measured rule. Fragment and multi-root output retain
their prior behavior. Two initially failing owner journeys pass with34assertions, and the
broader export/domain set passes167checks/622assertions. New Chromium/WebKit browser checks
render a single frame and inspect the actual body color. The initial browser run records a
missing-module failure caused by rebuilding shared package output during the run; the repeat
holds those files stable and passes all20journeys. Source/Vue/test types, full lint
(existing warnings), architecture and documentation checks pass.

A49.6s physical native File Open/select/Export/automatic preview/Close journey captures1604×2956
with4,708,656 background pixels and14,884 pixels of each checker color. The native page is
visually inspected; source bytes, selection and version stay unchanged. Private receipts:
pen-html-body-reference-2026-11-03/facts.json, code-body-native-physical.log and
code-body-native-inline.png. Components, instances, groups, additional paint combinations,
exact exported page pixels and full parity remain OPEN.

## HTML image paths and settings —2026-11-03

Actual Pen exports the owned two-image fixture as ordinary HTML in relative and absolute modes,
referring to the original `images/checker.png` or its canonical file URL. It creates no ZIP or
copied asset directory. A chosen destination in another folder still retains the repo-relative
path; the reference does not rebase or copy that image. Its preferences are restored afterward.

Open Pen's desktop Code menu offers those two path modes and embedded assets. Browser downloads
retain their ZIP option. Retained source/hash pairs belong to each image paint, so same-byte
fill/stroke paths and paint removal/reordering keep their own identity. Replaced image bytes or
unavailable/nonlocal source identities fall back to embedding. Absolute paths encode literal
percent signs and special filename characters. No additional file reads or scopes are introduced.

The measured settings popup is264px wide with12px padding,20px left offset, end alignment and
10px collision padding. Checkbox labels are10px, controls16px, with6px row gaps. Assets labeling,
neutral checkboxes, reference ordering and enabled Center without scaffold are implemented and
visually inspected in the native app. Exact cross-theme pixels remain unqualified.

A154.7s physical three-mode export/open/Close journey preserves source bytes, selection and
version; relative capture contains14,884 pixels of each fixture color. Its repeated observer
reports stale counters for later loop iterations, so those counters do not qualify those modes.
Independent88.4s absolute and35.3s embedded native runs each capture1604×2956 with14,884 pixels
of both colors and return to the unchanged editor. All three saved PNGs are independently decoded.
Sixteen Chromium/WebKit HTML journeys and169 owner checks/510assertions pass. Source/Vue/test
types and architecture pass. Touched-source typed lint passes; full lint reports nine findings
in unchanged browser owners, retained in code-assets-lint-final.log. No full lint pass is claimed.
Source review reproduces percent-path and identical-byte source collisions before correction;
removal/reordering and mutation-isolated copying have regression coverage.

Private receipts:pen-html-assets-reference-2026-11-03/facts.json,
code-assets-native-physical.log, code-assets-native-absolute-fresh.log,
code-assets-native-inline-fresh.log and code-assets-native-{relative,absolute,inline}.png.
The selected-frame body background still differs (white versus the reference frame color).
Multiple image paints, arbitrary image backgrounds, source-path interchange, OS clipboard,
file-specific browser menus/history/restart and full parity remain OPEN.

## Automatic internal HTML preview —2026-11-03

Open in Browser after Export defaults on for embedded HTML. A successful native save opens
that file in the existing internal browser. Turning the preference off retains delivery
without creating a browser. The exporter returns a save result and native path; preview
follows delivery rather than a guessed filename. Each workspace keeps its authorized export
addresses in memory and ignores late preview opening after disposal.

Native authorization requires a regular, visible absolute HTML file and checks its canonical
location against existing filesystem deny rules. Ordinary address entry remains web-only;
file navigation and picker/import replies require an explicitly authorized address. Browser
pages gain no app commands, and native capabilities/filesystem scopes stay unchanged. External
ZIP delivery currently disables preview with an embedded-assets explanation. Loose assets and
the exact reference settings layout remain open.

The213.1s physical native File Open/select-two/Export/automatic file-page/pixel-inspection/Close
journey preserves document version and selection. Its1604×2956 capture has39,042 blue and14,560
pink fixture pixels, establishing rendered content rather than exact reference pixels. The179.4s
native action journey executes Reload, element picking, selected editable import, native Undo,
full390×844 Phone import, Undo to clean state, Close and an unchecked-preview export. The owned
file page cannot invoke export authorization, read the source through filesystem IPC or fetch
an adjacent private text fixture. These are bounded probes, not a complete security audit.
Original design bytes remain unchanged.

Selected import retains the existing121×81 outward-rounded wrapper and verifies its inner
120.5×80.75 blue child. No import-rounding change ships; reference selected-import pixels are
not qualified. A126.3s native receipt regression executes adjacent HTML replacement, link
refusal, Ask where/Cancel/chosen Save and a real121×81 PNG Save through shared delivery.
A separate20.5s unsaved-design check cancels Save with preview enabled by default: no browser
opens, source identity stays null, and selection/version remain unchanged. Its initial run
times out during the manual selection stage; the repeat executes the complete path.

Eighty-five browser/export domain checks/304assertions,11 compiled browser-policy checks and
16 Chromium/WebKit HTML journeys pass. Source review catches file reply validators and a
canonical hidden-folder alias inconsistency before correction. Earlier native failures remain
recorded: a future WebDriver call loses its window after child creation, and an unsupported
fractional-wrapper expectation ends the first action run. The repeat keeps validation in one
live observer, closes the child before returning and checks retained inner geometry. A test-only
implicit argument type is corrected.

Private receipts:code-preview-native-recheck.log, code-preview-actions-native-recheck.log,
code-preview-receipt-native-physical.log, code-preview-cancel-native-recheck.log,
code-preview-native-page.png and restored-editor images.
Loose/absolute assets, ZIP preview, exact settings, file-specific More/history/restart states,
OS clipboard and full parity remain OPEN.

## Code export destinations —2026-11-03

Code HTML uses`<document-base>-export.html`. Desktop Ask user where to export file defaults
off: a saved local design writes beside its source; enabling Ask where uses the existing
Save dialog. An unsaved design falls back to Save with`Untitled-export.html`. Other export
callers retain their existing destination policy. External HTML bundles keep their ZIP
delivery. Automatic paths use the existing scoped filesystem writer and refuse detected
links/directories; no native permission or filesystem scope is widened.

Sixteen Chromium/WebKit HTML journeys pass, including the document-based download name.
Eighteen file-delivery, bundle and canonical watcher-owner checks/41assertions pass. An81.8s
physical native journey replaces a stale owned HTML export beside its design, refuses a
test link targeting the source without changing its bytes, enables Ask where, checks the
suggested filename, cancels without output, then saves to a chosen filename. The document
version, selection and original source bytes remain unchanged. A separate32.3s native
unsaved-design journey observes the fallback Save filename and cancellation without
creating a document source or changing selection/version. Final native images are inspected.

The first native automatic export exposes a restricted`exists` permission and is rejected;
that failure remains in code-destination-native-physical.log. The correction uses already
permitted`lstat` metadata, with no capability changes. An initial broader legacy unit run
also retains an unrelated stale file-watch expectation; the canonical watcher-owner checks
pass, and no whole-unit-suite result is claimed. Private successful receipts:
code-destination-native-recheck.log, code-unsaved-native-physical.log,
code-destination-browser.log and code-destination-owner-corrected.log.

Automatic internal-browser opening, absolute/loose asset delivery, exact settings geometry,
themes and every remaining export state remain OPEN. These destination checks do not
qualify complete HTML export or whole-product parity.

## Multi-selection Code continuation —2026-11-03

Actual Pen exposes Code for a two-frame selection. An owned native HTML export contains
both named roots in a260.25×80.75 relative wrapper, with positions0/180 and individual
sizes120.5×80.75/80.25×45.5. Reference export preferences are restored after measurement.
Open Pen now passes a snapshot of all selected IDs to its existing HTML renderer and
selection exporter. Single-layer callers use the same component. Compact selection colors
remain in Advanced properties, matching their absence from the observed compact reference.

Sixteen Chromium/WebKit journeys execute single/multi HTML export, both style modes,
fragment/scaffold and annotation settings, rendered external ZIP output and a captured
clipboard handoff. The clipboard boundary is mocked; this does not establish OS clipboard
delivery. The61.5s physical native journey executes File Open, two-layer selection,
Export HTML and the real Save panel. The saved file includes both selected roots and
excludes the third, with unchanged document version, selection and clean state. Its final
native screenshot is inspected. Private receipts:code-multi-clipboard-corrected-browser.log,
code-multi-native-recheck.log and code-multi-native-final.png.

The earlier native journey saves the correct file but fails its final manual-inspection
barrier after a context continuation; that failed result is retained. The repeat removes
that unnecessary barrier and captures the native WebView screenshot before process exit.
An additional owned actual-Pen fixture selects children under different parents in reverse
order. Its exported roots retain selection order and their local coordinates, omitting
ancestor translation and rotation. Open Pen's existing renderer shares those limitations;
the new browser checks assert the measured behavior. Initial canvas-fidelity expectations
and a speculative shared-exporter correction are rejected after this native comparison;
no Core or DOM/CSS exporter change ships in this unit.

With Ask user where to export file off, actual Pen writes beside the source design using
`<document-base>-export.html`. Open in Browser after Export opens its internal Browser View
at that file URL. No reference preferences change during this observation, and closing
Browser View returns to the owned canvas. Open Pen's corresponding preferences, default
destination/filename, actual OS clipboard delivery and exact settings/panel pixels remain
OPEN. No inert settings are added and full parity is not established.

## Container geometry

The extracted reference layout uses a221px panel,8px right/bottom window insets and58px desktop top position. Its island rim paints without occupying layout width. Native screenshots show the corresponding placement. The old independent container is220px with an outer border and an additional sidebar border, and places the panel6px lower and8px farther from the right/bottom edges. Those three border pixels plus the width difference reduce Context to187px rather than191px.

The desktop floating container now uses221px width and the measured placement. PropertiesPanel keeps the classic sidebar divider when it is used as a sidebar. An overlay pseudo-element paints the island rim without taking space from controls or intercepting input. The first inset-shadow-only experiment is rejected: an opaque child covers its rim. Native edge pixels in that experiment remain39/39/42, identical to the interior; the final overlay gives55/57/63 at the edge and39/39/42 inside, matching reference rim#A0B2CC21 over the panel background. The earlier images are retained privately in inspector-geometry-before-ring/.

The first native sizing probe fails to find a desktop inspector because the driver treats the requested1496×932window size as physical pixels: the measured content is748×466 at2× scale. The calibrated probe uses the observed ratio, then measures a1496×932content viewport at2×. It asserts the literal independent-reference rectangle{x:1267,y:58,width:221,height:866} and Context width191px. The corrected native probe passes before and after the rim fix. Private evidence:inspector-geometry-native.log, inspector-geometry-native-calibrated.log, inspector-geometry-native-overlay.log, inspector-geometry-edge-comparison.json, native-inspector-geometry.png and native-inspector-context-geometry.png. These results qualify the named container geometry and rim samples, not every row or all panel pixels.

## Remaining shared row design

The measured reference section pattern uses16px/14px horizontal insets,8px top padding,22px headings,6px content gaps and15px bottom padding when content exists; empty sections use8px bottom padding. Titles use11px medium type and the dark panel foreground#C8C8C8. Its Dimensions sublabel uses9px/12px typography with4px bottom margin. Before the shared-row continuation below, the independent shared section uses12px insets,32px headings and12px bottom padding. The container-only correction does not close those gaps.

Before the shared-row continuation, the calibrated native rectangle inspector records Alignment y175/h69, Position y244/h99, Layout y343/h121, Appearance y464/h69, Fill y533/h73, Stroke y606/h45, Effects y651/h45, Code y696/h105 and Export y801/h101. These are observed Open Pen values, not accepted Pen matches. Full type/selection/mixed/disabled/light/hover/menu and adaptive states remain open. Context's separately executed control behavior is recorded in [Context parity](CONTEXT-PARITY.md).

## Inspector web-import entry

Actual Pen's Code section includes Import Web via Browser. On the owned synthetic selection with the saved Coding Mode preference enabled, the native action opens the browser's import landing screen and Coding Mode, with address entry, element/full-page reproduction, screenshot and exit/close controls. No URL is chosen and no page is imported. Closing Browser View restores the reference canvas; the owned rectangle is removed, original runtime/missing-source nodes are verified, and native File→Save returns the fixture to clean state. Existing browsing-history content is not copied into product data or documentation.

Before the inspector-entry continuation below, Open Pen's Code section lacks this action. Its existing Browser preview controller and DOM importer are partial implementation building blocks; opening an ordinary split preview does not qualify the reference Coding Mode/landing workflow. This remains an explicit functionality and design gap. No inert button is added.


Final container qualification:16 browser Context/HTML/rename/history/fractional-layout/zoom-center workflows pass after the overlay fix, exercising clicks beneath the decorative layer. Source/Vue/test types, lint(existing warnings), architecture, docs/changelog and rebuilt normal/native-test packages pass. Strict normal signature and test-hook exclusion pass. Source-only review identifies the covered-ring defect before correction and finds no further concrete defect afterward; it is not independent runtime proof. The main installed app/profile/recovery remain preserved. No new CSS-only tests or snapshot baselines are added.


## Shared-row continuation —2026-11-02

A feature theme now applies the measured section pattern to compact selected-layer inspectors using the existing public header/content/item slots. Generic PanelSection, unselected document and Frame-presets styles remain in their owning paths. The layer-name field uses compact typography and padding, the selection-action wrapper avoids a duplicate divider, and Context's divider is moved to the measured section boundary. The Dimensions sublabel uses9px/12px type. Code action buttons use24px height and equal widths; those shared button styles also apply in Advanced mode. Their existing export/copy behavior and preferences stay in their existing owners.

The first native repeat correctly reports Alignment/Position but exposes Layout2px too tall and Fill4px too tall. The size-checkbox margin is corrected from8px to the measured6px. The paint row uses the SDK's public `item` slot after `as-child` merging; targeting the inner `item-row` slot has no effect because the wrapper owns the final attribute. Removing only the compact row padding then gives the expected24px paint row. Private logs:inspector-rows-native.log and inspector-rows-padding-native.log.

The final native observer asserts reference-derived literal bounds for the owned rectangle: Alignment y169/h76, Position y245/h106, Layout y351/h114, Appearance y465/h76, Fill y541/h76, Stroke y617/h39 and Effects y656/h39. Each visible section heading measures11px, weight500 and RGB200/200/200. The container remains{x1267,y58,w221,h866}; Context remains191px wide. The zoom offset is adjusted with the new container geometry, retaining an observed8px gap. Native probe:inspector-rows-zoom-native.log; images:native-inspector-rows.png and native-inspector-rows-context.png. The native setup uses owned SceneGraph factories; measurements observe rendered WebView controls. No drag/edit/menu workflow is implied by these measurements.

Code now begins at the reference-derived y695. It remains106px high and Export begins at801 because the30px web-import action and its Coding Mode behavior are missing. No inert action is added to fill that space. Exact header layout, remaining input/background colors, exact glyph/bitmap identity, other node types and all untested selection/hover/light/adaptive states remain open. The expanded browser regression passes55 workflows in3.8m, including compact Fill/Hug/size editing in both engines, Context, fractional layout, Script source/input/reference/history/conversion paths, compact image/PDF export, effects/stroke controls and zoom-center behavior. This targeted run does not reclassify the earlier broader failed runs. The normal package builds, passes strict signature verification and excludes native test hooks. Source/Vue/test types, lint (existing warnings), architecture and test placement checks pass. Final native screenshots are visually inspected; this does not establish exact whole-panel pixels.


## Inspector collapse — 2026-11-02

Actual Pen's header button hides every section below the title and restores them on a second click. Native single- and multi-selection checks execute this action. Collapse survives changing the selected layer and clearing/reselecting it; the inspector disappears with no selection. The resource facts identify the standard panel-right/panel-right-open glyphs. The reference fixture's original nodes and expanded single selection are restored without document edits.

Open Pen now exposes a named, keyboard-accessible header toggle in the floating compact inspector. It retains the existing property subtree and disclosure state while hidden. Workspace-owned collapse state follows selection changes, and comments, history, Frame presets and Advanced views keep their full-height surfaces. The collapsed dock is40px tall and no longer displaces the bottom zoom controls. Existing expanded multi-selection actions are preserved after source review flags an unintended removal; their exact reference arrangement remains open.

The new single-selection browser regression first fails in both engines because the toggle is absent. The implementation then exercises collapse, retained Context, clear/reselect, keyboard restoration and document Undo; a second workflow exercises multi-selection. An initial retention assertion incorrectly reads Context from a helper that does not project it; it is corrected to observe the rendered field. One22-check run records21 passes and a WebKit blend-menu failure, selecting Color Burn instead of Multiply. Three focused WebKit repeats pass; that does not erase the failed run or prove the intermittent menu issue absent. The final26-workflow Chromium/WebKit run passes, including the viewport zoom-center checks and preserved expanded multi-selection actions; the earlier failed run retains its status.

The native check first uses an incorrect Context fixture property, then an invalid plugin-data helper argument; those setup failures and a manual-barrier timeout are retained. The corrected fixture asserts its initial rendered Context and waits for observed UI state instead of marker timing. Physical native click, focus by layer-name→Tab and Enter restore pass. The observer asserts{x1267,y58,w221,h40}, zoom right inset8px, expanded height866px, retained Context, unchanged selection and unchanged document version. The initial Return without button focus has no effect and is not accepted as keyboard delivery. Final native images are visually inspected. Private receipts:inspector-collapse-native.log, inspector-collapse-native-initial.log, inspector-collapse-native-fixture-error.log, inspector-collapse-native-barrier-timeout.log, native-inspector-collapsed.png and native-inspector-expanded.png.

Source/Vue types, the canonical test-type check, lint(existing warnings) and architecture pass. Direct whole-test TypeScript invocation also exposes environment-type conflicts; the repository's canonical test-type runner is the accepted boundary. The normal79.34MiB package rebuilds, passes strict signature verification and excludes native test hooks. This closes the named collapse journeys, not cross-document persistence, every history/mobile/Advanced interaction or exact header and whole-panel pixels.


## Inspector browser entry — 2026-11-02

Import Web via Browser now toggles the existing native desktop browser from Code. Calibrated native measurement asserts Code y695/h136, adding the reference30px action; physical open/close preserves document version and selection. Three native preview checks and one editable-import journey pass through this entry, including real capture/Undo, editable text/image import, rejection without mutation and FIG disk reopen. Actual Pen remembers its browser page and mode; the first observed Coding Mode state is not a forced entry behavior. Open Pen's Coding Mode, remembered page, landing/toolbar design, responsive import layout and exact whole-panel pixels remain open. The14-workflow browser regression, source/Vue/canonical test types, lint(existing warnings), architecture, normal79.34MiB package/signature/hook checks pass; see BROWSER.md.


Coding Mode continuation2026-11-02: the inspector browser entry now participates in qualified split/expanded transitions, retained mode choice and real loaded-page history across Mode changes. Six native preview/import checks, physical mode geometry and39 browser regressions execute; see BROWSER.md for the corrected sidebar quantization/inset evidence and limits. Remembered page after closing, landing/toolbar design and other states remain open.

Remembered-browser continuation2026-11-02: the inspector entry now reloads its last loaded page and viewport after closing, with native child teardown and unchanged document state. Six preview checks, separate editable-import/FIG reopen and physical close/reopen/final-close execute; see BROWSER.md. This does not establish exact landing/toolbar design, cross-close page state or full inspector parity.

## Compact transform and opacity glyphs —2026-11-03

The REA-verified private Pen1.2.21 editor bundle identifies Lucide Angle for rotation, Scan for uniform/independent radius and the two Triangles Centerline glyphs for flip controls. Its horizontal action uses the horizontal-centerline stock name, and its vertical action uses the vertical-centerline name; those reference mappings are retained. The numeric icon slot is16×16px; reference CSS uses one-pixel strokes independent of scaling. Open Pen uses its installed ISC Lucide assets and independently reconstructed square/arrow rotation and square/diagonal/30%-shade opacity geometry through its existing mask helper. Reference files stay private; installed stock assets and new geometric masks comprise the implementation.

Actual Pen's opacity-glyph click selects100 without opening a menu, and its layer opacity field omits a percent suffix. The compact row now follows that pattern; layer-blend controls remain in Advanced. The reference clockwise quarter-turn displays-90°, then Undo/Save restores the owned mixed fixture's original positions and zero rotation. Private facts: pen-compact-inspector-icon-reference-2026-11-03.json. Other Pen documents and the main Open Pen profile remain untouched.

Twelve compact Chromium/WebKit journeys pass, including opacity50/Undo, Advanced Multiply/Undo, return through Design properties, radius12/Undo and clipping. The preceding22-check run has20passes/two failures because its second Advanced command did not return to Design; the corrected test uses the observed menu contract. All ten fractional position/size journeys in that run pass. The isolated physical native journey executes opacity100→50→Undo, radius3.5→7.25→Undo, clockwise rotation0→-90→Undo and both flip flags/Undo, restoring exact original geometry and the saved state. The final native screenshot is visually inspected. This qualifies those controls, not pixel identity for the whole inspector.

Earlier native attempts remain retained: the section selector incorrectly requires an explicit region role despite the named HTML section's implicit role; the added selection-ready predicate alone does not fix it. After correcting the selector, the test's guessed positive quarter-turn expectation is contradicted by actual Pen; the isolated owned fixture is undone and that exact test process is stopped before repeating with-90°. Receipts: inspector-glyph-native-physical.log, inspector-glyph-native-physical-final.log, inspector-glyph-native-physical-section.log and inspector-glyph-native-physical-reference.log. Source review's initial flip-glyph concern is resolved by the actual reference mapping; no further concrete source defect is found. Degree-suffix spacing, expanded/multi corner controls, exact remaining glyph/style states and full parity remain OPEN.

The successful physical journey takes131.6s including operator barriers. Source/Vue/canonical test types, structure lint with existing warnings, architecture, documentation/changelog and staged secret checks pass. The normal81.19MiB candidate builds, passes strict signature verification and excludes detected native-test frontend/executable hooks. It is not installed over the main application.

## Corner disclosure and transactions —2026-11-03

Actual Pen's native single/multi corner toggle is a disclosure: the uniform radius remains visible,
four curve-glyph fields appear in TL/TR/BL/BR order, and one toggle opens or closes them. On two
owned rectangles, physical edits7.25/3.5/4.25/5.75 apply to both. Save writes
`[7.25,3.5,5.75,4.25]`, in TL/TR/BR/BL format order. Collapse preserves those arrays without
editing the document. Four Undo actions and Save restore the reference's original omitted/default
zero radii and original geometry. A later disclosure-only native check leaves it collapsed again.
Private receipt:pen-expanded-corners-reference-2026-11-03.json.

Compact Open Pen now uses SDK-owned manual disclosure, effective single/multi corner values and
the four curve glyphs. The default SDK/Advanced policy remains selection-derived. Disclosure
does not convert geometry or bindings; actual literal edits use the shared corner conversion and
owned node-preview transaction. A uniform literal unifies all corners and clears only corner
bindings. A per-corner literal detaches only that corner while retaining the other bindings,
their scales and unrelated paint bindings. Binding-aware cancellation restores the owner preview
before provider rollback, then releases the original targets at the numeric terminal event.
Selection-keyed field subtrees cancel an old interaction before accepting a new target.

Twenty compact corner/inspector Chromium/WebKit journeys pass, including single and mixed
multi-selection, disclosure without document history, uniform Mixed-to-literal editing,
Escape/invalid input, retained-panel deactivation, selection changes, one-step Undo/Redo and
actual downloaded `.pen` save/reopen. Twenty-two owner checks with92assertions pass. Earlier
six-pass/two-failure and settled-selection two-failure browser runs are retained: the Advanced
uniform grid originally did not unmount on selection changes, leaving its whole-radius binding
detached. The selection key corrects it. Source review also catches a conditional Mixed-to-number
field replacement that cancels its own draft; keeping one binding-aware field corrects that case.

The isolated native133.8s physical journey passes File Open, two-node selection, disclosure,
all four individual edits, collapse, Save, four Undo/four Redo actions, Close, native File Open,
reselection and disclosure with exact saved values. Its final screenshot is visually inspected.
Private receipt:compact-corners-native-physical.log. Degree suffix placement is also inspected
after changing the rotation field's value flex behavior. This does not establish exact whole-panel
pixels or every selection/type/binding configuration. The observed multi-selection Layout still
differs: Open Pen shows Spacing where Pen offers Fill Width/Height, and multi-selection Code
actions/header arrangement remain open. Full design and functionality parity remains OPEN.

Eighteen existing corner/smoothing/polygon/stroke-toggle and retained-panel behavior journeys
also pass with snapshot assertions explicitly disabled. Their Advanced-only expectations now
select Advanced properties rather than assuming it is the default. A separate current-source
visual run still fails the old shared-token image:230×174expected versus221×175actual,
2,789different pixels. Both images are inspected; the earlier sidebar geometry, binding-pill
style and corner glyph differ. The baseline is not updated. The initial broader run retains its
six passes/four failures/eight not-run status; it is not reported as a green full visual suite.
Receipts:compact-corners-existing-regression.log, compact-corners-existing-functional.log and
compact-corners-existing-visual.log.

Source/Vue and canonical test types, lint with existing warnings, architecture, docs/changelog
checks pass. The normal81.19MiB package builds and passes strict signature verification;
the inspected normal frontend and executable have no detected WDIO test hooks. The separate
native-test package is87.68MiB. The main installed app, user profile and recovery data remain
untouched. These checks qualify the named corner behavior, not full design or functionality parity.

Fill continuation2026-11-03: compact multi-selection now offers mixed Fill Width/Height and omits
the inherited Spacing row; Advanced retains spacing. Single and multi dimension edits retain
Fill and update numeric fallbacks, correcting the earlier independent numeric-clear behavior.
Binding-aware dimensions and selection-keyed fields preserve aliases/scales on cancellation;
multi-frame clipping appears in Appearance. Twenty-six browser journeys,25owner checks/139assertions
and a197.1s physical native Fill/mixed/edit/history/clipping/Save/Close/Open journey pass. The final
native screenshot is inspected. Multi flow/Hug/add-layout, Code/header, mixed paint text/selection
colors and exact remaining visuals remain open. See [layout evidence](LAYOUT-PARITY.md#fill-fallback-editing-and-multi-selection-2026-11-03).
