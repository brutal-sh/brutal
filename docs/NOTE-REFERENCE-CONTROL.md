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
