# Tracking

Updated: 2026-11-06. The full independent design and functionality parity goal remains active.

Repository: [private Open Pen repository](https://github.com/jpoindexter/open-pen), branch `feat/open-pen`.
Board: [Open Pen — independent design editor](https://trello.com/b/Z2u82Q4O/open-pen-independent-design-editor), private.

The [PRD](PRD.md) owns the outcome, constraints and release criteria.
The [task index](TASKS.md) links all 344 execution cards; the [modularity audit](MODULARITY.md)
records the measured review queue. Requirements come from the [feature catalog](pen-feature-reference/README.md)
and the [native screen/menu ledger](PARITY-STATE-MATRIX.md), using actual Pen 1.2.21 as the reference.

## Board organization

| List | Purpose |
| --- | --- |
| Milestones | The 15 original cards retain their history; two new milestones track own branding and modularization. These broad cards are not executable units or current acceptance claims. |
| Backlog | Bounded tasks with source, scope, owner, dependencies and observable Done criteria. |
| Ready | At most three next tasks whose dependencies are accepted or absent. |
| Building | One current task; record its last result and exact re-entry action before switching. |
| Verify | Implementation or artifact exists; the actual Done criterion still needs evidence. |
| Executed | The task's real acceptance path has run, with result, artifact/commit and residual limits linked. |

## Verified planning snapshot

A complete fresh board readback finds 361 open cards: 344 unique execution tasks and 17 milestones.
All 152 catalog requirements and 22 exact native ledger rows map to real execution cards.
There are no missing or duplicate task IDs, and the dependency graph is acyclic.
All 15 originally oversized runtime modules have individual disposition tasks; one is executed
and 14 remain above 600 lines. The six identity workstreams include a copy gate with six smaller source/acceptance tasks.
This proves tracking coverage, not accepted product parity or exhaustive discovery of every native state.

Planning publication, the reproducible runtime audit, own-brand assets, owned diagnostics/log
names and the MCP startup modularization have bounded acceptance evidence linked.
Canonical localized product labels have bounded source/CLI/nine-language browser acceptance.
The discovered command-copy contrast task has bounded executed evidence.
BRAND-COPY-AI has bounded executed copy evidence, including nine code-callback/native-failure
journeys with every provider tunnel rejected by a test-owned local proxy. No real provider
authentication, credential save or inference is accepted. The single Building task is STAB-GPU:
repeated document switching, resource bounds and final browser/native drawing.
UI-TOAST-REFLOW has bounded executed evidence: 72 translated component captures at two widths
and both themes, six baseline examples, and 18 rebuilt native version-warning journeys.
Manual visual review confirms the message column and grouped controls; automated checks cover
labels, widths, overflow, accessibility and keyboard dismissal. The separate setup/callback
regression passes all 18 native cases with the selected editor handle preserved.
No real provider sign-in or inference is accepted by mocks.
BRAND-COPY is an unaccepted gate in Verify; AI, editor, recovery/update, cloud-client and support
copy journeys have their own child cards.
Documentation refresh is Ready; graphics lifecycle stability is Building. The interrupted zero-size
icon work retains its failed wider-run receipts and dependencies.
The delivery snapshot is 332 Backlog, 1 Ready, 1 Building, 1 Verify and 9 Executed, plus 17 milestones.
No branding milestone or product-parity feature group is fully accepted.

## Control loop

At each accepted card, meaningful interruption or new requirement: reconcile the actual result,
update dependencies and evidence, then choose the next dependency-free action. Split independent
failures into bounded tasks before expanding a card. Preserve historical comments and prior evidence.

The [original acceptance card](https://trello.com/c/WwkmCAiU) remains a milestone with its history.
The new full-parity execution gate depends on every other required task. A private beta has a
separate core-journey gate and explicit limits. Neither a green build nor published documentation
earns feature acceptance. GitHub Actions remains disabled; the PR stays draft.
