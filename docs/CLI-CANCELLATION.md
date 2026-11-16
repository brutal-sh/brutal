# MCP cancellation delivery

MCP-05-CANCEL is Verify on bounded software evidence. Ordinary selection remains
on [MCP-05-SELECT](https://trello.com/c/zValTMfQ). The sole Building task is
[STAB-FIG-RECOVERY-WORKER](https://trello.com/c/G5zqj2PJ). Native/reference,
standalone, full milestone and product parity acceptance remain open.

## Observed failure

A real authenticated MCP client sends selection to an owned document while its
shared editor-tool lock is held. The browser observes the request; a read-only
round trip confirms app dispatch. Cancelling rejects the client promise, but
releasing and draining the lock still selects the layer. The uncancelled
positive control passes. The original red is retained in
`local-evidence/mcp-cancellation-2026-11-15/browser-red-isolated.log`.

## Delivered contract

Core-tool registration forwards the SDK request signal through scope enforcement
to the existing RPC sender. Each dispatched request binds cancellation to its
server-generated ID and original browser socket. A later connection cannot
receive an earlier request's cancellation. Waiting and settled requests remove
their abort listeners and timers; a closing registered socket waits for a valid
replacement before dispatch.

The app validates request/cancel frames and owns controllers per socket. It
passes the signal to the existing shared editor runner, which checks after
acquiring the document lock. Disconnect aborts pending work and refuses new
requests on that connection. Agent presence ends with the session's last socket.
The stdio bridge aborts its own HTTP request; caller abort does not trigger
reconnection or retry. The single auth-token retry remains limited to a rejected
401 response.

Cancellation after a committed effect does not undo it. This change adds no
agent termination, provider scheduler or second editor execution path.

## Executed qualification

After the entire repository check and the entire production build finish,
288 owner tests pass in 40 files with 1,777 assertions; one Windows drive-root
case is unavailable on macOS. All 35 actual Node 24.18/MCP/WebKit scenarios pass
with no skips, retries, unexpected or flaky results. Eight cover cancellation
through direct HTTP MCP and the built Node stdio entry.

The queued controls observe the matching cancellation ID arriving at the app,
then complete a read-only round trip before releasing and draining the real
editor mutex. They compare both documents' selection, graphs, history
availability, dirty state and saved source bytes/modes/mtimes before a valid
follow-up. Other controls cover pre-abort, concurrent document isolation, late
abort after commitment, scoped/authenticated admission and closed/replaced
connections. A rejected client promise alone is not acceptance.

All 6,558 built files and 142 scoped runtime/test inputs remain byte-exact across
these final controls. Seventeen protected file hashes/modes, three retained
installed/test/original-workspace artifacts and unrelated wrap work remain
exact. Strict 300/50/10/4/4 checks pass without new suppressions; the complete
check finds zero duplicate clones. Independent source review reports no
remaining defensible finding; it does not supply runtime acceptance.

Private evidence: `local-evidence/mcp-cancellation-2026-11-15/stable-qualification.json`,
original failed runs, source review, frozen manifests and allocation readbacks.
No normal app installation, provider use, reference-access workaround, merge
or public release is performed. The complete unit/browser suites, current Pen
payload equivalence and native/standalone delivery are not accepted by this slice.

## Fixture ownership and separate recovery observation

The first combined run passes eight cancellation cases but eleven older cases
contact external Cloud discovery and fail its CORS response; sixteen serial
followers skip. Existing page-scoped editor-service mocks isolate that service.
A second run passes 34 cases and reports one FIG export-worker/page error in a
shared sequence with prior dirty documents. The failures remain retained.

Each MCP case now owns its page/context, tabs, workers and storage, with the same
assertions and limits. The original shared fixture defaults remain unchanged
for other callers. A fresh three-case target run and the final 35-case cohort
pass. This does not resolve the separate multi-tab recovery observation:
[STAB-FIG-RECOVERY-WORKER](https://trello.com/c/G5zqj2PJ) requires recovery-archive,
resource and native checks. One timing probe stores a 29,541-byte row; archive
validity and the worker cause remain unknown. No global error filter is added.
