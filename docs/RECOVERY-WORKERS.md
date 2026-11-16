# Recovery workers and browser reload

STAB-FIG-RECOVERY-WORKER remains Building. This document records a software
candidate and its limits; native recovery, the entire FILE-07 workflow and full
Pen design/functionality parity remain unaccepted.

## Observed failure and scope

A shared MCP test sequence leaves multiple dirty documents open. Its renderer
replacement case reports a FIG compression-worker access-control page error.
The same case alone passes. The original failures and timing receipts remain in
`local-evidence/mcp-cancellation-2026-11-15/`.

A separate owned multi-document recovery fixture reproduces the same error by
holding a compression module request while reloading. Both previously accepted
snapshots remain byte-exact, decode through Core IO and restore after fresh
reloads. This demonstrates a teardown error in that fixture; it does not prove
that every historical worker error has the same cause or that an archive is
corrupt. Real archive artifacts and SHA-256 receipts are retained in
`local-evidence/fig-recovery-worker-2026-11-16/`.

The constructor trace shows an interrupted worker error followed by another
export/worker attempt during teardown. Removing only the `pagehide` recovery
flush makes all four controls pass with the original worker implementation.
Cancelling the worker error's default reporting, catching only the detached
flush promise, and combining those two changes each leave the reproduction red.
Those ineffective changes are reverted. Plain-page worker controls also remain
versioned; they do not reproduce the app's failure.

## Candidate behavior

The app starts its best-effort flush on `beforeunload`, before page teardown,
and reports a rejected detached flush through the existing recovery diagnostic.
The existing unsaved-changes prompt still controls whether navigation proceeds;
starting a backup does not mark a document saved or approve closing it.
Public explicit persistence actions still reject on failure.

A live-page failure control also exposes a worker error with an empty message.
The compression boundary supplies a fallback diagnostic while retaining its
rejection and worker cleanup. This is separate from the lifecycle timing fix.
No global error filter, retry, timeout increase, snapshot waiver, provider call,
normal installation or user-profile/recovery modification is part of the change.

A best-effort unload write cannot guarantee the newest edit survives immediate
process termination. Previously accepted backups, automatic recovery and native
close decisions have their own evidence; this candidate does not enlarge those
claims.

## Executed evidence and remaining qualification

The final software candidate passes 34 affected recovery owner tests and all
54 browser/MCP cases without skips, retries or flaky results. Its recovery
controls include:

- Two dirty documents submit recovery together; at least two compression workers
  overlap, both workers close, and both archives decode with distinct contents.
- Reload during a held compression request preserves both accepted archives and
  releases worker resources; both snapshots restore after fresh reloads.
- A real live-page compression failure rejects with a usable diagnostic and
  retains both accepted backups. Explicit retry produces a valid updated archive
  that restores, while the unrelated archive remains byte-exact.
- Automatic debounce produces valid snapshots without explicit persistence.
- Cancelling cold unload preserves live edits. Scoped observation proves both
  owned public flush actions run during the unload attempt, separately from the
  automatic debounce; recovery then completes.

The final cohort includes eight WebKit recovery cases, eleven Chromium
existing-file cases and 35 actual Node/MCP/WebKit regressions. Existing-file
controls exercise refused saves, cancelled Save As, unrelated-backup retention,
explicit retry and fresh reopen. A first Chromium run fails on external Cloud
discovery CORS responses; the existing page-scoped local service fixture now runs
before recovery preparation. All functional assertions and limits are retained.
The original failed runs remain available.

The complete repository check and entire production build pass with zero
duplicate-code clones. All 6,558 built files and 2,776 scoped source/test inputs
remain exact across the final controls. Seventeen protected file hashes/modes,
three retained installed/test/original-workspace artifacts and unrelated wrap
work remain exact. The new helper/specs pass strict 300/50/10/4/4 limits; the
existing exporter's untouched positional API and long functions are not claimed
to meet those stricter limits. Independent source review has no remaining finding
and supplies no runtime credit.

A temporary restoration of the original shared-tab fixture replays its three
MCP scenarios twice: all six pass with zero retries or skips. The profile is
retained locally and restored byte-exact; the frozen inputs match afterward.
This supports the demonstrated lifecycle correction without claiming every
historical worker occurrence is classified.

The corresponding isolated macOS native path remains required. Full unit/browser
suites, standalone delivery, current Pen pixel/tool equivalence and full product
parity remain unaccepted. The installed normal app is preserved. The goal remains
Active. Evidence: `local-evidence/fig-recovery-worker-2026-11-16/stable-software-qualification.json`.
