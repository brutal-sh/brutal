# Custom-font declaration loss preflight

[FMT-PEN-FONT-LOSS](https://trello.com/c/754bQDEW) owns this bounded data-integrity repair. Full document-scoped custom-font support remains a FILE-01 requirement; this guard is not font or library parity.

## Observed loss and reference

Before the guard, public Core IO accepts a valid schema-2.22 document with an unused `fonts` declaration backed by an actual relative TTF file, then saves it without that declaration. The exact source and font bytes are retained in the control. This proves declaration loss, not glyph rendering or font loading.

The installed Pen 1.2.22 renderer reads and writes top-level font entries with name, URL, numeric or ranged weight, style and optional axis ranges. Its font decoder and encoder begin at UTF-8 byte offsets 4706553 and 4708241 in the extracted renderer, whose SHA-256 matches the complete extraction manifest: `9287a8a40617929bc99c059e7a408e0ffa905e9531f320ee6e99943379fc031a`. This is derived static artifact evidence. The [public format schema](https://docs.pen.dev/for-developers/the-pen-format), read on 2026-11-12, omits the field. No vendor implementation is copied or executed by this repair.

## Resulting boundary

The shared import preflight reports `unsupported-font` at `/fonts` for a nonempty or malformed declaration. Core IO refuses it before reading document assets or returning a replacement graph. Schema-only parsing still retains the original data for inspection; absent or empty declarations and ordinary system-font family names remain accepted. The existing structured error remains the public error type. The guard must be replaced only by a path that actually preserves and resolves these resources.

Eight intended failing cases and three ordinary-document controls establish the corrected red baseline. All eleven focused cases then pass with 24 assertions. The expanded Pen/Core/CLI owner run passes 348 cases and 1,128 assertions in 34 files. Source objects/bytes remain unchanged, schema-only inspection is intact and document asset/layout callback counters stay zero on refusal. The initial Bun empty-row parameterization error is retained separately and corrected with zero-argument fixture callbacks; it is not counted as a product failure.

The actual Node CLI tree process exits with the `/fonts` refusal and leaves its source file and real TTF byte-identical. A separate built public Core IO process on Node 24.18.0 returns the structured font diagnostic with zero asset reads. Browser Open through the controlled HTML chooser rejects the file while preserving the current dirty design, recovery identity, exact recovery digest and tab. Final coverage passes three cases with no retries, skips or flaky cases: the new refusal in Chromium/WebKit and the original unsupported-node case in Chromium. The original unsupported-node control's closed-Layers assumption is retained, then corrected by explicitly selecting the public Layers tab without changing its assertions.

Six TypeScript owners pass strict 300/50/10/4/4 limits and independent source review finds no actionable issue. The complete static gate exits zero with zero duplicate-code clones; final documentation, test types and changelog checks pass. The full unit run records 10,172 passes, one Windows-only skip and the existing strict Note raster failure with 12,792 differing channels. Full unit success is not claimed. No runtime font registration, system-font replacement, native permission, installed application, user file/profile/recovery or protected icon source is changed.

## Remaining feature work

Document font loading must select each graph's own bytes before text measurement, drawing, outlining and export. The current family/style caches and attached providers are process-wide; attaching a relative font to those caches alone cannot establish isolation between two documents that declare different files under the same family name. Preserve authored names, URLs, optional/ranged axes and unused declarations through snapshots and ordinary saves, and execute moved-folder offline reopening. Native file panels, actual Pen matching, glyph fidelity and linked-library resolution remain unaccepted.

Private receipts: `portable-font-loss.json`, `pen-font-import-static-semantics.json`, `pen-font-loss-{red,red-corrected,green,owners,cli,browser-first,browser-qualified,browser-final,strict}.*` under `local-evidence/claude-brand-review-2026-11-11/`.

The [portability reference ledger](pen-feature-reference/portability-1.2.22-2026-11-12.md) distinguishes byte offsets from the earlier Unicode-code-point indices.
