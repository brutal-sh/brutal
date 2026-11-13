# CLI and browser WebP export

Updated 2026-11-13. CLI-04-WEBP is Verify for its bounded qualified candidate. Actual reference
is installed Pen 1.2.23, archive
`d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.

## Executed original controls

At source `21b162f4d`, the actual built workspace Node 24.18.0 entry runs outside
the checkout on owned synthetic artwork/resources. Eighteen controls independently
inspect RIFF/WEBP signatures, 128 × 96 and 256 × 192 dimensions, alpha retention,
quality 0/90/100, source/resource preservation, invalid-quality refusal, actual
file-limit and restricted-folder failure/retry, prior-output/mode retention,
symlink-target preservation, unknown-node refusal and temporary cleanup. All pass.
The owned image produces 950/4,116/8,258 bytes at 0/90/100. A translucent solid
sample decodes to `153,51,202,128`; alpha survives and colors can be lossy. No raw
source-pixel equality or matched Pen image is inferred.

The first browser cohort records 38 passes and two failures. Chromium's quality
100 file is smaller than quality 90: its lossless maximum matches the owned source
sample, so universal byte-size ordering is an invalid oracle. WebKit's request
really fails with `Nothing to export`: its browser has no WebP encoder and the
existing fallback is desktop-only. Both failures and all produced files remain
retained. Neither is hidden by a skip or a new accepted baseline.

## Candidate and ownership

A demand-loaded fallback uses the already installed CanvasKit full build. It is
separate from the canvas renderer and introduces no dependency. Its 8,080,104-byte
WASM binary is emitted as a hashed Vite asset. Initialization occurs only when the
fallback loads, while the production PWA pre-caches the binary for offline use.
That can add an 8 MB background download; the first fallback initialization also
incurs compilation cost. The pure encoder
validates PNG header/byte length, 16,383-pixel dimensions and a 256 MiB RGBA bound
before loading/decoding. Images are disposed, successful loading is shared and a
failed load can retry. Source bytes stay untouched.

The shared IO host callback gains an optional quality argument; existing one-argument
callbacks remain compatible. The encoder uses the same public image encoding
boundary as normal raster export, preserving minimum quality without duplicating
the CanvasKit workaround. Native undefined-quality output retains its existing
Rust lossless branch; explicit quality uses the full codec when fallback is needed.
This source path is preserved, not newly accepted installed native behavior.

The oversized export factory is split into context/bindings, format rendering,
file delivery and batch-request owners. Public callable arguments, selection and
page handling, ZIP naming/order, cancellation results and telemetry after successful
delivery remain equivalent under independent read-only review. Strict size and
complexity checks cover the changed owners; no limit is waived.

## Executed candidate evidence

Seventy-five owner/caller cases pass with 277 assertions. They cover PNG/JPEG/WebP,
shared callback quality forwarding, delivery/selection/ZIP behavior, lazy-loader
retry, malformed PNG/header/bounds/quality refusal and an offset PNG view retaining
alpha. A new test fixture typing issue is corrected without removing assertions;
failed static controls remain retained.

Forty browser cases pass across Chromium and WebKit, with zero skipped, unexpected
or flaky cases and retries disabled. Actual WebP/JPEG downloads preserve dimensions
and complete node snapshots. WebP quality uses decoded fidelity against an actual
owned PNG: independent Pillow channel-error totals are 584,013 at 0, 237,971 at 90
and zero at 100 in both browsers. Maximum lossless size can be smaller. JPEG's
existing size assertions and strict fractional-reference pixel checks stay intact.
Fourteen downloaded PNG/JPEG/WebP artifacts and their hashes are retained.

## Open acceptance

Actual current Pen matched output, installed native/platform delivery, app-connected
CLI quality and CLI-01 standalone installation/release-package trust remain open.
Own-engine and browser results do not establish Pen visual parity. Prior Note,
layout and raw-resource pixel failures remain open. Normal app installation,
credentials, profiles, recovery, original workspace and protected WIP are preserved.

Private evidence: `local-evidence/cli-webp-2026-11-13/` retains before/after commands,
original failures, decoder receipts, actual images, source hashes and test logs.

## Final bounded qualification

The complete repository check passes in 187.05 seconds with zero clones. The
production Vite build passes in 5.53 seconds. Its full-codec WASM matches the
installed dependency byte for byte: SHA256
`11e13773783fec05d04a2f8c73b9ad46f98c33359ab680d835b7638bb3b87cde`,
emitted as `assets/canvaskit-B3f9ifqk.wasm`. The production service worker pre-caches
that asset. This is asset-delivery/build evidence, not an installed or production-
preview runtime test. The renderer keeps its original engine.

The final browser cohort has 42 passes, zero skipped/unexpected/flaky cases and
retries disabled. In addition to the forty earlier cases, the inspector's actual
WEBP format selector and Export layer button deliver a decodable 128 × 96 file
in both Chromium and WebKit without changing the artwork. Sixteen actual output
artifacts are retained and independently decoded. The Node cohort repeats all
18 controls after the fallback correction; all six positive WebPs remain exactly
byte-identical to the published original. Native binaries and original workspace
are untouched.

App-connected CLI quality and direct-bridge WebP delivery remain unqualified;
that route uses the direct image API, so the new document-IO host fallback does
not itself prove connected CLI behavior. Actual Pen output and native/platform/
standalone trust gates above remain open. No milestone or full-parity acceptance.
The following [PDF slice](CLI-PDF-EXPORT.md) qualifies actual outside-checkout output. Current scheduling is in [Tracking](TRACKING.md).
