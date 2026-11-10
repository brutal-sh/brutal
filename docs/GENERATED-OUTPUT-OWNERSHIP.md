# Generated-output validation ownership

Observed: 2026-11-10. MOD-DUPES-GENERATED owns the shared traversal used by Script
and GLSL export readiness. VERIFY-DUPES-ZERO owns the duplicate command's exit policy.
These are bounded engineering criteria; neither accepts a Pen screen or full parity.

## Shared traversal

Source commit `865f693c3` moves the repeated queue into the private Scene Graph
`graph/visible-subtree.ts` owner. Selected roots retain their order, descendants are
visited breadth first, and each ID is read at most once. Missing nodes and child cycles
terminate. Invisible and nonpositive-opacity nodes prune their subtrees; an explicitly
selected descendant remains an independent root. The original `opacity <= 0` predicate
is retained, including its behavior for non-finite data. Children are read after the
consumer resumes, preserving mutation timing and immediate failure delivery.

Script's nearest-owner lookup, process-local presentation readiness, diagnostic export
readiness and exact actionable error remain in `scripts/output.ts`. GLSL's fill/stroke
iteration, per-paint visibility, image/preset/size checks and exact error remain in
`shaders/model.ts`. Public package exports and file formats do not change.

The traversal is 17 nonblank/noncomment lines; the two consumers are 78 and 110.
This does not establish whole-app file/function-size acceptance.

## Executed controls

- The new consumer contracts first pass against the original pair: 29 tests and 67
  assertions across three files. Adding two traversal-order/mutation controls gives
  31 tests and 72 assertions against the candidate.
- The expanded selection runs the complete Scene Graph owner, Script SVG export,
  GLSL SVG/PNG/PDF export and shader-frame ownership: 1,373 tests and 10,475 assertions
  across 119 files against both original and current consumers. The clean checkout
  repeats the same selection. Original files are SHA-verified before the controlled
  restore; candidate bytes are restored and verified in `finally`.
- General test types, source typed lint, architecture and the normal app build pass.
  The first test-lint run rejects global `NaN`; `Number.NaN` corrects it and final lint
  has no diagnostics. That initial failure remains in the evidence.
- Six actual Chromium workflows pass on the rebuilt candidate with no skip, retry or
  flaky result: empty Script export, runtime and missing-source diagnostics/recovery,
  shader diagnostic export, cleared-source placeholder/Undo and animated-time export
  at time zero. Existing strict snapshots stay unchanged. Downloaded empty-Script and
  shader-time-zero PNGs are inspected. Full trace/result directories are retained.

Raw receipts stay private under `local-evidence/generated-traversal-2026-11-10/`.
Source review finds no semantic defect. The browser run is Chromium only; there is no
fresh native delivery or live Pen comparison in this refactor. Historical Script and
shader comparisons retain their original scope. Full Script/GLSL acceptance stays open.

## Strict zero-clone exit policy

The preceding whole-root scanner reports one clone/eight lines/122 tokens at displayed
zero percent yet exits zero. The installed CLI's percentage threshold uses its rounded
statistic; an exit code alone therefore did not establish zero detected clones.

Commit `4bfdeae7c` appends only `--exitCode 1` to the canonical `test:dupes` command.
All roots, five-line/50-token matching, TypeScript selection and threshold zero remain
unchanged. No exclusion, scanner wrapper, dependency or weakened assertion is added.

The actual canonical command executes two full-root controls. Restoring the original
pair and moving the new private helper out for that scanner run reproduces exactly
one clone at displayed zero percent and exits one. Restoring all three candidate files
with SHA guards yields literal zero clones and exit zero. No build or runtime check
overlaps that source restoration. The final 33-case focused owner selection passes
after restoration. These results prove the named exit policy, not absence of every
possible duplicate below the configured detector's matching limits.

The complete clean `bun run check` at `4bfdeae7c` exits zero and ends with literal
zero detected clones. Its receipt covers the complete configured build/static/tooling
chain, including package validation and the strict detector. Existing warnings remain;
no warning or gate is suppressed.

The first subsequent full-unit invocation finds 12 Git LFS pointers in the clean
checkout, including failing FIG and font inputs. All 12 corresponding main-checkout
copies match their declared object hashes (154,786,405 bytes in total). That run is
retained as failed/fixture-incomplete; it cannot accept the full unit suite. Fixture
materialization and any rerun have separate receipts. Neither the combined check nor
scoped passes substitute for full unit/browser suites, native acceptance or full parity.

The materialized canonical full-unit rerun also exits one: one CLI Storybook assertion
expects inherited product prose, three renderer fixtures lack `Surface.flush`, and
the known strict Core Note comparison differs in 12,792 channels. All five reproduce
on previous `57928f502` with the same real fixtures; affected production and test paths
are unchanged. The two stale-contract groups have separate narrow verification cards;
DRAW-16-NOTE-RASTER owns the pixel gap. Outside-manifest files are read back unchanged
in both controls. Neither unit run accepts the full suite. No production behavior,
assertion, timeout, snapshot or tolerance is changed to hide these failures.
