# Native driver discovery with an embedded browser

Observed: 2026-11-10. [STAB-NATIVE-DRIVER-CHILD](https://trello.com/c/fkiWT47o)
owns this test-driver defect. It does not accept full native reliability or the
separate intermittent editor-menu focus criterion.

## Executed original control

The frozen `c791e333a` test image has SHA-256
`3f76d33d0126ece9bd9a12c1413fd7bc100991aca585377b27fd2554f01e50c5`.
Both the canonical history/import/overlays/picker prefix and its failure-observer
variant pass nine cases in this re-entry. A separate native WebDriver input pair
passes import, then fails immediately after opening the browser: the button click
and address-element lookup succeed, but the following element-enabled request
returns `No window could be found`. It never reaches the intended menu input.

A native-command control isolates discovery from that UI setup. Raw WebDriver
handle reads are `["main"]` before the browser child, `[]` while it is loaded,
and `["main"]` after close. The same asynchronous editor callback completes,
with unchanged `performance.timeOrigin`, a live store and canvas, and a loaded
child. This executes in 358ms on the frozen image. Initial UI-driven probes fail
their setup preconditions and remain retained as failed diagnostic attempts.

The current `10d12cb39` source also builds successfully as an isolated native test
app, SHA-256 `9d10742a9913a1e7cdf1ce78bb9f93e975b8257f761c4eb2b67d29372a34a127`.
The same discovery control executes in 356ms with the same result. Both original
binaries are preserved. Production applications and user profiles are untouched.

## Cause and repair boundary

Installed `tauri-plugin-wdio-webdriver` 1.3.0 resolves executors and window routes
through `Manager::webview_windows()`. Tauri 2.12.1 filters that list using
`Window::is_webview_window()`, which requires every attached webview to have the
physical window's label. A differently labelled browser child therefore excludes
the editor from that particular list. The [versioned Tauri implementation](https://github.com/tauri-apps/tauri/blob/tauri-v2.12.1/crates/tauri/src/lib.rs)
and the installed source agree. This explains the reproduced driver error without
establishing physical editor destruction or classifying all earlier failures.

The candidate resolves the registered physical Window and its same-label primary
Webview freshly. Executor, handle listing, switching and close routes must share
that ownership rule. Child webviews and bare windows are not top-level automation
handles. Geometry/close/alert ownership remains physical-window scoped;
evaluation, cookies and URL operations remain webview scoped. Cached obsolete
`WebviewWindow` wrappers and wrong-view fallbacks are excluded.

Both 1.3.0 crates are now repository-local optional native-test dependencies under
`desktop/vendor/`. The driver changes nine Rust owners; the companion changes its
command owner. Both explicitly declare Tauri's unstable API feature. No versions
change, and Cargo.lock loses only the two registry source/checksum pairs. Production
plugin gates and capabilities stay unchanged. Original sources, installed-source
hashes and original binaries are retained. Global Cargo/npm caches and existing
JavaScript service changes are unchanged.

The driver keeps its published MIT license. The companion declares
`MIT OR Apache-2.0` but omits license text in its published crate. Its local copy
selects MIT and supplies the upstream root LICENSE from the crate's recorded source
commit `53d8569e7db3706a814f1fa6d6e779f2b22d0333`, verified against Git blob
`1e6bd77a94e50b9e939cda4cf1e4e72423386e39`; original metadata is preserved.
Both local copies include `OPEN-PEN-PATCH.md` with the repair boundary.

## Executed candidate controls

The paired candidate builds successfully; native image SHA-256 is
`68524d7ff3d445d259ac885df10f521347e223a9f288fc8725f6422ac448611e`.
The original compiler failures and failed intermediate controls are retained.
In particular, the first core-only candidate still loses companion state, and
the paired intermediate candidate returns a stale current handle after actual
window destruction. The final paired implementation corrects both observations.

Two actual macOS controls pass: the primary handle and canvas remain usable before,
during and after a loaded child, companion discovery/evaluation agree, and child
or missing labels are refused without rerouting. Destroying a test-owned auxiliary
window makes the current-handle request return HTTP 404 until the primary is
explicitly selected. The same editor realm and scene remain intact.

The durable `tests/e2e/native/browser/driver.spec.ts` executes these two controls
again after helper error-cleanup corrections: two cases pass in 841ms. Native and
general test types and owned structural lint pass. An injected helper failure
reproduces skipped cleanup in the original helper and verifies explicit owned
cleanup plus preservation of operation and cleanup errors in the current helper.
Independent review finds no remaining actionable defect in that bounded change.

The WebDriver menu/import pair passes after fixture setup explicitly submits its
address form: two cases in nine seconds, including native browser-backdrop pixel
changes without scene or selection changes. This does not accept Enter: the
original WebDriver Enter variant still fails navigation. This driver dispatches
JavaScript keyboard events; no trusted operating-system input is established.
CUA cannot bind the unbundled test binary, so that separate native input gate stays
open without asking the user to unlock or interact with the app.

## Remaining retained-session failures

The canonical broader retained run completes 14 specs: seven specs pass and seven
fail, with 18 passing cases and nine failures in three minutes two seconds. No
`No window could be found` or `no such window` response appears in this run.
The first failure is history reload waiting for canvas/text initialization.
Other failures concern browser controls, expansion/focus, page readiness and a
missing test-output directory in the Note spec. These remain separately classified;
this driver finding does not explain them or accept the native parent card.
Windows/Linux/mobile compilation and runtime behavior have not been executed here.

Private controls, original-source hashes, binaries and failures are under
`local-evidence/native-retained-focus-2026-11-10/`. No vendor Pen implementation is
part of the driver repair. Strict Note pixels, remaining visual states, full
native behavior and full Pen parity remain open.


Source `954f68b8a` passes the complete tracked-clean `bun run check`, including
literal zero clones, after the bounded native controls above. The driver card is
Verify because cross-platform and trusted-input limits remain. Its native-sequence
parent returns to Building to investigate the earlier reload readiness failure.
