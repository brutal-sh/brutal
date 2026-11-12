# Renderer ownership and preservation controls

MOD-05 extracts concrete operations from `packages/core/src/canvas/renderer.ts`. The class retains its per-instance fields, initialization order, constructor and original inheritance. Existing domain-method installation stays unchanged. No shared resource state, superclass, private brand or declaration merging is introduced.

| Owner | Responsibility |
| --- | --- |
| `renderer/chrome.ts` | Selection, component and slot color policy. |
| `renderer/geometry.ts` | Scratch buffers, shape classification, effect bounds and viewport conversion. |
| `renderer/resources.ts` | Font lifetime, surface replacement, invalidation, flashes and teardown. |
| `renderer/labels.ts` | Preview-aware label hit testing. |
| `renderer/drawing.ts` | Pipeline, text and presentation-color operations. |
| `renderer/images.ts` | Live textures, decoded-image invalidation and raster encoding. |
| `renderer/install-methods.ts` | Class-like descriptors, including the lazy flash getter. |
| `renderer/types.ts` | Existing overlay contracts and renderer cache/font records. |

Browser pixel-ratio reads and canvas creation remain guarded in the original renderer boundary. Two narrow callbacks supply those operations to the concrete owners. Positional call signatures, defaults, function names/arity and non-constructor method behavior remain. The compatibility type exports remain at their original entry.

## Executed controls

- All nine touched source owners pass strict 300 code lines/file, 50/function, complexity 10, four parameters and depth four, without a new lint suppression or runtime allowance.
- Built public exports and 110 sorted own prototype descriptor records equal the original renderer, including names, arity, flags and getters. The two callback-owning methods remain non-constructors. This does not assert prototype enumeration order.
- Four actual CanvasKit lifecycle/theme cases pass with 12 assertions.
- Twenty unchanged recorded Pen-oracle cases pass; all twenty PNG files are byte-identical before/after. Unsupported frames retain their refusal tests.
- The browser cohort executes live saved/shader frames, real PNG/JPEG/WebP and PDF downloads, and first-retirement checks. Six additional cases pass for delayed CanvasKit initialization, four-pane release/reopen in both engines, shader dimension changes and live animation/export separation.

- The complete static gate passes with zero clones. Full unit execution records 10,172 passes, one Windows-only skip and the unchanged Note-reference failure at 12,792 differing channels; it is not an all-green unit result.
- The rebuilt isolated native host passes twelve document changes, preserved original geometry, P3/sRGB changes and resizing with at most three contexts and no reported context errors. Saved screenshots independently contain exact red and gray center pixels. This is synthetic native output rather than full Pen visual acceptance.

## Retained failures and limits

The first thirteen-case browser cohort has six passes, three failures and four cases not run after serial-suite failure. The six additional cases execute the previously skipped resource cases independently; they do not repair a failed assertion.

Both repeated-document snapshots fail because the current fixture draws on light background while the saved resource snapshot has a dark background. Running the untouched HEAD renderer reproduces both failures with byte-identical received PNGs. Resource assertions after that screenshot were not reached in that original cohort. The later [explicit resource fixture qualification](GPU-DARK-FIXTURE.md) selects the intended dark page and executes those assertions in both engines against byte-identical original snapshots. It changes test setup only; the original failures remain recorded.

The original strict WebKit P3 snapshot also fails by one matcher pixel. Its candidate PNG is byte-identical to the pre-refactor failure. Chromium executes the initial/resized strict P3 images successfully; WebKit does not reach its resized assertion. Existing Note raster discrepancies remain separate.

These controls execute the rebuilt isolated native host as well as supported source/browser behavior. Normal installed-app acceptance and complete matched live Pen design/functionality parity remain open.

Private receipts: `local-evidence/claude-brand-review-2026-11-11/renderer-*`, with original failures and baseline restoration records retained. No test assertion, image or threshold is changed.
