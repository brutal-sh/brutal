# Explicit resource fixture background

TEST-GPU-DARK-FIXTURE qualifies the repeated-document resource fixture against its original dark-page snapshots. It changes test setup only, not the renderer or the editor default theme.

## Observed failure and correction

Both engines previously drew the final resource fixture on a light page while the existing snapshots expected a dark page. The untouched renderer and extracted renderer produced byte-identical failures. The fixture now sets the active new document to the public dark page constant before drawing. Returning to the original document still checks its original rectangle and absence of resource errors.

The existing delayed-WASM route gate is extracted into a local helper to keep touched functions within the strict size limits. Route matching, script bypass, release in `finally`, context bounds and assertions retain their behavior. No snapshot, matcher threshold, runner timeout, retry, production helper or configuration changes.

## Executed criterion

- All eight original resource cases pass in Chromium and WebKit, with no skipped or retried cases.
- The shared canvas fixture and page-theme controls pass alongside the resources: 24 cases, zero failures, skips or flaky results.
- Independently captured 240 × 250 output PNGs are byte-identical to both original resource snapshots, including every decoded RGBA channel. The read-only attachment probe restores the candidate source exactly.

The complete static gate and strict source-size checks are recorded with the publication evidence. This test-only qualification does not repair the retained strict WebKit P3 snapshot failure, the Note reference discrepancy, or establish full Pen/native recovery parity.

Private receipts are `local-evidence/claude-brand-review-2026-11-11/gpu-dark-fixture-*`. The earlier renderer failure receipts remain unchanged.
