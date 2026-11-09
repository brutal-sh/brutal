# Tracking

Updated: 2026-11-09. The full independent design and functionality parity goal remains active.

Repository: [private Open Pen repository](https://github.com/jpoindexter/open-pen), branch `feat/open-pen`.
Board: [Open Pen — independent design editor](https://trello.com/b/Z2u82Q4O/open-pen-independent-design-editor), private.

The [PRD](PRD.md) owns the outcome, constraints and release criteria.
The [task index](TASKS.md) links all 427 execution cards; the [modularity audit](MODULARITY.md)
records the measured review queue. Requirements come from the [feature catalog](pen-feature-reference/README.md)
and the [native screen/menu ledger](PARITY-STATE-MATRIX.md), preserving historical Pen 1.2.21 evidence and the current [1.2.22 update inventory](pen-feature-reference/update-1.2.22-2026-11-09.md).

## Board organization

| List       | Purpose                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Milestones | The 15 original cards retain their history; two new milestones track own branding and modularization. These broad cards are not executable units or current acceptance claims. |
| Backlog    | Bounded tasks with source, scope, owner, dependencies and observable Done criteria.                                                                                            |
| Ready      | At most three next tasks whose dependencies are accepted or absent.                                                                                                            |
| Building   | One current task; record its last result and exact re-entry action before switching.                                                                                           |
| Verify     | Implementation or artifact exists; the actual Done criterion still needs evidence.                                                                                             |
| Executed   | The task's real acceptance path has run, with result, artifact/commit and residual limits linked.                                                                              |

## Verified planning snapshot

A complete fresh board readback finds 431 open cards: 414 unique execution tasks and 17 milestones.
All 164 catalog requirements and 22 exact native ledger rows map to real execution cards.
There are no missing or duplicate task IDs, and the dependency graph is acyclic.
All 15 originally oversized runtime modules have individual disposition tasks.
The expanded runtime audit adds two FIG code owners with four staged disposition cards
and a separate Kiwi schema review; eight translated catalogs join existing MOD-08. Three
dispositions have bounded executed criteria: MCP and PEN-adapter extractions, and one
explicit model-contract exception.
The original five-root code scope has twelve files above 600 lines. The expanded
3,607-file audit baseline has fourteen oversized code files. After the PEN-adapter
and tab extractions, the current scope has 3,611 files and twelve above 600, including the reviewed
model exception; eleven other oversized code owners remain open. Tab, font and graph candidates are below 600 lines but their
native acceptance remains open.
REF-01 fetches all 24 historical URLs and current navigation: 29 successful requests resolve
to 23 canonical pages. It preserves the original 152 requirements/evidence and adds 12
unaccepted documentation deltas with 20 applicability-first cards. Current schema 2.22
does not change the pinned 2.21 contract. [Refresh evidence](pen-feature-reference/refresh-2026-11-06.md)
records the complete chapter and version disposition.
The six identity workstreams include a copy gate with six smaller source/acceptance tasks.
[MOD-AUDIT-CLOSURE](https://trello.com/c/R0oPWJAa) executes the expanded inventory
criterion: sixteen runtime packages and twenty code owners, including public OAuth and
browser alias modules. [Scope and reproduction](RUNTIME-PACKAGES.md) distinguish optional
service/Node targets, generated/vendor exclusions and nine large data/declaration files.
The new module dispositions remain unaccepted.
A separate [mixed WebKit reliability gate](https://trello.com/c/ech6H0Xm) retains the
failed long-run font/decode paths and passing cold trace controls. Cold passes do not waive
that open editor/beta/terminal dependency.
The two desktop-link/keyboard cards have bounded executed evidence at `4df71f1fb`.
[Desktop setup links](DESKTOP-LINKS.md) records the own destination, translated wrapping and
shared native-link keyboard repair. Its bounded browser checks do not accept native installation.
[FIG text ownership](FIG-TEXT-OWNERSHIP.md) records MOD-16 in Verify: 761 owner tests
and two whole archives retain their output, while the unchanged saved-text visual failure
and live Figma round trip stay open. A separate visual-control card retains that failure.
[FIG payload ownership](FIG-PAYLOAD-OWNERSHIP.md) records MOD-17 in Verify: 761 owner
and 26 Core patch tests pass, and three saved archives retain all decoded records,
blob/image hashes and interpreted values. Live Figma and the visual-control gate remain open.
[Kiwi schema ownership](KIWI-SCHEMA-OWNERSHIP.md) executes one named declaration
disposition without changing source, size or schema version. The recovery/update gate
now has three bounded children: recovery has bounded Executed browser copy/retention
evidence; update prompts and restart feedback have bounded Executed component/controller evidence with source-copy
dependencies accepted. Their UI/controller fixtures do not
qualify native installation or restart.
This proves tracking coverage, not accepted product parity or exhaustive discovery of every native state.

Planning publication, the reproducible runtime audit, own-brand assets, owned diagnostics/log
names and the MCP startup modularization have bounded acceptance evidence linked.
Canonical localized product labels have bounded source/CLI/nine-language browser acceptance.
The discovered command-copy contrast task has bounded executed evidence.
BRAND-COPY-AI has bounded executed copy evidence, including nine code-callback/native-failure
journeys with every provider tunnel rejected by a test-owned local proxy. No real provider
authentication, credential save or inference is accepted. STAB-GPU executes its bounded browser/native resource criterion: twelve document changes,
original state and actual native drawing pixels, bounded contexts, resize, color-space
changes and test-host teardown. The native probe reports no lost contexts or GL/JavaScript
errors. Physical pointer drawing and full Pen UI remain separate. [Canvas evidence](CANVAS-LIFECYCLE.md) records the paths and limits.
MOD-02 is an executed model-contract ownership exception, with no code extraction claimed.
The [disposition](MODEL-OWNERSHIP.md) records its owner, checks and review trigger.
MOD-03 font-manager responsibilities has bounded owner/browser evidence and pending native
acceptance. [Font ownership](FONT-OWNERSHIP.md) records the exact control comparison and limits.
UI-TOAST-REFLOW has bounded executed evidence: 72 translated component captures at two widths
and both themes, six baseline examples, and 18 rebuilt native version-warning journeys.
Manual visual review confirms the message column and grouped controls; automated checks cover
labels, widths, overflow, accessibility and keyboard dismissal. The separate setup/callback
regression passes all 18 native cases with the selected editor handle preserved.
No real provider sign-in or inference is accepted by mocks.
BRAND-COPY is an unaccepted gate in Verify; AI, editor, recovery/update, cloud-client and support
copy journeys have their own child cards.
Documentation refresh (REF-01) has executed its inventory criterion. Graph ownership
(MOD-04) is in Verify, with owner/history/browser/visual/build evidence and unexecuted
native acceptance; [graph evidence](GRAPH-OWNERSHIP.md) records the limits.
BRAND-COPY-EDITOR remains in Verify for native associated-file delivery and mixed WebKit
reliability. The [warning-surface correction](https://trello.com/c/FzA3qbsT) has bounded
executed evidence: actual FIG36 round trips, 72 settled captures, component24/78 captures
and five progress/lifetime checks. Action activation and clipboard contents are not qualified.
MOD-08 panel-catalog ownership remains Verify: its proposed declaration exception retains
all locale/public contracts, but inherited inspector controls require actual-Pen adjudication.
[Catalog evidence](PANEL-CATALOG-OWNERSHIP.md) retains421owner passes, compact6passes and
the4pass/3fail/13notrun inherited-control attempt. MOD-11 has executed its bounded
format-ownership criterion:827owner tests before/after, four browser round trips before/after,
and one isolated native Script-source save/reopen/watch/refusal journey.
[Format evidence](FORMAT-OWNERSHIP.md) retains exact limits. MOD-06 tab-lifecycle ownership
is Verify: 150 owner tests and twelve browser controls pass before and after, with matching
public contracts and cleanup ordering. [Tab evidence](TAB-OWNERSHIP.md) retains the same
three wider app-shard failures on original and extracted entries. The isolated control
distinguishes two stale native test contracts from an unproven cross-file backdrop failure.
[Native test contracts](https://trello.com/c/btVgS7TP) and
[backdrop isolation](https://trello.com/c/bd0qkKEQ) execute their bounded test-control
criteria. The [control record](APP-TEST-CONTROLS.md) retains paired failures, the two-file
reproduction, scoped cleanup and the subsequent 1,955 passing app-shard tests. Neither
changes production behavior or accepts native delivery. Both remain required beta and
terminal dependencies with linked evidence. Menu-schema modularization (MOD-13) remains Verify behind the Commands causal gate; TEST-PAGE-NAV is Executed. FMT-09-DRIFT is the sole Building task; IO-13-EXPORT is Verify behind it; STAB-COMMAND-MENU remains unaccepted in Verify. Mixed WebKit reliability is Verify. Font and graph candidates remain Verify. An earlier native graph/text batch has
four hidden-window failures; that run's OS read found the desktop locked. Those
failed/unexecuted input criteria do not erase the earlier successful native resource path.
The interrupted zero-size icon work retains its failed wider-run receipts and dependencies.
The delivery snapshot is 364 Backlog, 0 Ready, 1 Building, 12 Verify and 37 Executed, plus 17 milestones.
DELIVERY-LFS has bounded executed current-checkout fixture delivery: all twelve objects
are fetched from the own private endpoint into empty independent storage, with matching
SHA-256/sizes and LFS integrity checks. Historical object closure is not qualified.
[Delivery details](CHECKOUT.md) retain the exact scope.
UI-SPLIT-HEADER separately records toolbar/inspector overlap blocking pane Close controls.
FONT-EXPORT-BOUNDS, FONT-LOCAL-PICKER and FONT-CJK-REPAINT separately record existing
font acceptance failures. Exact original-versus-refactor controls reproduce the same three
broader workflow failures; ten named pre-refactor visual controls pass afterward in both engines.
The terminal gate depends on all 413 other required execution tasks.
The board retains 17 milestones, 164 mapped requirements and 22 mapped native rows.
No branding milestone or product-parity feature group is fully accepted.

## Control loop

At each accepted card, meaningful interruption or new requirement: reconcile the actual result,
update dependencies and evidence, then choose the next dependency-free action. Split independent
failures into bounded tasks before expanding a card. Preserve historical comments and prior evidence.

The [original acceptance card](https://trello.com/c/WwkmCAiU) remains a milestone with its history.
The new full-parity execution gate depends on every other required task. A private beta has a
separate core-journey gate and explicit limits. Neither a green build nor published documentation
earns feature acceptance. GitHub Actions remains disabled; the PR stays draft.

Recovery copy has executed its bounded browser criterion: 76 passing cases, 72 inspected
captures and unchanged retained-byte controls across nine locales and two engines. The
[record](RECOVERY-COPY.md) preserves earlier failures and the intentionally interrupted
baseline. The source and record are published at
[`a289fe255`](https://github.com/jpoindexter/open-pen/commit/a289fe25500786f12e5ce9fe68070192bb295b29);
the recovery card is Executed for this bounded criterion. Update prompts have bounded Executed component evidence published at
[`9d399a4ab`](https://github.com/jpoindexter/open-pen/commit/9d399a4abaa9ba1c465b38fdaf00965535b82ed1);
the [record](UPDATER-COPY.md) retains 36 passing cases and 234 inspected captures. Restart feedback has bounded Executed controller/component evidence at
[`4006503a6`](https://github.com/jpoindexter/open-pen/commit/4006503a6f051a7a76e7517bf7d0c7d0d648ed99);
its [record](RESTART-COPY.md) retains 36 passing cases and 54 inspected captures. [VERIFY-TOAST-SHORT](https://trello.com/c/f3kDECKO) allocates the
unmeasured short-error grouping; the terminal gate now has all 413 other tasks as dependencies.
This is not a new beta feature prerequisite or actual-Pen visual acceptance.

Fresh 2026-11-07 paginated inventories and permission readbacks verify Actions disabled on
all 199 personal repositories and both previously authorized THEFT-DEV repositories (201 total).
No setting change is needed. This refresh does not scan or claim cancellation of running jobs.

The parent recovery/update/restart copy gate is Executed only for its three published
children's copy criteria: 148 passing browser cases and 360 inspected captures across
their explicitly documented locale/theme/engine scopes. Those totals do not broaden native
or design acceptance. Support-copy work is split into five named owners rather than one
implementation card; browser guidance, CLI and WebMCP metadata have bounded Executed evidence.
ACP and native-engine advice have bounded Executed evidence; their support acceptance gate has bounded Executed reconciliation and portal copy has bounded Executed evidence. All original support criteria remain on the parent gate.

[Browser support](BROWSER-SUPPORT-COPY.md) has published source and exact post-publication
remote README/template readback at `59e02516b`. All 35 browser cases and 65 live owner tests
pass; all 35 captures are inspected. Modern UA/capability fixtures and intercepted link
activation qualify this path only. Both requested color schemes keep the existing dark
notice; distinct light styling, historical engines, native delivery and full branding remain open.

CLI help inspection discovers missing subcommand metadata names: Citty falls back to the
local entry script path. The CLI card publishes its bounded fix at `f5eef8e84`; [evidence](CLI-COPY.md) retains
98 passing help invocations and 46 passing owner tests. The separate
Executed task, BRAND-STORYBOOK-ERROR, publishes its inherited error-label correction at
`881d0b7e5`; [actual parser/writer controls](STORYBOOK-ERROR-COPY.md) preserve invalid, valid and
unrelated file bytes while changing only the app name.
Its manifest filename and generated path namespace remain compatibility identities.
The full branding and terminal gates depend on that new diagnostic task.

[ACP failure presentation](ACP-FAILURE-COPY.md) has bounded Executed controller/SDK evidence
at `c65a7374f`: ten isolated checks and 33 owner tests pass. Structured error context and
auth guidance are retained, with early child cleanup for the simulated rejected-outcome
seam. No natural watcher rejection, physical CLI/provider/native UI or full parity is inferred.
All 201 authorized repositories read back with GitHub Actions disabled on 2026-11-09.

[Native support advice](NATIVE-SUPPORT-COPY.md) has bounded Executed simulation evidence
at `368f67444`: 24 cases and inspected captures, 65 support-owner tests and ten matching
frozen inputs. Direct environment fixtures bypass detection and physical native opening.
The [parent support record](SUPPORT-COPY-ACCEPTANCE.md) reconciles all five published owners
against the preserved original criteria at `d30381b16`; portal copy is Executed at `5e68a7668`; MOD-13 is Verify.

[Portal copy](PORTAL-COPY.md) has bounded Executed evidence at `5e68a7668`: 72 browser
cases, 324 inspected region/cell captures, 360 canonical-label checks and 21 portal-owner
tests. Actual pages/controllers use local document-routing and API fixtures, not real
authentication/backend/native delivery. Real service identities remain. FMT-09-DRIFT is the sole
Building task; IO-13-EXPORT is Verify behind it; STAB-COMMAND-MENU remains unaccepted in Verify; editor-copy remains Verify behind the unchanged mixed WebKit reliability gate.

[Pen 1.2.22 inventory](pen-feature-reference/update-1.2.22-2026-11-09.md) preserves the
complete REA extraction and 182 changed-path dispositions, with 31 source-anchored findings.
Sixteen new workflow cards and REF-03 join the existing card allocations; all 412 task IDs
and dependencies are reconciled against a complete 429-card readback. Current-reference
checks name 1.2.22; historical 1.2.21 receipts retain their original scope. The schema and
backend/runtime gaps remain gated. Raw proprietary resources/private native captures stay
ignored local evidence. No migration or new provider/service behavior is implemented by this catalog.

The [menu catalog candidate](MENU-SCHEMA-OWNERSHIP.md) has passing declaration, owner,
build and type/architecture controls. Its retained before/after browser failures remain open
on TEST-PAGE-NAV and STAB-COMMAND-MENU; it is not accepted from line reduction or native
JSON equality. The new reference adds distinct menu membership changes, including SVG.

REF-03 records bounded Executed inventory evidence at `cc33e07c9`. Its complete archive/outer
byte comparisons and 31 findings are independently reviewed; private draft PR/blob readback
and Actions-off checks pass. New workflow, semantic/backend and full parity gates stay open.

[Page-navigation control](PAGE-NAVIGATION-CONTROL.md) is Executed at `3bf51b270`, with
16 canonical Chromium passes, source/caller review and unchanged timing/assertions.
FMT-09-DRIFT is the sole Building task; IO-13-EXPORT is Verify behind it; STAB-COMMAND-MENU remains unaccepted in Verify. The additional prior detachment remains
unclassified; MOD-13 and mixed WebKit reliability remain Verify.

The [traced menu control](COMMAND-MENU-CONTROL.md) executes the same 16 canonical cases
with current and original schema: both pass with scoped focus/pointer instrumentation.
No detachment reproduces and no production fix is made. STAB-COMMAND-MENU moves to Verify
with its causal criteria unmet; MOD-13 remains Verify. SVG checks expose the current 2.22 reader prerequisite;
FMT-09-DRIFT is now Building and IO-13-EXPORT is Verify behind it. All temporary test/schema changes are restored byte-exactly.

The [2.22 reader control](FORMAT-2-22-CONTROL.md) retains the actual native reference
SVG/ZIP outputs, a real FileOpen rejection, owner red/green checks and a successful
browser import/export capture after the bounded reader candidate. Current SVG output
still contains live text and merges multiple targets; neither SVG nor full format parity
is accepted. Notes/Prompt/Context and native round-trip criteria remain open.

Two independently bounded [PEN text repairs](PEN-TEXT-ROUNDTRIP.md) add
IO-PEN-TEXT-METRICS and IO-PEN-FONT-WEIGHT with bounded Executed evidence at `85f730dff`. All 414 task IDs
and 413 terminal dependencies reconcile against the complete 431-card readback. Font
readiness/ambient measurement and weight wire type have separate actual regressions,
owner checks, browser controls and native-Pen saved-copy comparisons. General typography,
FMT-09-DRIFT, SVG, native Open Pen and full parity remain open.

The text repairs are published at `85f730dff` with exact private draft head/body readback
and Actions disabled. Both child cards execute only their defined fixture/contracts.
FMT-09-DRIFT stays Building for current Note and preserved legacy Prompt/Context
qualification; SVG, menu and mixed WebKit gates remain unaccepted.

The [initial Note control](NOTE-REFERENCE-CONTROL.md) adds rendered color/sizing/export
evidence while the Mac is locked. Its service mutations are initially unsaved. A later
native reference follow-up observes color fields, text/history and Save As/Close/FileOpen
for the owned fixture, with identical reopened frame RGBA bytes. No Open Pen Note adapter
or state promotion follows; the legacy Context-named fixture contains a frame and does
not establish removed Context-node migration.

The [SVG selection repair](SVG-SELECTION-CONTROL.md) reuses batch ZIP delivery and adds
SVG to the generated native export menu. New File-menu download checks pass in Chromium
and WebKit. The broader run retains 30 passes, one WebKit store-not-ready failure and one
unrun serial case; isolated original/candidate WebKit controls both pass all 15 cases.
That failure remains unclassified. IO-13-EXPORT stays Verify, MENU-FILE stays Backlog,
and full native/menu/rendering acceptance is unchanged.

The [REA/Hopper native catalog](pen-feature-reference/native-1.2.22-2026-11-09.md)
compares all 39 retained changed native files: 38 match outside signature data; the MCP
helper has code changes. All 5,897 Hopper procedure artifacts are verified, and named Go
metadata corroborates the existing URI/save tasks. Compiler entries without exact Hopper
matches, unbaselined files, runtime availability and full native/source parity stay open.

## Note qualification breakdown, 2026-11-09

Five new independently scoped cards split Note reference round-trip, Fill sizing, component controls, reusable-ref promotion and strict rendering acceptance. Each description is read back exactly after creation; all remain Backlog with explicit current implementation/evidence limits, and their links are in TASKS.md. The prior 431-card readback is retained as history; adding these cards yields 436 open cards and 419 execution tasks before a fresh complete reconciliation. No feature is accepted by card creation.

## Note candidate and native type-gate reconciliation

The final complete board readback returns 437 open cards: 420 execution tasks and 17 milestones, with 369 Backlog, 0 Ready, 2 Building, 12 Verify and 37 Executed. The five Note cards retain their separate scope; VERIFY-NATIVE-TYPES separately records 67 errors in eight other native test files. The Note unit reports 0 errors in that compilation boundary, but the full native type gate still fails. The independent candidate executes 422 owner tests, 35 browser cases and one isolated native component/history workflow; these do not waive remaining Note Fill, reusable-ref promotion, strict raster, exact UI or full native acceptance. Historical planning snapshots above remain retained.

The subsequent single-task handoff keeps all 437 cards open and unaccepted state unchanged except scheduling: 370 Backlog, 0 Ready, 1 Building, 12 Verify, 37 Executed and 17 milestones. VERIFY-NATIVE-TYPES is the only Building card; DRAW-16-AUTHOR and FMT-09-DRIFT return to Backlog with their partial evidence intact. Their six new dependencies remain included in PARITY-ALL. The isolated Note candidate is published to the private draft; Actions remains disabled.

## Native compiler boundary, 2026-11-09

The [native type control](NATIVE-TEST-TYPE-CONTROL.md) executes the strict native compiler with zero errors after replacing the hand-maintained store facade with canonical app declarations. Source/Vue and general test types, architecture and 22 fresh-process native cases pass. The former 67-error gate is Executed for that bounded criterion. The failed retained-app sequence is preserved under a new independent task; cold passes do not establish its cause or close mixed-session acceptance.

A fresh complete board readback returns 438 open cards: 421 execution tasks and 17 milestones, with 370 Backlog, 0 Ready, 1 Building, 12 Verify and 38 Executed. STAB-NATIVE-SEQUENCE is the only Building task and is added to PARITY-ALL. No Note rendering, Fill, reusable-reference or full-parity gate is accepted by this type repair.

The combined workspace check reaches secret scanning and fails on ten Graphify cache hash entries; each is recomputed as the corresponding current file's path-salted content digest. The scanner remains unchanged. The clean candidate checkout is the publication check; its result is recorded separately. Private cache/evidence and unrelated icon work stay outside the candidate.

## Canonical rectangle publication gate

Clean candidate `960b3ec1e` passes native typing and the unchanged secret scan, then stops at the existing duplicate Box/PreviewBounds shape. [MOD-RECT](https://trello.com/c/OJdXzRFc) replaces those two declarations with the shared Scene Graph Rect contract in `1306f6cf2`. Emitted JavaScript is byte-identical in both files; the exact candidate owner selection executes 13 tests and 52 assertions across two files, and the unchanged shape checker reports no duplicates. The earlier unqualified Bun path selection also discovered the comparison checkout; its 26-pass result is retained as old/current evidence rather than candidate-only acceptance.

The complete 439-card readback has 422 execution tasks and 17 milestones: 371 Backlog, 0 Ready, 1 Building, 12 Verify, 38 Executed. MOD-RECT is Building while the clean combined check runs; STAB-NATIVE-SEQUENCE returns to Backlog with its failed and cold-control receipts intact. PARITY-ALL includes the new gate. Full parity remains open.

## Final clean gate and bounded dispositions

Candidate `1306f6cf2` completes the full clean combined check with a red result at its final unchanged duplication gate: five groups, 39 lines. All preceding gates pass, including native/source/general typing, secrets, type shapes, architecture and tool suites. MOD-RECT is Executed for its bounded criterion with the independent later failures recorded. The next repairs separate OAuth outcome validation, an agent-connection story fixture, Script render-target capture, PEN mesh-point projection and visible generated-output traversal; each has its own owner, preserved semantics and unchanged-checker acceptance.

The fresh complete board readback returns 444 open cards: 427 execution tasks and 17 milestones, with 375 Backlog, 0 Ready, 1 Building, 12 Verify and 39 Executed. MOD-DUPES-AUTH is the only Building task. All five new duplication tasks and MOD-RECT are terminal dependencies of PARITY-ALL. The native retained-session failure remains separate and unclassified; none of these dispositions accepts full native, Note raster, beta or full Pen parity.
