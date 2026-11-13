# CLI JPEG export

Updated 2026-11-13. CLI-04-JPEG is Verify for its qualified bounded candidate. Actual reference: installed Pen 1.2.23, archive
`d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.

## Reproduced behavior and correction

The built workspace Node entry at `710c80cbd` runs outside the checkout on Node
24.18.0. Five positive outputs independently decode as JPEG: 128 × 96 and scaled
256 × 192 solid designs, plus an owned RGB image at qualities 0, 90 and 100.
Source and relative image asset bytes remain unchanged. JPEG's lossy solid sample
is RGBA `51,103,153,255`; it is not the PNG sample or a matched Pen baseline.

Invalid qualities `bad`, -1, 101 and blank all return success in that original
candidate. `bad` and 101 replace an existing valid JPEG with different bytes.
Quality 0 and 100 produce identical 11,297-byte outputs, while quality 90 produces
5,552 bytes. These original outputs and diagnostics remain retained.

The CLI now validates explicit quality as a finite number from 0 to 100 before
file loading, app discovery or output writes. Malformed parser values refuse with
a diagnostic. Prior format and font validation order is preserved.

CanvasKit 0.41's public image wrapper uses a falsy quality default, turning 0 into 100. The shared encoding boundary passes the smallest positive number for zero:
the integer encoder receives zero. The browser fallback receives the unchanged
original quality. This bounded dependency workaround changes no dependency code.
Remove it when the upstream wrapper correctly preserves zero.

Independent review identified that the initial adapter-only placement left direct
rendering callers affected. That intermediate candidate is retained in the logs,
then replaced by the root correction. Shared IO and direct headless/renderer APIs
now converge on that encoding boundary.

The old 425-line raster export module is split into render orchestration, surface
allocation/downsampling and image encoding. Public positional arguments and callable
lengths are preserved through the existing variadic-tuple pattern. GPU/software
sampling, alpha trimming before white JPEG matte, selection/backdrop transforms
and cleanup stay in their original order. All changed code passes the strict
300/50/10/4/4 checks. No export baseline or tolerance is changed.

## Scope and open acceptance

Owned CLI and shared IO cases exercise dimensions, JPEG signatures/current codec
samples, relative image retention, quality ordering, invalid-quality refusals,
forced write failure, prior-output/mode retention, temporary cleanup and safe retry.
The real renderer-backed IO and direct API tests use a software CanvasKit surface;
they are not native GPU or installed-app interactions. App-connected CLI export currently omits
quality from its request and uses the default. That behavior is an open gate,
not accepted quality parity.

Actual current Pen CLI/output comparison, matched pixels, native Save/reopen and
platform states remain open. Workspace entry execution does not qualify CLI-01
standalone installation or release-package trust. Prior global Note and layout
failures remain open; no threshold or stored baseline is changed. No normal app
installation, user profile, recovery record, credentials or original workspace is
touched. This is independent implementation from documented/observed behavior;
no vendor extracted code is executed.

Private evidence: `local-evidence/cli-jpeg-2026-11-13/` retains original valid and
unexpected outputs, JSON/hash/decoder receipts, red controls and candidate logs.

## Executed candidate receipts

The complete repository check passes in 183.49 seconds with zero clones. The
17-file caller cohort has 107 passes and 444 assertions; its four default-heavy
skips are then enabled in their own process and all four pass with 13 assertions.
All nine changed TypeScript source/test owners pass the strict size/complexity gate.
The first preflight test-types failure is a new table-callback typing issue, then
corrected without removing assertions. Initial complexity failures are resolved by
cohesive helpers, not exemptions. All failed controls remain retained.

The rebuilt Node entry on 24.18.0 passes 17 outside-checkout controls. JPEG quality
0 now produces 1,141 bytes, versus 5,552 and 11,297 at 90 and 100. The original
solid/scaled/90/100 JPEG files remain byte-identical. Independent Pillow decoding
records JPEG signatures, dimensions and quantization tables. Actual file-limit and
restricted-folder refusals preserve the prior valid JPEG and 0640 mode; normal
retry returns identical bytes. Symlink-target/source/resource preservation,
unknown-node refusal and temporary cleanup execute. Qualified workspace bundle
SHA256: `84781fb674810a0cc4f61432930af9f564b0edc54d959fd55ad725dd9664bc7e`.

Both Chromium and WebKit execute 38 cases with no unexpected, skipped or flaky
cases, and retries disabled. Store-driven exports deliver actual JPEG downloads at
0/90/100, with preserved 128 × 96 dimensions and exact complete node snapshots.
All six JPEGs are retained and independently decoded. Existing compact exports and
strict fractional-reference pixel comparisons pass without baseline changes. This
establishes browser download/API behavior, not a UI quality control or native GPU
acceptance. Independent read-only review finds no actionable source regression.

Now: CLI-04-WEBP is the sole Building card. JPEG remains Verify for the explicitly
open actual reference/native/app-connected/standalone gates above. No release,
milestone or full product acceptance follows from these bounded receipts.
