# FIG text import ownership

2026-11-07. MOD-16 is a bounded extraction candidate; it does not qualify the whole
importer, Figma round trips or Pen parity.

`packages/fig/src/node-change/convert.ts` decreases from 1,333 to 1,155 physical
lines. The existing `node-change/text/` domain gains `import.ts` at 187 lines.
It owns text-property conversion, auto/derived/range line height, paragraph defaults,
decorations, saved layout height and glyph data. It reuses the existing font,
paragraph, style-run, paint, plugin-data and derived-glyph owners. No dependency,
public package entry, forwarding facade or new renderer is introduced.

Seven helper declarations and their private `TextProps` type retain their exact
source; only `convertTextProps` gains an internal export for the coordinator.
Every remaining top-level declaration and both public runtime export sets are
unchanged. The dispatcher calls text conversion in the same position, including
its existing defaults on non-text records. Component/layout/raw-payload/geometry
coordination stays in the original owner. Its remaining 1,155 lines still exceed
the review threshold; MOD-19 owns that follow-up. This extraction does not earn
an exception for the coordinator.

## Baseline and candidate evidence

The original and candidate FIG/IO/Kiwi quick shard each pass 761 tests across
189 files, with 17,364 assertions. Large-fixture heavy files are not included in
this quick shard; this is not a full heavy or all-unit run.

Whole-archive reader controls compare every captured node in `gold-preview.fig`
(888 nodes, one page) and `circle-text.fig` (six nodes, one page). Both candidate
digests report zero differences, with zero unresolved assignments, properties,
bindings and components before and after. This is interpreted-data preservation
for these two archives, not pixel matching or exhaustive archive coverage.

The before browser run executes five existing cases. Four actual FIG warning
import/edit/save/reopen journeys pass in English, light/dark, Chromium/WebKit.
The wrapped-text case passes its two-line save/reopen assertion, then fails its
stored screenshot: 2,470,402 pixels differ (ratio 0.99). Expected and actual are
both 1,800×1,400; their corner colors are respectively `(245,245,245)` and
`(24,24,27)`. This is observed before the extraction. It establishes a theme
difference, not that every changed pixel is explained by theme.

[VERIFY-FIG-WRAP-VISUAL](https://trello.com/c/e7tkTmrw) owns the narrow fixture/reference
adjudication. MOD-16, beta and the terminal gate retain it as a dependency. The
original spec, its timing, two-line assertion and image baseline remain unchanged
in this extraction. Raw expected/actual/diff, traces, source baseline and all five
case results are retained in ignored local evidence. The after run preserves the
same four passes and same failed visual assertion. Its actual wrapped-text PNG
has the exact same SHA-256 as the pre-extraction actual image: zero changed pixels.
This qualifies before/after preservation, not the stored control's visual criterion.
Inspection also shows a frame label and vertical placement difference from that
control, so simply changing the fixture to light mode is not yet a justified repair.

The normal worktree build, source/Vue types, FIG package/test types, architecture,
scoped formatting and documentation pass. Package metadata, exports, contents,
Publint and ATTW checks also pass. No timing, image-baseline, error-filter, test-body or fixture data changes are
part of this extraction. The build retains unrelated icon work and does not qualify
a clean packaged release. The expanded runtime candidate has 3,612 code files and
still twelve above 600; adding the text owner does not clear the oversized importer.

The owning FIG guide requires actual Figma round-trip validation. That criterion
is not executed by unit tests, archive digests, browser save/reopen or source
equality. MOD-16 stays unaccepted until it and the retained visual control are
qualified. User documents, profiles, credentials, recovery, the installed app and
unrelated icon work remain outside this change.

Tracking: [MOD-16](https://trello.com/c/P6y3uJe1),
[remaining coordinator](https://trello.com/c/q0ZEZpOy), [task index](TASKS.md),
[modularity](MODULARITY.md), [runtime inventory](RUNTIME-PACKAGES.md), [PRD](PRD.md).
