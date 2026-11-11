# I/O format ownership

Updated: 2026-11-12. [MOD-IO-FORMATS](https://trello.com/c/ZNmNMH9M) is Building.

The remaining catalog in `packages/core/src/io/formats.ts` retains ordered built-in assembly and draw.io, SVG, PDF, PPTX, JSX, HTML and Tailwind JSX adapters. Existing FIG, raster and Mermaid domains own their adapters, while `formats/targets.ts` owns shared export target resolution. The existing `.pen` owner is unchanged. Public adapter exports and format IDs remain available from their existing catalog/API owners; format barrels do not re-export the new internal adapters.

The private FIG writer groups its page and output name into a fourth argument. Thumbnail selection, whole-archive behavior, filename/default precedence, generic first-page targeting versus all-page PPTX, raster/WebP fallback and lazy converter loading remain unchanged. This structural task preserves the known FIG Buffer-view failure; [FMT-FIG-BYTE-VIEW](https://trello.com/c/irdbdJqX) owns that separate correction.

Executed before/after controls currently record 105 owner tests with 356 assertions, identical ordered catalog metadata/callback names, and five runtime files passing strict 300/50/10/4/4 limits. Source/test types and architecture pass. Eight actual browser recovery, explicit Save/Save As, refusal/discard, editable reopen and autosave cases pass without changed tests/retries/timeouts. The paired byte-view control still fails only on the padded Buffer view. The complete static gate passes with zero duplicate-code clones. Private selected publication remains required before accepting this card.

Private receipts: `local-evidence/claude-brand-review-2026-11-11/io-catalog-*`. The pending stronger storage test/helper remain separately preserved and unpublished. Uploaded FIG decode/reopen, actual backend, native OS panels, physical restart, exact Pen UI and full parity are not accepted here. Computer Use still reports a locked Mac on the latest refresh.

REA resource-only inspection also reconfirms installed Pen 1.2.22; the current application archive hash matches the retained catalog. This is version/byte identity, not a new executed UI comparison. The REA session is exported and closed.
