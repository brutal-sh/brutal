# Pen 1.2.22 Note reference control

Observed: 2026-11-09. [FMT-09-DRIFT](https://trello.com/c/eZXKvRhb) remains Building;
[FMT-08-NOTE](https://trello.com/c/e7BHuBcb) and
[DRAW-16-AUTHOR](https://trello.com/c/Tg89QoKD) remain unaccepted.

The actual installed Pen document service executes these probes on a disposable copy of
the owned SVG fixture. A new, white 920 × 500 frame contains three Notes. No user document,
preference, account, provider or recovery record is edited. The Mac is locked, so this is
document-tool/rendering evidence, not physical native input or a complete screen comparison.

A fresh REA directory inspection examines 818 filesystem entries, with 14 symlinks not
followed. Its bounded header reads do not inspect ASAR contents. A separate full archive
rehash equals the retained extraction's `1c6d0129…af617`; the installed plist still reports
1.2.22. The existing complete extraction/catalog therefore remains the same reference.

## Authored properties and rendered output

| Probe                         | Authored width / height    | Observed rendered width / height |
| ----------------------------- | -------------------------- | -------------------------------- |
| Default color, two text lines | 240 / 200                  | 250 / 219                        |
| Explicit `#C9B8F2`, one line  | 240 / 200                  | 250 / 219                        |
| Omitted dimensions, one line  | Omitted; Get returns 0 / 0 | 250 / 219                        |
| Explicit purple, wider        | 480 / 400                  | 480 / 219                        |
| Explicit purple, short height | 240 / 30                   | 250 / 219                        |
| Fourteen text lines           | 300 / 700                  | 300 / 356                        |

The first three individual PNG exports at scale one are exactly 250 × 219. Their
dominant opaque colors are `#FEE484`, `#C9B8F2` and `#FEE484`, respectively. These
confirm the public schema's default color for the observed cases. The final frame export
is exactly 920 × 500 and is visually inspected: all three cards and their text fit.
The wider/short-height/content probes show a 250-unit minimum width and content-driven
height in these states; they do not establish every sizing expression or font fallback.

Authored and measured placement must also stay separate. All Notes have authored `y:24`,
but the tool reports bounds `y:74`; the final frame PNG places their colored bodies at
`y:24`. That 50-unit disagreement is retained, not silently corrected or treated as a
verified coordinate conversion. Exact toolbar/selection geometry and its cause remain open.

Each initial Note SVG contains an embedded PNG referenced through `defs/image` and `use`,
with a 250 × 219 SVG viewport. The fourteen-line Note likewise exports an embedded image
with a 300 × 356 viewport. This raster fallback differs from the vector shapes and text
paths in the earlier SVG fixture; SVG acceptance must include both kinds of output.

## Preservation and next acceptance

The copied `.pen` file and original still have identical bytes after the calls. These
mutations are observed in the document service and retained as exported outputs and
tool receipts; native Save/reopen of this Note document is **not executed**. The earlier
`native-context-roundtrip.pen` probe contains a frame, not a legacy Context node. It cannot
qualify removed Prompt/Context node types. Common entity Context metadata and those older
special-node types remain distinct requirements.

Open Pen's existing `STICKY` model is a FigJam contract with an author line, different
palette/layout/shadows and sizing rules. Its presence does not establish Pen Note parity.
No Note adapter, silent conversion or compatibility bypass is added by this control;
unsupported special nodes still refuse before graph creation.

Next: obtain actual native Note creation/edit/color/history/save/reopen evidence and an
owned legacy Prompt/Context fixture, then implement the measured independent contract.
Read-only, cancellation, color variables, rich text, Send to Agent, exact typography,
selection/toolbar states and full format parity remain open.

Private receipts and all PNG/SVG outputs stay in
`local-evidence/note-contract-2026-11-09/`; raw reference assets are not published.

## Subsequent native reference follow-up

Native access becomes available later the same day. The owned service document opens
in Pen with its three Notes. Selecting the default Note shows native inspector X/Y
24/24 and dimensions 250/219. Its eight preset buttons expose these exact hex values:
Yellow `#FEE484`, Orange `#FFCC98`, Coral `#FFBEB2`, Pink `#FDC0D7`, Purple `#DCC5F9`,
Blue `#AEDEFF`, Green `#B3EBBD` and Gray `#DBDEE1`. The custom hex field observes
`#ABCDEF` → Undo `#FEE484` → Redo `#ABCDEF` → restore `#FEE484` after commit/blur;
individual custom/preset body pixels are not independently checked.

Native double-click/type/Escape edits the text. Read-only document Get then verifies
edited content, native Undo restores both original lines, and native Redo restores the
edit. One further Undo restores the original content. An earlier probe reenters text
editing between history keys and does not observe Redo; it is retained as an intrusive,
unaccepted control, without assigning a cause.

Native Save As creates `native-notes.pen`; closing it and reopening through the actual
File dialog retains all three Notes. Its 920 × 500 export has exactly the same decoded
RGBA bytes as the pre-save reference frame. The reopened Get now reports Note bounds
at Y24. This supersedes the earlier unsaved-state limitation for this named fixture;
the initial Y74 receipt remains, with its cause unknown. No cold process restart is tested.

Pen returns to Home/Recents after closing the owned saved document. Send to Agent is
visible above the selected Note and is not invoked. Raw observations, text/history
receipts and `native-reopen-comparison.json` remain in the same private evidence folder.
Open Pen Note creation/interchange, native editing states and full parity remain open.

## Native authoring and inspector follow-up

The actual Pen 1.2.22 window is inspected again using the owned
`authoring-reference.pen`. Click and drag both create a 250 × 219 Note centered at
the press position; text editing begins immediately. Frame-local placement, Escape
and the default yellow after a previous purple Note are observed separately.

The selected Note inspector includes Create component, Context, Alignment, Position,
Layout with Add flex layout and Fill Width/Height, Appearance, Note color, Effects,
Code and Export. The corner field displays zero and is disabled; generic Fill and
Stroke sections are absent. The Note palette uses eight columns, 28 px buttons and
20 px circular swatches with a 2 px selected ring. The color popup hides alpha
controls. These measurements do not establish every hover, focus or theme state.

On a root Note, Fill Width retains a `fill_container(250)` authored dimension while
its displayed width stays 250. Add flex layout creates a separate vertical frame
with 10 px padding on each side and 10 px gap. The frame hugs to 270 × 239, and its
fixed-size Note remains 250 × 219 at local (10, 10). Undo removes the wrapper and
clears selection. Create component sets `reusable: true` on the same Note without
a wrapper; the control then offers Detach component. These trials are undone, the
owned disposable file closes with Don't Save, and Pen returns to Home/Recents.

The independent candidate's final browser run executes 29 tests: 16 in Chromium
and 13 in WebKit. Both execute Note authoring, palette/custom hex, mixed selection,
variable-preview cancel/commit, history, read-only transitions, Context editing,
wrapping and retained-panel behavior. Three existing compact color-picker tests
execute in Chromium. The 74-test owner cohort also checks wrapper geometry and
save/reopen. A reproduced undo defect initially overwrites authored dimensions;
restoring captured geometry in layout scope then preserves complete saved JSON for
both omitted dimensions and an authored 240 × 30 Note through wrap/undo/redo/undo.
An independent bounded re-review confirms those cases. These results are separate
from physical native Open Pen delivery and exact rendering acceptance.

Fill sizing/interchange, reusable Notes and their instances, Send to Agent, and the
strict Note raster comparison remain open. Existing data-loss refusal guards remain
in place for unsupported serialization. Raw receipts and failed/passing browser
artifacts stay private in `local-evidence/note-authoring-2026-11-09/`.

## Note component and instance follow-up

The owned `note-sizing-components-2026-11-09/reference.pen` is saved, closed and
reopened through the actual Pen window. A reusable Note retains its identity and
generated body. Its direct refs inherit content, color and width; explicit and
equal-value overrides survive master changes and reopening. A Note nested in a
reusable frame also retains its descendant overrides. This is a document reopen,
not a cold process restart.

Pen's instance inspector exposes Go to component, Detach Instance and Create
Component. Detach Instance materializes a plain Note with the same identity,
placement, content, color and width. Undo restores the ref. Detach Component on
the master materializes the master and its linked refs; Undo restores their
links and individual overrides. These trials use disposable test documents.

A later native comparison distinguishes a Note ref inside a component from its
resolved copy inside an outer instance. The original ref offers Go to component
and Detach Instance; the resolved copy offers neither in its inspector or context
menu. Core and command capabilities refuse independent detachment of that copy,
rather than creating an unsupported structural replacement. The owned
`nested-detach-reference.pen` is saved and closed, and Home/Recents is observed.

Creating a component from a Note instance keeps `type: ref` and its original
`ref`, and adds `reusable: true`. This differs from making a plain Note reusable.
That reusable-ref promotion remains an explicit independent-model/UI gap;
ordinary component wrapping cannot substitute for it. Inserting a ref to another
Note ref canonicalizes its target to the original master while retaining the
intermediate ref's explicit overrides and placement. Separate Native receipts
record both observations.

The independent format/graph implementation now tests direct and nested refs,
equal-value claims, three save/reopen rounds, prototype propagation and early
refusal of unsupported Note overrides, including typed descendant replacements.
Core detachment tests also exercise save/reopen and exact serialized Undo/Redo.
A failing nested-detachment case demonstrates that explicit equal widths must
move to the enclosing instance's override map when the Note becomes a plain
copy. Its focused regression then passes. The broader owner cohort executes
422 tests across 52 files, including nested generated-text-only equal claims;
this does not establish complete native delivery or screen parity.

The first broad browser pass executes 35 tests in Chromium and WebKit. A later
native-test build executes Create Component, palette recoloring, Detach Component,
native menu-event Undo/Redo and selection retention in its isolated WebView/profile.
The initial native run stops at an offscreen inspector control after Undo; scrolling
the re-created control into view lets the same state/selection assertions complete.
This is one bounded native workflow, not native file/restart or visual acceptance.
The shared header now recomputes its styles when a Note changes type, and subsequent
visual work restores the component glyph/color and Dimensions label. Exact header
backgrounds, remaining icon geometry, other themes and full screen parity remain open.

Raw native observations, earlier failed probes and owner logs stay private in
`local-evidence/note-sizing-components-2026-11-09/`. The owned reference is restored,
saved and closed after action probes, and Pen returns to Home/Recents. The owned
alias fixture remains edited in a background tab; the unrelated edited font
reference is preserved. Fill interchange, reusable-ref promotion, Send to Agent,
the existing strict raster mismatch and native Open Pen acceptance remain open.

## Independent candidate checkout

Commit `5ca1e4344` is checked in a separate checkout without the unrelated icon work. Its normal build, source/Vue types, documentation and commit validation pass. The same owner selection executes 419 tests across 52 files; the three additional shared-workspace cases belong to the excluded icon work. Six additional Chromium/WebKit component cases execute creation, native-shaped action availability, history and File save/reopen in that checkout. The broader shared-workspace run remains 35 passing browser cases, and the isolated native component/history workflow passes on its latest run.

The strict Core comparison is rerun unchanged and still reports 12,792 differing channels. At that candidate publication, full `bun run check` stops at the native type gate: 67 errors in eight other native test files; the new Note test/declarations report none. These failures remain unaccepted. VERIFY-NATIVE-TYPES becomes the one Building card; the Note/format acceptance work returns to Backlog with its observations and remaining gates preserved. No production installation, merge or release occurs.

The later [native type control](NATIVE-TEST-TYPE-CONTROL.md) clears those 67 errors without changing app behavior or assertions. Its fresh-process run repeats the Note component/history workflow successfully, alongside 21 other native cases. The initial retained-app batch remains a separate open reliability gate. Strict Note raster and the other Note acceptance limits above remain unchanged.

## Core coverage investigation, 2026-11-12

The unchanged canonical Core control still requires zero differing channels for both
imported and saved/reopened Notes. At source `f6edb506f`, its software export differs
from the retained native reference by 12,792 channels. The full unit run records
10,155 passes, one platform skip and this one failure. A paired original/current
Figma API control produces identical serialization, PNG and decoded RGBA hashes;
that refactor neither causes nor repairs the Note mismatch.

The first gold text region has five reference colors: background plus four ink
coverage levels. The software output has 210 colors there; purple text has five
versus 207. The reference rounded corner has 14 colors versus 40 in software, so
uniformly quantizing every edge is not supported by these observations.

A separate probe samples the unchanged merged glyph paths with `Path.contains`.
After subtracting the reference frame origin `(0, 260)`, all measured points remain
inside their owned Note palette. None of the three four-point patterns reproduces
the reference: the fewest differing pixels are 166 for gold, 78 for purple and 437
for the long Note, with different best patterns. The earlier page-coordinate probe
is invalid and retained separately; its out-of-frame values are not evidence.
This does not prove GPU tessellation, sample positions or font geometry as the cause.

Hashed static anchors in the actual Pen 1.2.22 renderer show an offscreen target
branch requesting up to four samples and an onscreen WebGL context configured
without browser antialiasing. These declarations do not establish which target
produced the reference PNG. Our headless owner uses a CPU surface and software
supersampling; the app uses a GPU surface. A fresh unchanged Chromium/WebKit pair also fails at 1,083 and 21 differing
channels (361 and seven pixels), reproducing the retained results. Both cases
reach their post-reopen data checks before the strict PNG assertion. No production
correction, tolerance or oracle change follows from this investigation. Earlier rejected scale-one and
per-glyph trials remain rejected. Backend/coordinate discrimination and exact Core,
browser and native acceptance stay open. Private receipts are
`local-evidence/claude-brand-review-2026-11-11/note-core-*` and
`note-reference-export-backend-anchors.json`.

The next diagnostic records one scene picture per browser instance and replays that
same object without resampling onto GPU and software surfaces at one-to-one scale.
Both browsers have identical Note path-command/font-byte hashes, transforms and
colors, and produce identical software output. Their GPU outputs exactly reproduce
the canonical PNGs above. This demonstrates a backend-dependent contribution in our
output with the recorded scene held fixed. Actual replay targets report GPU/one
sample versus software/zero; that does not identify internal coverage policy or the
reference-producing backend. Software two-times replay with linear downsampling
still differs by 12,790 channels, two fewer than the headless owner; that remaining
configuration difference stays open. Receipts: `note-backend-replay-*` in the same
private evidence folder. Temporary diagnostic specs are removed after byte-identity
checks; the installed app, tracked runtime and strict tests remain unchanged.

A three-arm replay then holds glyph x, paint, rounded baselines and line membership
fixed: the original merged path, separate line paths with baselines baked into their
commands, and those same separate lines at local y-zero with translated baselines.
The merged controls reproduce the canonical PNG hashes. The two separate-line arms
produce identical PNGs within each browser and worsen the mismatch to 3,048 channels
in Chromium and 2,286 in WebKit. This rejects baseline coordinate representation as
a correction for that decomposition; it does not isolate Skia's internal algorithm.
Neither variant enters production. `note-line-three-replay-summary.json` retains
those results, with the earlier two-arm trial kept separately.

## Current Note authoring in Pen 1.2.23 and Open Pen

Both apps created a 250 × 219 Note, preserved the typed text through Undo and
Redo, applied the Purple preset and reopened the custom #ABCDEF Note with the
same text and visible color. Pen recorded explicit dimensions. Open Pen
reconstructed the default geometry when the fields were omitted. Both owned
files were retained and the previous Pen tab was restored.

The isolated native Open Pen run used a guarded Unicode text event. Embedded
individual key input dropped spaces, and a separate hardware-key attempt lost
foreground focus. Fourteen current Chromium and WebKit authoring controls
passed, including picker cancel and read-only workflows. The current captures
use different zoom and theme settings. DRAW-16-AUTHOR remains in Verify for the
remaining native input and matched appearance evidence.

## Native Note keystrokes and installed reopen — 2026-11-19

The isolated macOS build from `300eaa0a3` created a 250 × 219 Note through the editor's N shortcut and canvas click. The input probe verified the owned process and active text editor, then sent 18 individual macOS keycodes. All three Space keys produced trusted keydown and beforeinput events. The saved .pen contained the exact text `open pen note text`. A second process reopened it with the same text, geometry and file bytes.

The embedded-driver controls used the same executable and entered each key separately. Both the named Space and literal space variants delivered synthetic keydown events without beforeinput. Their saved text omitted the three spaces. The earlier regular-app input attempt did not reach Note text editing. These results qualify physical typing on the isolated native build and locate the missing-space result to the driver path tested here.

Installed Pen 1.2.23 and regular Open Pen both reopened byte-identical copies of that .pen and visibly rendered the text at a displayed 100% zoom on the same 2× display. The solid `#FEE484` bounding extents measured 499 × 438 physical pixels in both captures. Pen had 214,245 exact-color pixels and Open Pen had 213,814. Viewports and themes differed. The visible Note name above the body also differed. The copies retained their exact bytes, and Pen returned to its previous tab and frame.

DRAW-16-AUTHOR remains in Verify for the matched appearance and regular-app text-entry checks. The Note export raster criterion remains separately tracked. Private traces, saved files and captures are under `local-evidence/note-key-input-2026-11-19/`.

## Note authoring in the regular installed app — 2026-11-19

The normal installed Open Pen executable from `7b72a75ba` opened an owned copy of the saved Note. A double-click inside its body focused the canvas text editor. Individual macOS keycodes replaced `open pen note text` with `save this note`, including both spaces. Escape left text editing. The saved file preserved the Note ID, geometry and color. Native Undo and Redo restored the original and edited text respectively, and a Save after each action verified the strings on disk. Closing and reopening from Recents restored the edited text on the canvas with the same saved bytes.

A separate empty owned document exercised the installed app's N shortcut and a canvas click. The native control reported the Note tool selected, and placing the Note focused its text editor. Escape followed by Save produced exactly one Note with the default `#FEE484` fill.

At startup the app displayed its existing recovery offer. Closing the offer left all four recovery records and both blobs unchanged. They retained their hashes through both disposable Note checks. The installed executable remained unchanged. The verified input and history paths complete the regular-app Note typing check. Matched appearance and the separate Note export criteria remain open. Private receipts are under `local-evidence/note-installed-keys-2026-11-19/`.
