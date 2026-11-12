# Pen 1.2.22 portability extension catalog

Observed 2026-11-12 in the existing verified extraction of actual `/Applications/Pen.app`. The archive hash is unchanged. These are newly cataloged shipped semantics; no claim is made that they first appeared in 1.2.22. The [machine-readable ledger](portability-1.2.22-2026-11-12.json) records source identity, explicit UTF-8 byte/code-point/line/UTF-16-column positions and remaining unknowns. Raw proprietary sources remain local.

## Custom font declarations

The shipped renderer contains document-level `fonts` decoding and encoding, while its generated public TypeScript schema and the [live public format schema](https://docs.pen.dev/for-developers/the-pen-format) omit that field. Entries name a family and relative URL, with optional numeric/ranged weight, style and axis ranges. Decoding groups styles by declared family and resolves URLs against the document; encoding keeps relative URI context. This is derived static evidence, not an executed glyph/font-loading or save UI control.

The renderer source SHA-256 is `9287a8a40617929bc99c059e7a408e0ffa905e9531f320ee6e99943379fc031a`, independently matched to the complete extraction manifest. The font decoder begins at UTF-8 byte 4706553; the encoder at 4708241. Earlier private notes used Unicode-code-point offsets 4,576,937/4,578,625; those are not byte offsets.

## Imported document identity

The same codec reads document imports as URI aliases and prefixes imported node identity with the document alias followed by a colon. Referenced descendant paths are handled per path segment. This identifies a format-level concern beyond the existing library chooser/catalog UI. Complete variable/theme semantics, missing-library behavior, read-only/update behavior and lossless Save/Save As remain unexecuted and must not be inferred from these snippets.

## Open Pen allocation

FILE-01 retains complete moved-folder image/font/library acceptance. MOD-PEN-IMPORT-CHECKS preserves the current classifier; FMT-PEN-FONT-LOSS prevents demonstrated declaration loss through an explicit unsupported-data preflight until document-scoped font read/render/write support exists. The latter safeguard does not close FILE-01. Existing LIB-02 remains the chooser/catalog workflow; do not silently broaden it into an import graph rewrite.

No vendor function body or asset is copied into the implementation. Actual Pen native font loading, same-family document isolation, missing/malformed font UI, offline folder relocation and full resource parity remain unknown.
