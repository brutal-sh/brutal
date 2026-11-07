# Canvas lifecycle verification

Updated: 2026-11-07. [STAB-GPU](https://trello.com/c/F8qWzU8W) has executed its
bounded browser/native resource criterion. Source/evidence publication readback follows.
Native drawing/resource evidence is bounded to the test below. It does not accept OS-level
pointer drawing, all graphics diagnostics, normal delivery or full Pen design/functionality.

## Change and ownership

The app leases scene and overlay canvas elements from a window-owned cache. Each layer
retains at most four idle elements, matching the existing maximum visible pane count.
`src/app/editor/canvas/surfaces.ts` owns elements and layer keys; it retains no document,
renderer, graph or input handler. `EditorCanvasSurface.vue` mounts the leased element with
its existing classes, pane identity, pointer behavior, cursor and accessibility attributes.
Document and pane components still own their editor, renderers and input scopes.

The optional SDK `onCanvasRelease` callback transfers ownership after renderer/surface
cleanup and CanvasKit handle release. Default SDK disposal keeps its existing behavior.
Destroyed managers cannot create another surface. Initialization checks cancellation after
its awaited animation frame and suppresses late failures after disposal.

The two new app owners are 38 and 48 lines. This is a cohesive lifecycle change, not a
completed disposition of any oversized-module task. The current source-size audit in
[MODULARITY.md](MODULARITY.md) includes these additions without accepting native behavior.

## Executed browser evidence

- The previous eager context-loss candidate fails repeated switching in WebKit with strong,
  weak and absent diagnostic observers. Dropping destroyed timer references also fails;
  that experiment is removed. Platform calibration reproduces retained lost-context budget
  exhaustion and draws correctly when two contexts are reused. Calibration alone does not
  qualify the app.
- Twelve Chromium/WebKit cases pass in 49.9 seconds. They exercise twelve new documents,
  preservation of the original 37×29 drawing, final 100×80 pointer drawing, destroyed old
  renderers/deleted surfaces, delayed CanvasKit startup, P3 negotiation, resize and split views.
  A single-pane document uses at most two observed canvas contexts plus the existing shared
  CanvasKit parking context. No graphics errors are filtered; the shared browser helper retains its existing
  official-Cloud-origin console exception.
- Two additional four-pane cases pass in 31.3 seconds. Three expand/keyboard-close/new-document
  cycles retain at most eight pane contexts plus one shared parking context; eight are connected
  when expanded and two after collapse/new document. No observed context is lost. Final pointer
  drawing remains exercised. This accepts keyboard closure only, not obstructed pointer controls.
- The stable 100-node paint fixture is implementation regression data from MIT OpenPencil,
  with [explicit provenance](../tests/fixtures/paint-effects-regression.md). It is not the Pen
  reference. Published GPU-owner source is used to capture four initial/resized controls before
  restoring this candidate. Both engines then match those controls with zero pixel differences.
  All controls and final drawing crops are inspected; candidate runs do not update snapshots.
- Four cancellation tests pass; the Vue owner shard passes 421 tests and 1,839 assertions.
  Source/Vue types, focused lint, architecture, documentation and changelog checks pass.
  The full normal build passes, including preserved unrelated worktree changes.

Private raw receipts remain local under `local-evidence/gpu-reuse-2026-11-06/` and
`scratch/gpu-reuse-*.log`. Tests and synthetic fixture/snapshots are reviewable in the repository.

## Executed native resource path

A freshly built isolated native test binary executes the committed twelve-document case
in 1.6s. It clicks twelve actual tab buttons, restores the original 160×120 node, changes
P3/sRGB document settings, and resizes/restores the native window. All twelve recorded
switch samples plus the final resize sample have at most three observed contexts, exactly
two connected, no lost contexts, zero reported GL errors and no captured JavaScript errors.
The shared parking context accounts for the disconnected third context. No console error
is filtered or global GC forced.

Both raw 2,560×1,600 native captures are inspected. Recorded native center coordinates sample
red `(255, 0, 0)` after the twelve switches and the original default fill `(217, 217, 217)`
after restoration. That gray matches `DEFAULT_SHAPE_FILL` in Core. These are real WebView
canvas pixels; shapes are created through the editor API. This does not assert OS-level
pointer drawing or wide-gamut color fidelity. The exact test-app PID is absent after exit.
No main installation, user documents/profile, credentials or recovery state changes.

The two earlier native artifacts are copied and hashed before the new test writes its
existing output paths. Five new raw artifacts and their SHA-256 manifest are retained under
`local-evidence/gpu-native-2026-11-07/current-run/`, with a separately executed pixel/resource
receipt. The actual runner log is `scratch/gpu-native-resource-current-2026-11-07.log`.
A missing optional external-driver diagnostic and post-session mock-store cleanup warning
remain in the log; the embedded native driver session and all case assertions execute.

Three earlier visibility-blocked attempts and their confirmed locked-desktop receipt remain
historical evidence. They do not describe this successful run. Dedicated native typing's
67 existing errors remain a separate non-passing gate. JavaScript probes and backend logs
do not promise exhaustive capture of browser-internal graphics diagnostics. Actual native
file panels, trusted clipboard and broad input coverage remain separate acceptance paths.

A separate observed defect, [UI-SPLIT-HEADER](https://trello.com/c/Lz1r5iLo), records toolbar and
inspector overlap blocking pane Close controls. Real pointer failures remain preserved. Keyboard
activation in the resource fixture does not accept those clicks. Full Pen design/functionality,
normal native delivery, whole-product branding and beta qualification remain open.

The new fixture and the other eleven current LFS fixtures are delivered through the own
private endpoint. [Current-checkout delivery](CHECKOUT.md) has executed fresh-storage
download, digest/size and integrity checks; no historical-object closure is inferred.
