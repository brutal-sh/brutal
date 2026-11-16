# Explicit tool selection delivery

Updated 2026-11-15. MCP-05-SELECT owns this independently implemented software
candidate. Actual Pen 1.2.23, native delivery, standalone installation and full
parity remain unaccepted.

## Contract and ownership

Core validates every unique `select_nodes` ID against its current page before
replacing API selection. Missing, other-page and document/page-root IDs refuse
the whole request. Success returns the unique API selection in headless mode.

The shared app runner delivers that explicit view action through the existing
editor `select` action while holding the document's existing tool lock. It checks
live document identity, graph identity and the visible page before applying the
selection. Editor normalization remains authoritative; the returned selected IDs
are the editor's actual result, including outermost/generated-frame handling.
A bridge admission check rejects offscreen selection before lazy page population
or layout; the lock-time page check still catches a later page switch. The
change does not synchronize arbitrary API assignments, viewport or page tools.
Selection does not run document layout, record an undo step or save the document.

The shared Layers primitive passes the editor selection into Reka's existing
controlled multi-selection model. Visible selection and `aria-selected` therefore
use the same source. Pointer and keyboard selection still use the editor action.
This does not establish screen-reader or full accessibility acceptance.

## Observed controls

Private evidence is retained under `local-evidence/selection-delivery-2026-11-15/`.
The original valid-call/unchanged-editor-selection failure and atomic-ID failures
precede implementation. A separate retained browser control finds an existing
highlight with `aria-selected=false`; it is an accessibility-state discrepancy,
not evidence that the visible selection vanished on tab activation.

Five real browser/actual built Node/MCP cases execute without retries or skips:
inactive-document selection, duplicate normalization, invalid mixed-ID refusal
and retry, multi-selection, visible highlight/ARIA, pointer/Enter selection,
changed visible page, closed document and renderer replacement. Both owned
graphs, other-document view, history/dirty state and saved sources are preserved.
Fresh Node reopening confirms unsaved coordinate edits were not written.

The affected Core/CLI/MCP/app cohort passes 263 tests in 45 files. Unit controls
also exercise foreign graph objects with equal IDs, ancestor normalization,
pre-aborted calls, cancellation while waiting for the shared tool lock and
refused lazy-page selection without materializing a layer. That lazy-page
control first reproduces one unwanted layer before the bridge admission guard.
These cancellation controls cover callers that supply an AbortSignal, including
WebMCP's runner contract. They do not establish real MCP request cancellation:
the existing MCP-to-app RPC transport does not forward that signal. The parent
MCP-05's cancellation acceptance remains open; it is not waived by these tests.

The first fresh-reopen fixture used names with a shared search prefix and was
corrected to distinct names. A pointer locator initially required an exact
accessible name despite row action labels; it now follows the same anchored
layer-name boundary as the other checks. Both original failures are retained;
no product assertion, timeout or acceptance threshold was weakened.

## Remaining qualification

The full repository check passes with zero duplicate clones and the production
build exits zero. After both jobs finish, 27 actual Node/MCP/browser controls,
263 owner tests and three outside-checkout actual Node controls pass. All 6,559
built-file hashes and 15 runtime/test inputs stay exact across those checks;
17 protected file hashes/modes and three retained artifacts remain exact.
The first Vue package-prepack failure remains unclassified; the exact isolated
package check and subsequent unchanged full check pass. A later full check is
stopped for a strict test-group size correction; the final full check passes.
The first headless checker used an obsolete tree field; its raw CLI output is
retained and the corrected checker uses current children and node results.

SELECT moves to Verify. [MCP-05-CANCEL](https://trello.com/c/Tz0FYCSy) owns the
remaining real request-cancellation qualification and is now Verify on its separate bounded software receipt. STAB-FIG-RECOVERY-WORKER is the sole Building task. The normal installed app and native-test binary are
preserved. Native/reference menu, highlight and selection behavior still require
actual observation; package source, static extraction and browser receipts do
not accept those gates. No vendor access-limit workaround is authorized.

The [2026-11-16 cancellation receipt](CLI-CANCELLATION.md) adds actual matching-ID
cancellation through direct MCP and built Node stdio, plus the 35-case combined
cohort. It leaves SELECT's native/current-reference/standalone acceptance open;
fresh MCP fixture ownership does not accept the separate recovery-worker observation.
