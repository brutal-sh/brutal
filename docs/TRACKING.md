# Tracking

Updated: 2026-11-07. The full independent design and functionality parity goal remains active.

Repository: [private Open Pen repository](https://github.com/jpoindexter/open-pen), branch `feat/open-pen`.
Board: [Open Pen — independent design editor](https://trello.com/b/Z2u82Q4O/open-pen-independent-design-editor), private.

The [PRD](PRD.md) owns the outcome, constraints and release criteria.
The [task index](TASKS.md) links all 377 execution cards; the [modularity audit](MODULARITY.md)
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

A complete fresh board readback finds 394 open cards: 377 unique execution tasks and 17 milestones.
All 164 catalog requirements and 22 exact native ledger rows map to real execution cards.
There are no missing or duplicate task IDs, and the dependency graph is acyclic.
All 15 originally oversized runtime modules have individual disposition tasks.
The expanded runtime audit adds two FIG code owners with four staged disposition cards
and a separate Kiwi schema review; eight translated catalogs join existing MOD-08. Two
dispositions are executed: one cohesive extraction and one explicit model-contract exception.
The original five-root code scope has twelve files above 600 lines. The expanded
3,607-file scope has fourteen, including the reviewed model exception; thirteen other
oversized code owners remain open. Font and graph candidates are below 600 lines but their
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
This proves tracking coverage, not accepted product parity or exhaustive discovery of every native state.

Planning publication, the reproducible runtime audit, own-brand assets, owned diagnostics/log
names and the MCP startup modularization have bounded acceptance evidence linked.
Canonical localized product labels have bounded source/CLI/nine-language browser acceptance.
The discovered command-copy contrast task has bounded executed evidence.
BRAND-COPY-AI has bounded executed copy evidence, including nine code-callback/native-failure
journeys with every provider tunnel rejected by a test-owned local proxy. No real provider
authentication, credential save or inference is accepted. STAB-GPU has a browser-verified
implementation in Verify; actual native drawing remains unexecuted because macOS reports
a locked desktop. [Canvas evidence](CANVAS-LIFECYCLE.md) records the paths and limits.
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
MOD-08 panel-catalog ownership is the sole Building task. Font and graphics candidates remain in Verify.
The interrupted zero-size icon work retains its failed wider-run receipts and dependencies.
The delivery snapshot is 357 Backlog, 0 Ready, 1 Building, 5 Verify and 14 Executed, plus 17 milestones.
DELIVERY-LFS has bounded executed current-checkout fixture delivery: all twelve objects
are fetched from the own private endpoint into empty independent storage, with matching
SHA-256/sizes and LFS integrity checks. Historical object closure is not qualified.
[Delivery details](CHECKOUT.md) retain the exact scope.
UI-SPLIT-HEADER separately records toolbar/inspector overlap blocking pane Close controls.
FONT-EXPORT-BOUNDS, FONT-LOCAL-PICKER and FONT-CJK-REPAINT separately record existing
font acceptance failures. Exact original-versus-refactor controls reproduce the same three
broader workflow failures; ten named pre-refactor visual controls pass afterward in both engines.
The terminal gate depends on all 376 other required execution tasks.
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
