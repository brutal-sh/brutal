# Tracking

Updated: 2026-11-10. The full independent design and functionality parity goal remains active.

Repository: [private Open Pen repository](https://github.com/jpoindexter/open-pen), branch `feat/open-pen`.
Board: [Open Pen — independent design editor](https://trello.com/b/Z2u82Q4O/open-pen-independent-design-editor), private.

The [PRD](PRD.md) owns the outcome, constraints and release criteria.
The [task index](TASKS.md) links all 431 execution cards; the [modularity audit](MODULARITY.md)
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

## Shared native OAuth outcome

`cf9d319cf` consolidates the identical native callback schema into the shared sign-in owner. Both callbacks import it directly; the provider-specific redirect and callback bodies retain their original semantics. The native result still rejects browser-only mismatch outcomes. Exact owner selections pass 39 tests and 93 assertions across nine files in both workspaces; source/Vue/general/native types, architecture, clean normal build and independent review pass. The initial fixture typing failure is retained and corrected with literal inputs. No live OAuth, account or credential behavior is accepted by these checks.

The unchanged duplication check in both workspaces now reports four other groups and 31 lines. MOD-DUPES-AUTH is Executed for its bounded criterion; MOD-DUPES-STORIES is the only Building task. The complete board remains 444 open cards and 427 unique execution tasks plus 17 milestones: 374 Backlog, 0 Ready, 1 Building, 12 Verify and 40 Executed. The last complete clean combined check remains `1306f6cf2`, red at five groups; the scoped follow-up does not replace it with an all-green result. Remaining duplication, native mixed-session, Note raster and full parity acceptance stay open.

## Connection fixture and readable sign-in actions

Source `b3c3ab6a1` shares the connection fixture while retaining all 25 original data/setup/template/play captures byte-exactly. Its real UI walk discovers four dark sign-in contrast errors, reproduced by the exact original story source. The separate `c16ce89b6` repair changes only the local Cancel/Change foreground. The final canonical run passes all 25 connection states per theme and all 18 translated grids (20 cases, no skips, retries or failures), with changed-state captures inspected. Source/Vue/general types, architecture, lint, bounded independent review and the clean normal candidate build pass. Unchanged duplicate checks in both workspaces retain three other groups/20 lines; the story group is absent.

The complete readback finds 445 open cards: 428 unique execution tasks and 17 milestones, with 373 Backlog, 0 Ready, 1 Building, 12 Verify and 42 Executed. MOD-DUPES-STORIES and A11Y-SIGNIN-CONTRAST meet their bounded criteria. MOD-DUPES-SCRIPT is the sole Building task; PAINT and GENERATED remain Backlog. The new contrast task is indexed and included in PARITY-ALL's 427 other execution dependencies. Private receipts and the minimal complete board readback remain under `local-evidence/story-fixture-dedup-2026-11-09/`.

The last complete clean combined check is still `1306f6cf2`, red at its final five-group duplication gate. The scoped clean build/duplication follow-up does not establish an all-green combined check. Real OAuth, native retained-session reliability, strict Note raster and full design/functionality parity remain unaccepted. No production install, merge or release.

## Script runtime candidate — 2026-11-10

`56ce0e655` separates Script materialization from scheduling/source-watch orchestration; `bc6d56c3b` corrects receiver-free callback declarations and explicit no-result returns found by the clean build's full typed lint. The first failed build and initial baseline QuickJS timeout remain retained, without weakened assertions or thresholds. Both current workspaces pass 24 owner cases/134 assertions across six files. Source/Vue/general/native types, architecture, appropriate lint, bounded independent review and the clean normal bundle build pass. All 34 Chromium/WebKit workflows pass on the extracted behavior with strict existing baselines unchanged; the callback follow-up preserves runtime semantics. Seven paired placeholder IO requests remain byte-identical, and actual placeholder exports are inspected.

The unchanged duplicate check now reports two other groups/15 lines; Script capture is absent. The fresh isolated native build and single Script save/reopen/source-watch/refusal case pass. MOD-DUPES-SCRIPT meets its bounded criterion and is Executed; MOD-DUPES-PAINT is the sole Building task, with MOD-DUPES-GENERATED in Backlog. The complete board readback returns 445 open cards: 428 unique execution tasks plus 17 milestones, with 372 Backlog, 0 Ready, 1 Building, 12 Verify and 43 Executed. The task table and all 427 terminal dependencies reconcile with this allocation. [Scope and live qualification](SCRIPT-PARITY.md#runtime-ownership-continuation--2026-11-10) retain the exact checks and limits. The last complete clean combined check remains `1306f6cf2`, red at its final five-group duplication gate. Full native, strict reference raster and full design/functionality parity remain open.

## PEN projection and literal duplicate counts — 2026-11-10

`56d3e4c85` executes MOD-DUPES-PAINT's bounded format-ownership criterion: original/current codec/reopen bytes match, 23 focused controls pass, shared/clean package selections pass 322/319 cases, clean bundle and types/typed lint/architecture pass, and 14 browser controls plus two clean repeats retain their existing baselines. Actual clean frames are inspected. Three additional shared cases belong to unrelated preserved icon work. [Mesh scope and limits](MESH-PARITY.md#pen-point-projection-ownership--2026-11-10) retain the corrected overflow test, paired original control and raw reference mismatch.

The unchanged full duplicate command now exits zero while reporting one known generated-output clone/eight lines at percentage zero. A whole-root JSON report confirms that count; the installed explicit nonzero-on-clone policy exits one. VERIFY-DUPES-ZERO records that separate gate correction and depends on GENERATED for the final current zero-clone corpus control. No threshold/filter/suppression changes are part of the paint extraction, and neither exit zero nor bounded task acceptance establishes a green complete quality gate.

The fresh complete board readback contains 446 open cards: 429 unique execution tasks plus 17 milestones, with 372 Backlog, 0 Ready, 1 Building, 12 Verify and 44 Executed. MOD-DUPES-PAINT is Executed, MOD-DUPES-GENERATED is the sole Building task, and VERIFY-DUPES-ZERO stays Backlog. The index and all 428 terminal dependencies reconcile. The last complete clean combined check remains the earlier `1306f6cf2` receipt; source extraction, native mixed-session reliability, strict reference pixels and full design/functionality parity remain separate open gates.

## Generated-output traversal — 2026-11-10

Source `865f693c3` shares visible descendant traversal while retaining Script/GLSL
readiness, errors and ordering. Original/current expanded owner controls both pass
1,373 cases/10,475 assertions, repeated in the clean checkout. Normal build, types,
architecture, corrected test lint and six rebuilt Chromium export workflows pass.
The unchanged detector reports zero clones. MOD-DUPES-GENERATED is Executed.

VERIFY-DUPES-ZERO is Building at `4bfdeae7c`: the actual canonical full-root command
now rejects the original one-clone/displayed-zero-percent control and accepts the
restored zero-clone candidate. Its complete clean combined check exits zero with
literal zero clones. The first full-unit run has incomplete LFS fixtures; those
failures stay retained pending materialization and a qualified rerun.
[Evidence boundaries](GENERATED-OUTPUT-OWNERSHIP.md) preserve original failures,
source restoration, current scanner limits and unexecuted native/reference gates.

The complete clean combined check at `4bfdeae7c` exits zero through its stricter final
zero-clone gate. VERIFY-DUPES-ZERO is Executed; STAB-NATIVE-SEQUENCE is the sole Building
task for cold/retained native lifecycle controls. All 12 clean-checkout LFS pointers
are materialized locally and hash-verified before the separate full-unit rerun.
Actions readback confirms all 199 owned repositories disabled, with zero unknowns.
No native runtime or full product acceptance follows from these engineering gates.

Fresh complete readback: 446 open cards = 429 execution tasks plus 17 milestones;
370 Backlog, 0 Ready, 1 Building, 12 Verify and 46 Executed. All 429 task IDs,
list states and links reconcile with the task table. The 428 terminal dependencies
remain required; PARITY-ALL stays Backlog and the active full goal remains open.

The materialized canonical full-unit rerun exits one in CLI/Core/render: one inherited
Storybook prose assertion, three incomplete renderer Surface doubles and the known
strict Note mismatch (12,792 channels). All five reproduce at previous `57928f502`
using the same real fixtures; no affected production/test path changes in this unit.
Outside-manifest fixture files are independently read back unchanged. New narrow
Backlog cards VERIFY-STORYBOOK-REFUSAL and VERIFY-GPU-SURFACE-CONTRACTS own the stale
contracts; DRAW-16-NOTE-RASTER retains the actual pixel gap. Full unit acceptance
remains failed, not waived by the clean static check.

After those two residual allocations, the final complete readback is 448 open cards:
431 unique execution tasks plus 17 milestones; 372 Backlog, 0 Ready, 1 Building,
12 Verify and 46 Executed. All IDs, states, links and 430 terminal dependencies
reconcile exactly; the native-session card remains sole Building.

## Exact unit selection and contract controls — 2026-11-10

[Engine test controls](ENGINE-TEST-CONTROLS.md) execute the bounded CLI refusal,
unit runner selection and renderer Surface-double criteria. The complete exact
CLI shard passes122cases/25files and complete render shard passes391cases/66files,
including heavy cache. A nested-copy control proves the runner excludes ignored
historical copies and still propagates a selected failure. Original failures,
initial formatting rejection and independent reviews remain retained. No
production renderer, parser, output format or baseline is changed. The last full
unit receipt remains failed; these scoped follow-ups do not replace that result.

A complete449-card readback reconciles432executiontasks and17milestones:370Backlog,
0Ready,1Building,12Verify and49Executed. All431otherexecutiontasks are terminal
dependencies; the new exact-path runner card is included. STAB-NATIVE-SEQUENCE
resumes soleBuilding after explicit shared-desktop release, with system mute
preserved. Its recovery/reload candidate remains uncommitted and full retained
native acceptance remains open. Current Pen1.2.22 archive/native extraction is
reverified locally; full design/functionality parity stays open.

[Retained native qualification](NATIVE-RETAINED-SEQUENCE.md) records the uncommitted
recovery/reload and address-input candidate, preserved recovery payloads and paired
native controls. The retained prefix passes8cases and fails1menu-focus case; a
shorter diagnostic pass does not accept that intermittent behavior. The native
sequence remains soleBuilding while its complete retained control runs. Fresh
owned-repository inventory now reads201/201Actionsdisabled,0unknown; previous
199-repository receipts above remain historical.

The full retained native attempt subsequently fails first at an import notification
check, with later window-loss cascades retained. Failure-only observation finds
the required cross-origin error present beside an older success alert. The
assertion now searches the alert collection without weakening graph/selection/page
invariants; complete native import passes. The bounded follow-up passes5cases and
fails1editor-menu-focus case. Neither that pass nor source review accepts full
retained reliability; the13-file candidate stays uncommitted.

The13-file native candidate is subsequently saved at`c791e333a` for review and
recovery, without accepting STAB-NATIVE-SEQUENCE. Fresh-diagnostic import executes
its complete native case successfully; an unchanged existing alert cannot satisfy
the check. A diagnostic prefix passes9cases while the canonical menu-focus failure
and later native WebDriver window loss remain open. The separate checkout advances
to that source for the complete clean check. An initial check accidentally started
from the shared directory is interrupted and retained as non-acceptance evidence;
the corrected invocation verifies its isolated directory and exact HEAD first.

The corrected complete clean check at`c791e333a` exits0 through its strict final
duplication gate with literal0clones; unrelated icon work is excluded and the
tracked comparison tree is clean. A complete unit rerun is now separate work.
No native reliability or full-parity gate is accepted by the engineering result.

The complete clean unit run at`c791e333a` exits1 with the strict Note raster
mismatch plus three app cases: shader-URL credentials, representation-only library
hash normalization and startup-update toast state. The three app owners pass all
9cases together in isolation, so cross-file influence remains under investigation.
The prior-source full-app control is required before attributing these failures
to the native candidate or declaring them resolved. No full-unit acceptance.

Prior-source full-app control at `5d1a81a5f` reproduces the same three failures
(1,961 passes/three failures/342 files). Separate shader request attribution
(`f478dc76f`) and existing-toast state (`2a15a2431`) controls execute their seeded
original/current criteria without production loader/updater changes.

Library source `18a464656` corrects the identified child TEXT measurement delta
while preserving stored hashes, descriptors, authored changes and integrity
validation. The library cohort passes 54 cases; complete app passes 1,964;
Chromium and WebKit each pass both actual publish/save/reopen/offline consumption
workflows. The normal build and scoped static/review gates pass. Complete current
clean quality and full unit reruns remain separate pending gates. No visual or
native parity is inferred. APP-TEST-CONTROLS.md retains precise evidence limits.


The fresh complete board readback reconciles 452 open cards: 435 execution tasks
and 17 milestones; 370 Backlog, one Building, 12 Verify and 52 Executed. All 434
other task IDs remain terminal dependencies. The library repair is Executed for
its bounded criterion; STAB-NATIVE-SEQUENCE resumes sole Building. Owned-repository
inventory is refreshed from authenticated owner/admin-organization listings:
201/201 Actions disabled, zero enabled and zero unknown. No settings mutation.


The complete current clean check at `18a464656` exits zero, including literal
zero clones. The full canonical unit runner is then started from the same exact
tracked-clean checkout. No native/browser run overlaps its build/check cycle.
Native retained-session and strict Note acceptance remain open.


The complete unit run at `18a464656` finishes with exit one and sole distinct
failure: strict Note reference raster (expected zero, observed 12,792 changed
channels). Shader/toast/library failures are absent from the complete rerun.
This is current failed whole-unit evidence, replacing no historical failures
and accepting neither exact Note pixels nor native/full Pen parity.


Native re-entry retains passing canonical and observer nine-case prefixes but
reproduces a direct-input NoWindow before address input. The native-command
control demonstrates handles main → empty → main around a loaded child while
the same editor realm/store/canvas stays alive. Frozen 3f76 and current original
9d10742a images both execute that control. NATIVE-DRIVER-MULTIWEBVIEW.md records
the confirmed driver classification and excludes broader crash/focus claims.
The original and paired test-only builds pass. The local driver and companion
repair retains main handles during a loaded child and refuses a truly destroyed
context; two durable native cases pass after cleanup corrections and independent
review. The broader 14-spec retained run still has seven failed specs (18 passing
cases, nine failures), beginning with reload readiness, and no NoWindow response.
Original compiler/control failures remain retained; global dependencies and
production applications/profiles are unchanged. See the driver record for limits.

The fresh complete board has 453 open cards: 436 execution tasks and 17
milestones; 370 Backlog, one Building, 13 Verify and 52 Executed. The new driver
card is the sole Building task; its native parent is Verify and depends on it.
All 435 other execution IDs remain terminal dependencies.
