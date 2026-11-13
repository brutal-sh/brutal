# CLI PNG export

Updated 2026-11-13. CLI-04-PNG is Verify. Current reference is installed Pen 1.2.23,
archive `d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.

## Outcome and controls

The [current CLI guide](https://docs.pen.dev/for-developers/pen-cli) describes image
export, scale and format selection, and warns that an export error can accompany
a successful exit status. These are documented reference behaviors, not a new
authenticated vendor CLI run.

The built workspace Node CLI entry executes outside the checkout on Node 24.18.0. At base
`727f5408e`, a solid-color export decodes independently to 128 × 96 and RGBA
`51,102,153,255`; input bytes remain unchanged. A write-limit control exits one after
truncating the valid 347-byte destination to 128 undecodable bytes. Normal retry
restores the exact original PNG. Both failed and successful artifacts are retained.

Owned RPC controls expose another failure: empty and malformed encoded app responses
can replace a previous output with empty data and resolve successfully. The retained
before cohort records four passes and four failures; numeric input already refuses.
These are local fake-service controls, not real app/provider/native acceptance.

## Ownership and candidate

Primary output uses the shared strict temporary-replacement policy already qualified
for conversion. Base64 type, validity and nonempty decoded data are checked before
writing. The 411-line export command is split into orchestration, 175-line argument
metadata/ordered validation and a 10-line format-registry owner. Orchestration is
230 physical lines; all eight touched TypeScript owners/tests pass strict
300/50/10/4/4 checks. A test-only subprocess helper retains the existing limit
invocation and adds an explicit owned working directory.

Independent read-only review finds metadata, validation order, document/page/node
targeting, output `fileName`, SVG/PDF routing/options/default filenames and the
shared registry preserved. Secondary asset writes retain their existing ordering;
this change does not make multi-file exports transactional. No renderer, normal
app Save, native profile, recovery or provider behavior is changed.

## Qualification and open pixels

The first candidate passes 25 cases with 122 assertions: actual outside-checkout
exports at both scales, solid colors, node selection, unknown-node refusal,
relative resource retention/current renderer sample, failed write/cleanup/retry,
restricted-folder refusal/retry, symlink-target preservation, owned RPC refusals
and the complete converter cohort. The final nine-file caller cohort passes
66 cases with 297 assertions and no failures. The complete repository check
passes in 178.22 seconds with zero clones. Earlier complete attempts stop on
test-only loop and optional-asset typing errors; table parameterization and explicit
fixture guards preserve all assertions. Those failed controls remain retained.

The rebuilt workspace Node entry on 24.18.0 executes ten outside-checkout controls: solid and
relative-image 1×/2× PNGs match the originals byte for byte; limited-write and
restricted-folder refusals preserve prior PNGs and permit byte-identical retries;
mode/source retention, temporary cleanup, symlink-target retention and unknown-node
refusal execute. Help and five invalid-option diagnostics are byte-identical to
the original metadata controls. The qualified bundle hash starts `687f34d6462a`.
These receipts qualify the built workspace entry; CLI-01 standalone installation
and release-package trust remain separate open gates.

The image fixture is an owned deterministic RGB pattern. Source-pixel equality is
not accepted: its first 1× output differs at 12,227 of 12,288 pixels. Its current
renderer sample is `64,48,204,255`, while the raw asset sample is `64,48,208,255`.
Both source and output, 1×/2× sizes and exact hashes remain retained. The regression
sample in the new test preserves existing own-engine behavior; it is not a matched
Pen baseline or a relaxed reference threshold. Actual Pen comparison must resolve
this image sampling state before resource-pixel parity is accepted. No renderer
correction or complete image fidelity is inferred from the successful export.

Now: CLI-04-WEBP continues actual export acceptance; the [JPEG candidate](CLI-JPEG-EXPORT.md) is Verify. The qualified primary-output
slice remains Verify for actual reference/native/platform/image acceptance.
CLI-04-PNG stays unaccepted while those gates are open. No all-OS,
power-loss, beta or full design/functionality parity follows from these controls.

Private receipts: `local-evidence/cli-png-2026-11-13/`. Re-entry uses the exact
`resource-control/resource.pen` and relative asset for an owned actual Pen
comparison when the desktop is available; preserve input/output identities.
