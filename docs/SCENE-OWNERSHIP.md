# Scene renderer ownership

MOD-01 separates the current scene renderer's responsibilities. Its target is
unchanged public behavior and output; it does not qualify full rendering parity
against Pen. The installed reference is still Pen 1.2.22, with archive SHA-256
`1c6d0129dc9dda08f2f0da5dde23aa8cc52df11858fec1e35cd3bd2647bcf407`.

## Ownership and compatibility

The original `canvas/scene.ts` is 1,140 physical lines. Its entry now owns node
traversal and delegates culling/transforms, children/masks, paint lifetimes,
container drawing and shape/effect caching to `canvas/scene/` owners. Stroke
painting and vector outlines live beside existing stroke code in `canvas/strokes/`;
text dispatch joins the existing readiness contracts in `canvas/text/renderer.ts`.
The two small type modules are shared contracts used by these owners.

Twelve touched runtime modules pass 300 nonblank/noncomment lines per file,
50 per function, complexity 10, four parameters and depth four. Their physical
sizes range from 15 to 234 lines. This is one coherent extraction, not a new
rendering abstraction, dependency or public package domain. The actual traversal
stays at the scene entry; it is not a forwarding-only module.

`renderer.ts` and `renderer/methods.ts` remain byte-identical. All 21 runtime
canvas exports, eight internal scene export names and 110 public renderer
prototype descriptors/arity match before and after. Three internal scene bridges
retain the existing positional argument contract through named rest tuples;
their JavaScript function arity changes internally. Public renderer methods and
callers retain their original signatures. Child drawing continues through those
public renderer methods, preserving overrides and mask dispatch.

The extraction preserves paint reset order, transformed culling arithmetic,
opacity/blur restoration, child clipping, shadow/fill/stroke order, native path
and surface lifetimes, cache acquisition/disposal and text fallback branches.
The canonical shader-ownership link in Core's guide follows the moved owner.

## Executed preservation controls

The focused canvas/layout/recorded-reference suites pass before and after:
334 cases, 1,437 assertions across 55 files. All 20 supported recorded-reference
renders have identical PNG bytes, dimensions and decoded RGBA before and after.
Existing rejected frames retain their original rejection assertions.

Twelve browser output comparisons also match exactly: ten Chromium canvas
scenes and strict Note export/save/reopen in Chromium and WebKit. The original
source is restored for each before run; canonical source aliases serve that
checkout without server reuse. The same temporary capture attaches already-taken
screenshots in both phases. All original assertions, reference images, thresholds,
launch settings and timeouts remain unchanged. Temporary changes are restored
byte-for-byte, and all twelve final runtime hashes match the frozen candidate.

These browser suites are **not green**. Initially each has eight failures and four
serial-suppressed cases; two separate selections execute the remaining four cases
once each. All ten canvas snapshot failures and both Note failures predate the
extraction and remain recorded. Notes retain 1,083 Chromium and 21 WebKit differing
channels. A separate [fixture task](https://trello.com/c/ZEokfEY1) investigates the
helper's stale dark-default comparison; this preservation result does not classify
every differing pixel as background-only.

The imported and reopened headless Note controls retain exactly the same PEN,
PNG and RGBA hashes and the existing 12,792-channel reference failure. Independent
review checks source/resource semantics, the complete pixel comparisons, original
source identity and final restoration. The complete static gate exits zero with
zero duplicate-code groups. Formatting and strict touched-module checks pass.

## Remaining acceptance

The final complete unit run retains 10,155 passes, one platform skip and only
the existing strict Note failure across 21 processes. The final recovery cohort
passes all 19 cases (17 Chromium and two named WebKit), with no retry, skip or flaky
case. It includes guarded browser process loss, same-profile Restore/Save,
third-process editable reopening, cancellation/refusal/discard, drafts, autosave
and storage Save To. These controls use test-owned files/profiles and do not
establish external filesystem permissions or native recovery.

MOD-01's native output requirement remains unexecuted: Computer Use reports the Mac locked.
Normal installation, protected icon work and user documents/profiles/credentials/
recovery remain outside this extraction. No native, full reference, parity or beta
acceptance follows from preserved output.

Private receipts: `local-evidence/claude-brand-review-2026-11-11/scene-*`.

## Subsequent fixture qualification — 2026-11-12

[The canvas fixture correction](CANVAS-FIXTURE-CONTROL.md) subsequently executes
all ten original canvas snapshots successfully without image or threshold updates.
Its corrected final run passes 50 browser cases plus all 19 recovery cases; full
static checks pass with zero clones. Renderer production hashes remain unchanged.
The original failing preservation receipts above stay retained. Strict Note and
native/Pen reference acceptance remain separate open requirements.
