# Named icon comparison

Reference: `/Applications/Pen.app` 1.2.21. Full icon and product parity remain open.
Vendor captures and resource measurements stay in ignored `local-evidence/`;
the implementation uses the existing independent editor and public icon providers.

| Contract | Reference evidence | Open Pen status |
| --- | --- | --- |
| Glyph and family | Native Lucide inspector has separate 24px rows, 6px apart, below Fill | Separate compact selectors; ordinary Fill owns authored icon paint. Advanced retains detach and legacy controls. |
| Families | Shipped controls list Material Symbols Outlined, Rounded, Sharp, feather, lucide and phosphor | Same choices and ordering; existing custom families remain available for their selected icons. |
| Family change | Controlled reference API retains the glyph name even when the destination family lacks it | Retains name, dimensions, frame identity and paints; missing artwork remains an empty named icon. |
| Weight | Shipped Material control is one 24px range/numeric field, 100–700 in steps of 100, default 200 | Uses the shared number field; Material outlines change in place, preserving child identities and authored paints. Modified glyphs require reset. |
| History | Reference control behavior is not exhaustively qualified | Owned asynchronous previews coalesce typed edits and paused scrubs, cancel synchronously, ignore late results and settle before Undo/Redo. Browser and SDK evidence below. |
| Persistence | Pen owns named icons across its supported libraries and sizes | Named export accepts six mapped libraries at verified positive source sizes, including centered rectangular boxes, with Material weight and strict drawing/paint checks. Identity references, unsupported axes and altered drawings are refused. Evidence and remaining scope are below. |

## Evidence boundaries

Fresh native reference observation establishes the Lucide rows and absence of a separate
Icon color or weight row. Read-only shipped-resource inspection establishes the family
choices and weight control parameters. A controlled document API probe establishes that
switching families retains the glyph name; that API document did not update the selected
native inspector, so it does not establish a physical family-menu interaction.

An owned Material reference document opens in actual Pen and draws `home`, but has no
selection. Native reference weight editing and exact paired control pixels remain open.
No vendor implementation or assets are included in the application.

The browser weight workflow uses a checked-in public Material font fixture. It checks actual
outline changes, a multi-value typed edit undone in one step, focus-only typed cancellation,
paused pointer dragging, Escape preserving selection and Redo, and stable glyph identities.
The canvas snapshots cover the final 700-weight glyph without unrelated profile UI.

SDK tests cover delayed-provider cancellation, selection changes, disposal, independent
history batches, external metadata edits and Undo during a held preview. These establish
owned edit behavior; they do not establish OS keyboard delivery or full native parity.

## Selector and weight-control checks — 2026-11-04

- 1,049 editor/icon/SDK tests pass with 4,638 assertions; the final focused rerun passes
  45 tests with 174 assertions. An independent reviewer repeats the focused owner checks.
- 39 Chromium/WebKit application checks pass without snapshot update, including existing
  keyboard-layout history, glyph picker, Fill, toolbar placement, Save/reopen and numeric fields.
  Both new canvas baselines are visually inspected.
- Three isolated native WebView checks pass. The Material case loads the public provider's
  64px `home`, changes 200→400→700, ends the input session, and restores exact path geometry
  and child identities through native-menu Undo/Redo events. The other cases retain painted
  icon pixels and Lucide color Save/Recents reopen. The final inspector capture is inspected.
  Focus, input and Enter are DOM-delivered because the embedded driver's click/key delivery
  does not open/commit this field. Physical OS input and menu clicks remain unqualified.
- Source/Vue/test types, scoped lint, architecture, documentation, translations and changelog
  checks pass. At this selector unit, full repository lint reports existing icon-writer return-contract and
  DOM/CSS conditional diagnostics. The separate native-test type gate reports older driver
  contract errors outside this icon spec; it is not reported as passing.
- Native-test/normal bundles build at 87.75/81.25MiB. The normal bundle passes strict signature
  verification and excludes native-test hooks from its frontend and executable. The main
  installed app and user profile are not replaced.

## Named export and exact redraw — 2026-11-04

The writer reuses the import library mapping for Lucide, Feather, Phosphor and the three
Material Symbols families. It retains supported Material weight while refusing other font
axes that `.pen` cannot represent. Exact drawing and path checks remain in force. Original
square source sizes are supported in this first export unit. The rectangular-source extension
below retains centered geometry; runtime resize rebasing and zero-size export remain open.

A native 64px edit/reopen initially exposes outline differences of about 0.001 scene units:
the editor asks the font provider for 64px outlines, while the file loader asks for 24px and
scales them. The shared Material provider now quantizes once at 24px and scales that network.
The actual-font edit→export→reopen check passes across five sizes and three weights without
relaxing geometry equality. A new 64px canvas baseline covers the changed drawing path;
the existing 24px baselines are unchanged.

Two export-loss cases are explicitly guarded. Incompatible legacy raw-alpha paints are
refused; authored Fill alpha remains supported. Original library/name/weight references are
retained in validated content metadata through reset, merged descendants, synchronization and
FIG, and `.pen` export refuses them rather than replacing them with resolved literals.
This retention does not implement live identity bindings. The nested override correction below
extends loading and inspector identity; icon-instance export is not accepted here.

Executed evidence:

- 1,801 format, icon, Scene Graph and DOM/CSS component tests pass with 12,052 assertions.
  Independent review repeats the actual-font cases and confirms the alpha/reference guards.
- 20 Chromium/WebKit checks pass without snapshot update, including normal Save/Open at 24px
  and 64px. The new 64px capture is narrowed to the glyph region, visually inspected and
  repeated in both engines without update: two further passes.
- Three isolated native checks pass, including 64px weight edit/Undo/Redo, Save, independent
  saved-field inspection, close/Recents reopen and exact restored outline equality. Programmatic
  focus/input/Enter and native-menu events retain the physical-delivery limitation above.
- Actual Pen opens the independently exported 64px `home` at weight 700. Its node fields,
  screenshot and PNG export are observed; REA/Hopper captures the matching native window with
  7,811 untruncated accessibility nodes and the unchanged reference executable hash.
  The standalone PNG bounds differ: Open Pen's full icon box is 128×128 at 2x, while Pen exports
  a trimmed 95×103 glyph. This is an open export-design discrepancy, not a pixel match.
- Source/Vue/test types, full repository lint with existing warnings, architecture, docs and
  changelog checks pass. The separate native-driver type gate retains older failures outside
  this icon spec. Normal/test bundles build at 81.25/87.75MiB; strict normal signing and
  frontend/executable test-hook exclusion pass. The installed main app remains untouched.

Private receipts: `local-evidence/icon-export-2026-11-04/`.

## Nested icon overrides — 2026-11-04

A weight-only descendant override previously missed asset preloading. Its glyph could be empty,
and the occurrence's identity could retain the definition's weight even when the correct artwork
was available. The reader now discovers exact requests from resolved descendants, loads each
unattempted variant once and rebuilds the private graph before returning it. Occurrences take
their identity from the selected icon component while retaining their authored paints and
original reference markers. A failed provider retains the requested identity with empty artwork;
it does not silently substitute another weight or retry a failed request.

The actual-font fixture draws a 200-weight template and a 700-weight occurrence. Core checks
verify both exact provider requests, the 700 outline, synchronization and FIG retention of the
resolved identity, drawing and original `$weight` marker. The unavailable-provider case checks
one attempt per variant and retained weight/paint after synchronization. Chromium and WebKit
open the fixture through File/Open and check both inspector weights and distinct artwork.
An isolated native WebView repeats the selection/inspector checks with both glyphs present;
fixture loading and selection are programmatic, so physical OS delivery remains unqualified.

Final checks: 1,742 owner tests pass with 11,803 assertions; independent review repeats 25 tests
with 213 assertions. All 22 icon/toolbar Chromium and WebKit workflows pass without snapshot
update, including the inspected paired-glyph baselines. The isolated native check passes.
Source/Vue/test types, repository lint with existing warnings, architecture, docs and changelog
checks pass. The normal 81.25MiB bundle passes strict signing and excludes test hooks. The
separate native-driver type gate retains 67 errors outside the new icon-instance spec.

Actual Pen opens the same fixture and exports both 100px frames at 2x. Both applications produce
200×200 images with matching foreground bounds. Exact pixels still differ: 571 of 40,000 pixels
for the template and 699 for the occurrence, with maximum channel differences of 67 and 76.
The cause of those edge differences is not established. This is a measured remaining visual gap.

Private receipts: `local-evidence/icon-instance-identity-2026-11-04/`.

## Rectangular source boxes — 2026-11-04

Save previously refused a rectangular icon that Open could already draw. The writer now accepts
finite positive source dimensions when every derived path occupies the centered square at the
smaller dimension. Exact drawing, glyph, path, paint and binding checks remain in force; arbitrary
resizes, point changes and misplaced glyphs are still refused.

All six mapped families pass square, wide, tall and fractional source writer checks. The actual
Rounded font reopens with exactly the same centered geometry and authored alpha paint across
three rectangular dimensions and two weights. A normal browser File/Open→Save→Open journey
checks both dimensions and geometry for wide and tall icons, with inspected canvas baselines in
Chromium and WebKit. Five isolated native checks pass, including 64×64, 96×40 and 40×96 Material
weight changes, Undo/Redo, Save, independent saved fields and close/Recents reopening with exact
geometry. Input and menu events retain the programmatic-delivery limitation above.

Independent review repeats 48 focused tests with 325 assertions and verifies that a runtime
width stretch remains refused. Some fractional boxes reopened through FIG are also refused:
float32 storage can shift the path offset away from the exact source-centering check. This
precision boundary remains open; the guard is not relaxed to hide it.
Regular glyph swap/reset on a rectangular frame still needs separate qualification; this unit
does not establish centered geometry for those commands.

Final owner checks pass 1,748 tests with 11,891 assertions. All 24 icon/toolbar workflows pass
in Chromium and WebKit without snapshot update, and the five native workflows above pass.
Source/Vue/test types, lint with existing warnings, architecture, docs/changelog and normal
bundle checks retain their stated scope. The separate native-driver type gate retains 67
errors outside the touched icon spec.

Actual Pen opens Open Pen's independently exported fixture. Its native window is observed with
REA/Hopper and 8,003 untruncated accessibility nodes, with the unchanged executable hash. The
reference and Open Pen frame exports are both 560×240 at 2x; 731 of 134,400 pixels differ, with a
maximum channel difference of 73. No exact raster match is claimed.

Private receipts: `local-evidence/icon-rectangles-2026-11-04/`.

## Remaining acceptance

- Zero/runtime-resized and instance icon export, live identity bindings and their inspector controls.
- Every family's native/reference render states and matching standalone PNG export bounds.
- Exact glyph picker, family menu and weight-control pixels, hover, focus and disabled states.
- Native trusted pointer/keyboard cancellation, provider failure, offline and mixed/read-only states.
- Image/shader icon paints, live wide and zero-size resizing, and exhaustive instance bindings.

Private reference and test receipts: `local-evidence/icon-selectors-2026-11-04/`.
