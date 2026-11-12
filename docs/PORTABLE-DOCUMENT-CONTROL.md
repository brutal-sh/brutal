# Portable document control

FILE-01 remains Verify for full resource/native/reference acceptance. The official `.pen` guide requires keeping referenced images, custom fonts and library files at relative repository paths so the project can move. The format schema declares relative image URLs and an imports alias-to-relative-URI mapping. References: [file guide](https://docs.pen.dev/core-concepts/pen-files) (read 2026-11-12; page updated 2026-11-11) and [format schema](https://docs.pen.dev/for-developers/the-pen-format) (read 2026-11-12). Live documentation does not substitute for installed Pen 1.2.22 behavior.

## Executed image slice

The existing CLI asset test has two passing cases and seven assertions before the added relocation control. The expanded control actually loads a PNG through the CLI document asset reader, renames the whole synthetic folder so the original location is gone, reopens the same relative image and compares its paint and exact PNG bytes. It exports JSON through public Core IO, refuses absolute original/moved/root paths in that output, writes and reopens the saved result, and checks the same image content and paint semantics.

All three cases pass with 15 assertions. The initial added case is retained as two passes/one failure because its final full-paint equality also compared transient source-file provenance. The exporter deliberately embeds the exact PNG bytes in a data URL, which has no external-file provenance on reopening. The corrected assertion tests the image hash, exact bytes, scale mode, opacity and visibility. No production implementation is changed and no image/reference threshold is weakened. Retention of external URLs through Save As is not accepted by this content-portability slice.

## Confirmed library boundary

A separate public Core IO control supplies two actual disposable schema-2.22 files, an imports mapping to `./library.pen`, a valid reusable rectangle in that library and a real filesystem asset callback. Reading the main document refuses `/imports/library` with the existing unsupported-import diagnosis before any asset callback is called (zero reads). This is an executed refusal, not evidence that relative library resolution works. The refusal currently protects against silent conversion loss and must remain until a complete supported resolver can preserve the contract.

The existing LIB-02 card owns local chooser/catalog browsing and component search. That UI scope does not itself own `.pen` import graph decoding, nested relative-resource origins or linked-reference serialization. Confirm and allocate the bounded format prerequisite before implementing it; do not broaden the UI card or remove its diagnostic as a workaround.

The initial control left custom-font path semantics unknown because the public schema names font families without declaring the shipped font-resource field. Subsequent actual Pen 1.2.22 artifact inspection establishes document-level name/URL entries and optional weights/styles/axes in the [portability reference ledger](pen-feature-reference/portability-1.2.22-2026-11-12.md). This is derived static evidence, not executed glyph, resource-loading or UI parity; no system-font substitution is counted as portability.

Private evidence: `local-evidence/claude-brand-review-2026-11-11/portable-image-{before,after,corrected}.log` and `portable-library-refusal.json`. Source owner: `packages/cli/tests/headless/pen-assets.test.ts`. No full FILE-01, Pen/native parity or public-beta acceptance is claimed.

Subsequent bounded safeguard: [PEN-CUSTOM-FONT-GUARD.md](PEN-CUSTOM-FONT-GUARD.md) records actual source-protecting refusal after the declaration-loss control. This does not provide document-scoped custom font loading or imported-library resolution. The original loss and refusal evidence remain retained; the three image-only cases still pass.
