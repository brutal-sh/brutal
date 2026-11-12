# App acceptance controls

Updated: 2026-11-10. These bounded controls distinguish fixture repairs from the
library discovery correction below. They do not establish native delivery or
product parity. Current reference is actual Pen 1.2.22; historical 1.2.21 receipts
retain their original scope.

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
earlier 12,576 and 12,560 totals belong to their retained receipts; the assertion
totals differ across these receipts. No test body, error filter, timeout or screenshot baseline changes
are part of these extractions. The paired browser controls still retain the same
wrapped-text visual failure, even though actual before/after pixels match.
[Text](FIG-TEXT-OWNERSHIP.md) and [payload](FIG-PAYLOAD-OWNERSHIP.md) records preserve
that control and the separate live Figma gates. The app shard cannot accept them.

## Request and toast attribution controls

The complete app shard at prior `5d1a81a5f` and native candidate `c791e333a`
reports the same three failures; their three owner files pass nine cases together
in isolation. This establishes a pre-existing cross-file influence, not a native
candidate regression or a production credential leak.

[VERIFY-SHADER-FETCH-ISOLATION](https://trello.com/c/Hr27ct7F) snapshots the existing
fetch-spy call count and checks the single new shader request with credentials
omitted. Source, oversized-length and invalid UTF-8 refusals remain. A seeded
prior call makes the original assertion fail without network; the corrected
owner and seeded control each pass one case/four assertions. The complete app
shard then passes 1,962 cases and retains two other failures. Source `f478dc76f`.

[VERIFY-UPDATER-TOAST-STATE](https://trello.com/c/1TLbRL6H) snapshots copied existing
toast records before scheduling and requires them unchanged afterward, together
with zero native requests and the original 2,600ms wait. A real existing-toast
seed gives the original five passes/one failure; corrected owner and seed each
pass six cases/ten assertions. The complete app shard then passes 1,963 cases
with the library failure remaining. No production toast clearing or updater
change is made. This checks no new feedback, not deep action/progress-object
immutability. Source `2a15a2431`.

## Library measurement and publication

[STAB-LIBRARY-HASH-ORDER](https://trello.com/c/1Usfscrb) is a production discovery
correction. The failing full-app observation identifies exactly one canonical
field delta after real FIG round-trip: a child TEXT node's `derivedTextHeight`
changes from null to 17.060546875. This is measured text cache, not authored
geometry. Source `18a464656` compares authored content only for raw modified
assets, including children and component dependencies; name/description changes
remain renames and actual authored changes remain modifications. Returned
revision descriptors and stored hashes retain their existing representation.

Five new regressions cover direct and dependency measurement, rename plus cache,
authored records with the same field name, and stored-cache tampering. Against
the original source they produce three failures/two passes. The corrected library
cohort passes 54 cases/136 assertions across 19 files. Original/current wire
controls have identical stored descriptor hashes and revision IDs in both
measurement states, and real serialization/validation passes. This does not
claim whole serialized graph-byte identity or a performance benchmark.

The complete app shard passes all 1,964 cases/12,479 assertions across 342 files.
The normal package/app build, source/general test types, architecture, owned
lint/format and independent reviews pass. An initial ad hoc typed-lint command
incorrectly includes test-only compilation boundaries and fails; the canonical
source typed lint, test structural lint and shared test compiler pass separately.

Two actual browser cases pass in Chromium (14.0s) and WebKit (16.4s):
source publication, FIG save/reopen without false edits, a subsequent authored
modification/revision, and offline multidimensional instance consumption and
reopen. Tests use the current Libraries/Components tabs and keyboard grid
insertion; original save and integrity assertions remain. The canonical WebKit
project now includes this exact workflow file. Earlier stale-navigation failures
remain retained. No screenshot tolerance, baseline, timeout or retry changes.

Private receipts are under `local-evidence/library-hash-order-2026-11-10/`,
`shader-fetch-isolation-2026-11-10/` and `updater-toast-state-2026-11-10/`.
These bounded results do not establish exact Pen visual design, native delivery,
the strict Note raster criterion, the whole unit suite or full product parity.

The complete clean `bun run check` at `18a464656` subsequently passes every
configured gate through literal zero detected clones. Its tracked checkout is
clean and excludes unrelated icon work. The complete canonical unit rerun then
exits one: its sole distinct failing title is the strict Note native-reference
raster comparison, expecting zero and observing 12,792 changed channels. The
runner repeats failed-group output; these repeated log lines are not separate
root causes. The three app failures are absent from this complete rerun. Full
unit success remains unaccepted.

## Current mixed workflow controls — 2026-11-12

At published `5e1beb9ee`, the unchanged export cohort passes all 32 cases in 46.677 seconds across Chromium/WebKit. The complete 117-case editor/branding matrix then passes in 500.989 seconds. Both use canonical configuration, one worker, the original 15-second case limit, zero retries/skips/unexpected/flaky results and no overlapping package/native/static/site builds. Every one of the 149 cases has a retained trace; named owners/configuration match the published head. Only internal plan Markdown changes during the larger run.

The original English WebKit font case and FIG save/reopen paths execute in the larger cohort. Its utility-scoped `caffeinate -is` process exits after the command; no persistent or display power setting changes. These are current passing controls, not a demonstrated cause or repair for the original untraced failure. STAB-WEBKIT-MIXED remains Verify; do not repeat passing cohorts without a new hypothesis or actual failing transition. Native delivery, matched actual Pen visuals and normal-installed recovery remain separate.

Private evidence: `local-evidence/mixed-webkit-2026-11-12/`, including complete results/commands/logs, per-case outcomes, owner/configuration hashes, 149 traces and a manifest of 319 files totalling 999,286,390 bytes. Older failed and successful controls remain untouched.
