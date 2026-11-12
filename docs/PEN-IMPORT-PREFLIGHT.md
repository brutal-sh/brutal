# Pen import preflight ownership

[MOD-PEN-IMPORT-CHECKS](https://trello.com/c/tDqUYMeo) separates the shared compatibility classifier before the distinct [custom-font loss guard](https://trello.com/c/754bQDEW). This extraction deliberately changes no supported-format behavior.

| Owner | Responsibility |
| --- | --- |
| `packages/pen/src/compatibility.ts` | Public inspection/assertion entry, diagnostic collection and unchanged bounded PenImportError. |
| `compatibility/diagnostics.ts` | Structured issue and visit-location types; JSON Pointer escaping. |
| `compatibility/document.ts` | Version and imported-document refusal checks. |
| `compatibility/graphics.ts` | Supported paints, strokes, effects and blend diagnostics. |
| `compatibility/nodes.ts` | Component index, node/Script/Note/slot rules and recursive child/override context. |

The public package entry remains byte-identical. Every diagnostic still follows version, imports, Note references and node depth-first order. A node visits type, Script children, Note checks, reusable checks, slots, fill/stroke/effects, children and descendant overrides in that order. Ordinary children reset inherited node identity; descendant overrides inherit it and reset component context. Referenced children reset component context. The slot predicate and accepted graphics schemas are unchanged.

The same Pen/Core preflight suite passes 334 cases and 1,089 assertions in 31 files before and after. The expanded control passes 337 cases and 1,104 assertions in 32 files, including the separate three-case CLI image resource/relocation control. An eight-document behavioral corpus compares complete diagnostics, own-key ordering, bounded error details, public export names and function/class arities byte-for-byte. All corpus bytes match, and independent source review finds no actionable current-caller regression. Five TypeScript owners pass strict 300 code lines/file, 50/function, complexity 10, four parameters and depth four without waivers; an initial combined document-check complexity of 11 is retained before separating version validation.

The actual public Core font-loss and imported-library refusal controls remain byte-identical through the extraction. The font definition is still accepted and omitted on Save at this phase; imported libraries are still refused before external reads. This preservation is not acceptance of those unsupported resource workflows, actual Pen rendering, native file panels or full portability. The separate font-loss task must add its failing regression before changing that behavior.

Private receipts live under `local-evidence/claude-brand-review-2026-11-11/pen-preflight-{before,after,qualified}*`, `pen-preflight-strict-corrected.json`, `pen-preflight-font-loss-retained.json` and `pen-preflight-library-refusal-retained.json`. The complete repository static gate exits zero, including package, architecture, type, documentation, tooling and zero-clone checks. No renderer, reference image, snapshot threshold or protected icon source is changed.
