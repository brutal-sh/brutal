# App acceptance controls

2026-11-07. These are bounded test-control repairs, not product behavior changes or
native delivery acceptance. Actual Pen 1.2.21 remains the product reference.

The original 715-line tab entry and extracted 495-line entry both produce 1,950 passes
and the same three failures across 1,953 app-shard tests / 339 files. Their failing titles
match, and the extracted source is restored with its verified hash after the original
control. An isolated three-file run passes all five backdrop cases but retains the two
native save/watch failures (13 passes / two failures). No failure is waived.

[VERIFY-TAURI-IO-CONTRACTS](https://trello.com/c/btVgS7TP) updates two inherited tests to
the current owners and installed Tauri APIs: default `Untitled.pen` with PEN first,
explicit FIG priority, save cancellation, parent-directory watching for atomic replacements,
target data/rename events, sibling/access exclusion, recent-write suppression and late
events after disposal. Watcher resource 7 closes through `plugin:resources|close`, as in
installed plugin-fs 2.6.0 / API 2.12.1. The initial added close assertion expects the older
unwatch command and fails; it is corrected against installed source and retained in the
receipt. Directory identity refusal uses the existing watcher fallback; successful alias
identity remains covered by existing pure owner controls, not this IPC fixture.

The corrected four-file owner run passes 19 tests / 78 assertions. The full app shard
then passes 1,954 cases with one backdrop failure across 1,955 cases / 339 files. The two
added save cases account for the increased test count; no production source changes.

[STAB-UNIT-BLOB-FETCH](https://trello.com/c/bd0qkKEQ) reduces the remaining failure to
Cloud availability followed by backdrop: eight passes / one failure. The Cloud test's
cleanup installs `Response.error()` but leaves its global fetch spy active; the next
test receives zero bytes instead of the real object URL's `[1, 2, 3]`. The scoped spy now
restores in `finally`, following the existing room-image fixture pattern. The same
two-file sequence passes all nine cases, keeping backdrop byte/revoke/late-decode checks
unchanged. The full app shard subsequently passes all 1,955 tests / 12,576 assertions
across the same 339 files in 22.48s.

Owned type-aware lint, formatting and shared test types pass. Independent source review
verifies the three frozen test hashes, installed IPC wrappers and scoped cleanup; it
does not independently rerun the tests or native host paths. No timeout, skip, expected
frame bytes, application source, fixture data, screenshot baseline or global error filter
changes. Retained local logs identify each failed/control/after run. These repairs do not
qualify native host behavior, the mixed WebKit font/decode gate, inherited inspector
controls, full branding, beta or all-app parity. Tab native acceptance remains Verify.

## Browser host interruption control

The original mixed matrix retains 90 passes, ten timeouts, one interrupted case and
16 unexecuted cases. Its individual causes remain unclassified; the subsequent
host finding does not retrospectively explain that run.

A fresh 20-case traced prefix passes. The full traced 117-case attempt then records
116 passes and one timeout. Its Spanish WebKit command case starts at 03:21:36.946
UTC; the OS power record shows Sleep at 03:21:36 and DarkWake at 03:37:59, a 983-second
interval. The case lasts 983,098ms and its selector wait 982,457ms despite the
unchanged 15-second test limit. Raw trace and power timestamps establish this run's
host interruption; they do not establish an application deadlock.

The same 117 cases subsequently pass in 515,551ms with utility-scoped
`caffeinate -is`, no overlapping sleep events, zero skipped/flaky/unexpected cases,
matching thirteen source hashes and unchanged timing/error checks. The two
assertions and their owned process are absent after exit. No persistent power
setting or display-wake assertion is installed. Independent review verifies all
276 archived file hashes and raw results.

These local receipts qualify that interruption diagnosis and awake control only.
STAB-WEBKIT-MIXED remains Verify because the older failed matrix is unclassified.
They do not close native associated-file delivery, editor copy, beta or parity.

## FIG extraction integration control

With both FIG text-import and raw-payload export candidates present, the full app
shard passes 1,955 tests across 339 files in 21.76s, with 12,444 assertions. The
earlier 12,576 and 12,560 totals belong to their retained receipts; async assertion
counts vary. No test body, error filter, timeout or screenshot baseline changes
are part of these extractions. The paired browser controls still retain the same
wrapped-text visual failure, even though actual before/after pixels match.
[Text](FIG-TEXT-OWNERSHIP.md) and [payload](FIG-PAYLOAD-OWNERSHIP.md) records preserve
that control and the separate live Figma gates. The app shard cannot accept them.
