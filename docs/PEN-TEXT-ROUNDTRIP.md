# Pen text import and native round trip

Updated: 2026-11-09. The bounded repair cards are
[IO-PEN-TEXT-METRICS](https://trello.com/c/OsoRigTT) and
[IO-PEN-FONT-WEIGHT](https://trello.com/c/eZdtP6HB). Both have bounded Executed evidence at `85f730dff`;
FMT-09-DRIFT and the broader typography/format requirements are not accepted here.

## Reproduced differences

An owned fixture created in actual Pen 1.2.22 contains two frames, rounded inside stroke,
clipped translucent ellipse, triangle and Inter 24/600 text. Native `Get` measures its
text as **85 × 29**. The older Open Pen import measures **101 × 34**, then **84 × 30**
after saving and reopening. The first dimensions equal the layout fallback estimate.
Font preparation alone still depends on whichever canvas measurer is installed.

The Core PEN reader now prepares graph fonts and performs its final authored relayout
using a scoped CanvasKit paragraph measurer. It reuses the existing shaping provider's
ownership/refcount/finally cleanup. The temporary global layout override is synchronous
and restored before any asynchronous continuation. Other FIG/PDF shaping callbacks keep
the same first argument; FIG import geometry is not relaid out by this change.

A separate native comparison catches a wire-type defect: the writer emits numeric weight
600, and actual Pen reopens it as normal weight, measuring 83 × 29. Open Pen's permissive
reader accepts the number, masking that loss in its own round-trip check. The shared writer
now serializes weight as a string, matching the public contract. A real existing writer
regression asserts that wire value, rather than relying only on our reader.

## Executed evidence

- Two Core regressions cover 2.21 and 2.22 with real bundled font bytes and a deliberately
  different ambient canvas measurer. The red controls and final green results are retained.
  All 116 PEN/shaper cases pass with 726 assertions.
- The writer regression fails before the wire fix. All 274 PEN-package cases then pass
  with 889 assertions. Unrelated icon WIP runs in these owner groups but is not accepted
  or included in these changes.
- The committed browser regression opens a new 2.22 fixture via the keyboard file action,
  saves a copy and reopens it. Both bounds are 85 × 29; both selected-text canvas crops
  match the new baseline with zero pixel tolerance. The normal run passes without snapshot
  update mode, retries, skipped cases or timeout changes. The new baseline is inspected.
- The larger original two-frame fixture also passes browser FileOpen/SaveAs/reopen.
  All eight captured scene records retain the tested geometry, paint, stroke, text and
  child-name fields. These include the internal Document frame and seven authored nodes.
  Every temporary diagnostic edit is restored byte-exactly.
- The repaired saved copy opens through actual Pen's native FileOpen panel. Its own model
  reports Inter 24/600, 85 × 29. Both SVG exports are byte-identical to Pen's originals:
  `6053f2d0009b2b56fdc934cfd90925a6081ae5f4e3b70fb04a9872b1d3b27972`
  and `dd20eb05dd450e2052b674b5f7c7fe61d97257fa5ffb4d67f6c69cfe31e148c9`.
  The 240 × 160 and 120 × 80 native fixture images also have identical decoded RGBA bytes.
  Comparison checks every channel, not only the alpha channel of an image-difference bbox.
- The headless CLI reads both original and saved copy successfully: one page, seven authored
  nodes and Inter, with identical metadata. Text-bearing Core PEN reads now prepare fonts
  and require CanvasKit, through the supplied context instance or the normal loader.
  Direct standalone `@open-pencil/pen` parsing remains unchanged.

Accepted receipts are `cold-text-paragraph-owners.log` (116/726),
`font-weight-owner-after.log` (274/889), `text-final-core-regression.log`,
`text-final-build.log`, `text-final-types.log`, `text-final-test-types-fixed.log`,
`text-final-architecture.log` and the named browser/native/CLI folders. Older files with
“final” in their names can contain failed intermediate controls; they remain failures.
The original type-check failure is retained separately from the corrected passing receipt.

The normal build, source/Vue types, test types and architecture checks pass. Provider-lifetime
review finds no new ownership/global-scope defect. The Core shaping and PEN-adapter owners remain under 300 physical lines. The existing
364-line PEN writer keeps its size; only the weight representation changes. No new
dependency, renderer cache or document metadata flag is introduced.

## Limits and re-entry

The native image comparison renders the original and our saved copy in **Pen**. It proves
this fixture's interchange output, not full native Open Pen screen/menu pixel parity.
The browser snapshot proves cold/warm rendering consistency for this owned plain-text case.
Missing fonts, complex scripts, variable/rich text, Note/Prompt/Context migration, native
Open Pen file-panel/clipboard/install delivery and complete typography remain separate gates.

The SVG output differences remain: Open Pen still emits live text and one combined SVG
for multiple selected frames, whereas Pen emits paths and a ZIP. Those belong to
IO-13-EXPORT and are not waived by this text round trip.

Private originals, failed/corrected outputs, native observations, SVG/PNG comparisons,
full browser traces, red/green owner logs and headless receipts remain under
`local-evidence/svg-parity-2026-11-09/`. Pen is restored to Home/Recents after native checks;
existing user documents are not edited. Raw reference resources and private UI captures
are not uploaded. Continue through the SVG dispatch/text-output owners, preserving the
broader schema-drift, menu and mixed WebKit gates.
