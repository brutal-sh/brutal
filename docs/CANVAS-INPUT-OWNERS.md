# Canvas input ownership and preservation controls

MOD-12 separates `packages/vue/src/canvas/useCanvasInput.ts` into per-canvas state, measurement, press, movement, completion/cancellation, keyboard and event-lifecycle owners under `canvas/input/`. The existing SDK entry remains the positional facade; the app caller and package exports stay unchanged. The eight runtime files range from 49 to 199 physical lines.

The nine positional arguments, optional callbacks, enablement/zoom defaults and eleven returned refs/actions remain compatible. Name, arity, own keys and property descriptors match the frozen original function. The explicit arity property preserves reflection compatibility after moving the arguments into a typed tuple. Internal factories receive one options object; public callbacks retain their original free-function receiver.

Press activation still precedes the enablement check. Guide handling precedes tool dispatch. Hover stages reread the drag ref, active panning avoids the second coordinate read, and other drag branches retain that read. The drag union narrows exhaustively into existing domain handlers. Cancellation clears the drag before callbacks can synchronously cancel again. Listener order, capture flags, read-only/tool/page/selection/graph cancellation and scope disposal remain owned by each canvas.

## Executed controls

- All eight runtime owners and both new test files pass strict 300 code lines/file, 50/function, complexity ten, four parameters and depth four without a new suppression. Public positional call types and metadata match; cancellation re-entry and callback receiver tests execute. The existing canvas/shared-input cohort passes 133 tests and 367 assertions.
- The complete static gate passes, including architecture, test types, package validation and zero detected clones. This is not whole-product behavior acceptance.
- The unchanged seven-file browser cohort has identical pre-extraction and candidate results: 25 passes, two failures and one unrun serial case, without retries. Its failed distance-overlay PNG is byte-identical before/after.
- An expanded eight-file cohort also matches the published original input code: 17 passes, one fractional-snapping failure and one unrun later case. Deep measurement, split/resize/activate/close, pen/pencil, Scale and inline padding/gap editing execute. The original source is restored only for the control and the candidate is then restored byte-for-byte with its mode preserved.
- The separately invoked Control-bypass case fails on both versions with the same one-pixel X discrepancy. No expected coordinate, snapshot, tolerance, timeout or retry is changed.

## Retained failures and limits

The original duplicate-history control reaches two rectangles but reads no layer rows because Agent is selected. Revealing Layers through its public tab lets the unchanged history assertions pass on both the published original input code and the candidate. This is a test-navigation correction, not a product duplicate repair.

The traced candidate recovery/history cohort records 22 passes and two total 15-second deadline failures, with no skips/retries. Published original input independently reproduces both failures: existing-file Save/history/reopen in Chromium and refused-discard/retry in WebKit. The first candidate trace spends about 12.6 seconds constructing and restoring the fixture before the checked journey; the WebKit trace reaches target-only retry/reload before the late unrelated-editability deadline. TEST-RECOVERY-JOURNEY-LIFETIME owns the separate fixture-lifetime work. Neither these observations nor successful repeats diagnose the older untraced Cancel/Home transition.

The distance image and the two fractional-movement assertions remain unaccepted. Equal before/after failures establish preservation only; they do not establish actual Pen correctness or their original cause. The whole-product unit suite also retains its independent strict Note raster failure. Normal installed-app, physical native input and matched actual Pen design/functionality acceptance remain open; smaller source files do not close MOD-12 or M16.

Private source freezes, reports, original failures, exact restoration controls, REA inventory and installed-reference hashes are retained in `local-evidence/canvas-input-2026-11-12/`. Pen is rechecked as 1.2.22 with the same full ASAR hash. The normal Brutal binary and protected work remain unchanged.
