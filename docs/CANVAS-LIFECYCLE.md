# Canvas lifecycle verification

Updated: 2026-11-06. [STAB-GPU](https://trello.com/c/F8qWzU8W) is in Verify.
**Native acceptance remains unexecuted.** The isolated test app builds and its signature
verifies, but macOS reports a locked desktop and its main WebView remains hidden.
No native drawing result or full stability/parity acceptance is inferred.

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
completed disposition of any oversized-module task. The last accepted size audit remains
in [MODULARITY.md](MODULARITY.md); its runtime counts precede this candidate.

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
  CanvasKit parking context. No console errors are filtered.
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

## Remaining acceptance

The committed isolated native test covers twelve actual tab-button clicks, preservation of the
original node, final red drawing capture, color-space changes and physical window resize/restore.
It has not reached these steps. Three retained launch/activation/diagnostic attempts stop at
visibility; an OS read confirms `CGSSessionScreenIsLocked=Yes`. No unlock bypass or main-app
replacement is attempted. Dedicated native typing retains 67 existing errors and none in the
new owned files; it is not a passing full-native type gate.

When desktop visibility returns, rebuild/sign the isolated Test app and run
`tests/e2e/native/canvas-resources.spec.ts`. Inspect actual rendered samples, retained context
bounds, resize and restored document before accepting STAB-GPU. Its JavaScript error probe
and backend logs do not promise exhaustive capture of browser-internal graphics diagnostics.

A separate observed defect, [UI-SPLIT-HEADER](https://trello.com/c/Lz1r5iLo), records toolbar and
inspector overlap blocking pane Close controls. Real pointer failures remain preserved. Keyboard
activation in the resource fixture does not accept those clicks. Full Pen design/functionality,
normal native delivery, whole-product branding and beta qualification remain open.

The new fixture and the other eleven current LFS fixtures are delivered through the own
private endpoint. [Current-checkout delivery](CHECKOUT.md) has executed fresh-storage
download, digest/size and integrity checks; no historical-object closure is inferred.
