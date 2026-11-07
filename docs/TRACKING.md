# Tracking

Updated: 2026-11-07. The full independent design and functionality parity goal remains active.

Repository: [private Open Pen repository](https://github.com/jpoindexter/open-pen), branch `feat/open-pen`.
Board: [Open Pen — independent design editor](https://trello.com/b/Z2u82Q4O/open-pen-independent-design-editor), private.

The [PRD](PRD.md) owns the outcome, constraints and release criteria.
The [task index](TASKS.md) links all 392 execution cards; the [modularity audit](MODULARITY.md)
records the measured review queue. Requirements come from the [feature catalog](pen-feature-reference/README.md)
and the [native screen/menu ledger](PARITY-STATE-MATRIX.md), using actual Pen 1.2.21 as the reference.

## Board organization

| List | Purpose |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Milestones | The 15 original cards retain their history; two new milestones track own branding and modularization. These broad cards are not executable units or current acceptance claims. |
| Backlog | Bounded tasks with source, scope, owner, dependencies and observable Done criteria. |
| Ready | At most three next tasks whose dependencies are accepted or absent. |
| Building | One current task; record its last result and exact re-entry action before switching. |
| Verify | Implementation or artifact exists; the actual Done criterion still needs evidence. |
| Executed | The task's real acceptance path has run, with result, artifact/commit and residual limits linked. |

## Verified planning snapshot

A complete fresh board readback finds 409 open cards: 392 unique execution tasks and 17 milestones.
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
terminal dependencies with linked evidence. Browser support guidance (BRAND-SUPPORT-BROWSER) is the sole Building task; mixed WebKit reliability is Verify. Font and graph candidates remain Verify. A later native graph/text batch has
four hidden-window failures; a fresh OS read confirms the desktop is locked again. Those
failed/unexecuted input criteria do not erase the earlier successful native resource path.
The interrupted zero-size icon work retains its failed wider-run receipts and dependencies.
The delivery snapshot is 354 Backlog, 3 Ready, 1 Building, 9 Verify and 25 Executed, plus 17 milestones.
DELIVERY-LFS has bounded executed current-checkout fixture delivery: all twelve objects
are fetched from the own private endpoint into empty independent storage, with matching
SHA-256/sizes and LFS integrity checks. Historical object closure is not qualified.
[Delivery details](CHECKOUT.md) retain the exact scope.
UI-SPLIT-HEADER separately records toolbar/inspector overlap blocking pane Close controls.
FONT-EXPORT-BOUNDS, FONT-LOCAL-PICKER and FONT-CJK-REPAINT separately record existing
font acceptance failures. Exact original-versus-refactor controls reproduce the same three
broader workflow failures; ten named pre-refactor visual controls pass afterward in both engines.
The terminal gate depends on all 391 other required execution tasks.
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
unmeasured short-error grouping; the terminal gate now has all 391 other tasks as dependencies.
This is not a new beta feature prerequisite or actual-Pen visual acceptance.

Fresh 2026-11-07 paginated inventories and permission readbacks verify Actions disabled on
all 199 personal repositories and both previously authorized THEFT-DEV repositories (201 total).
No setting change is needed. This refresh does not scan or claim cancellation of running jobs.


The parent recovery/update/restart copy gate is Executed only for its three published
children's copy criteria: 148 passing browser cases and 360 inspected captures across
their explicitly documented locale/theme/engine scopes. Those totals do not broaden native
or design acceptance. Support-copy work is split into five named owners rather than one
implementation card; browser guidance is Building, CLI/ACP/WebMCP are Ready, and native-engine
advice is Backlog. All original support criteria remain on the parent gate.
