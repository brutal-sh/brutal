# Open Pen current board reconciliation — 2026-11-16

Current dependency readback also recognizes the singular `Dependency:` label.
Three existing edges now appear in the task table: VERIFY-STORYBOOK-REFUSAL →
BRAND-STORYBOOK-ERROR, VERIFY-GPU-SURFACE-CONTRACTS → STAB-GPU and VERIFY-DUPES-ZERO →
MOD-DUPES-GENERATED. Their predecessors are already Executed. All511 execution IDs,
18primary allocations and510other terminal prerequisites reconcile without unknown
dependencies, cycles or Executed/open-prerequisite contradictions. This does not
infer undiscovered prerequisites or accept additional product behavior.

This readback covers all 529 open cards after the Pen 1.2.23 update catalog allocation and normal Save delivery. It updates current scheduling; the [2026-11-11 audit](BOARD-AUDIT-2026-11-11.md) and intervening execution receipts remain historical. Actual Pen is the reference; OpenPencil is the implementation foundation.

There are 511 execution tasks and 18 milestone gates: 373 Backlog, 0 Ready, 1 Building (STAB-FIG-RECOVERY-WORKER), 50 Verify and 87 Executed. These are workflow states, not a product-parity percentage, an estimate of unbuilt features or a beta date. Full parity and all milestone exits remain unaccepted.

2026-11-15 shared CLI allocation reuses MCP-03-GETAPPSTATE / EXECUTE / READSKILL /
GETSTYLE and MCP-04-BROWSER / AGENTS. CLI-07 explicitly requires these six plus
CLI-05/06. No cards, primary allocations or completion states are added. The
[contract plan](CLI-TOOL-CONTRACTS.md) separates shared semantics from client delivery;
its dependency/readback audit is retained privately.

## Checks actually executed

- Re-read the complete 527-card live board after the 13 update followups, separate normal-delivery and current-schema line leaves, and current status/parent-description updates; current states and complete dependency allocation reconcile, and the delivery/handoff descriptions match their intended bytes. Earlier catalog-description readback remains separately retained.
- Reconcile 511 unique execution IDs to exactly 511 single primary milestone owners. M02 owns 114 tasks, M05 owns 83 and M07 owns 37. M04 now owns65 tasks; remaining ownership is unchanged. An existing Note-raster child link was moved from M02's historical tail into its current primary block; its rendering acceptance stays open.
- Expand PARITY-ALL to all 510 other execution IDs before validating the explicit dependency graph. There are no unknown named prerequisites, reachable cycles or Executed/open-prerequisite contradictions. This checks declared edges, not undiscovered real prerequisites or runtime behavior.
- Preserve 18 open milestones, one Building card and no Ready cards. Catalog allocation alone promotes no feature or release gate. REF-04 has separately executed its bounded catalog criterion; FILE-NATIVE-SAVE-DELIVERY has executed its actual installed save slice.

## New bounded followups

| Task                                                                                                                                  | Primary milestone | Declared prerequisites              | State   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------- | ------- |
| [UPD23-GEN-PENDING](https://trello.com/c/XTrLx7Xo/511-upd23-gen-pending-match-pending-generation-state-and-generate-discard-controls) | M02               | REF-04                              | Backlog |
| [UPD23-GEN-IMAGE](https://trello.com/c/5WiqhSl1/512-upd23-gen-image-generate-a-raster-fill-from-its-pending-operation)                | M02               | UPD23-GEN-PENDING, AI-02            | Backlog |
| [UPD23-GEN-SVG](https://trello.com/c/BvV0tswJ/513-upd23-gen-svg-generate-editable-svg-from-its-pending-operation)                     | M02               | UPD23-GEN-PENDING, UPD23-SVG-SELECT | Backlog |
| [UPD23-GEN-REPLACE](https://trello.com/c/a5Lt3v1v/514-upd23-gen-replace-replace-an-image-background-through-its-pending-operation)    | M02               | UPD23-GEN-PENDING, AI-02            | Backlog |
| [UPD23-SVG-SELECT](https://trello.com/c/5Of2UB2h/515-upd23-svg-select-match-svg-provider-and-model-selection)                         | M05               | REF-04, AI-02                       | Backlog |
| [UPD23-IMAGE-MODELS](https://trello.com/c/HKWyHR64/516-upd23-image-models-reconcile-image-model-choices-and-legacy-selections)        | M05               | REF-04, AI-02                       | Backlog |
| [AI-09-CREATIVE](https://trello.com/c/PV3BZ4pr/517-ai-09-creative-add-and-qualify-creative-iteration-mode)                            | M05               | REF-04, AI-09                       | Backlog |
| [SURF-CHAT-FULLSCREEN](https://trello.com/c/gd5T43yy/518-surf-chat-fullscreen-match-full-screen-chat-and-history-island-round-trip)   | M05               | REF-04, AI-01                       | Backlog |
| [AI-03-STEER-PREF](https://trello.com/c/6Jc0ORzA/519-ai-03-steer-pref-match-always-steer-messages-preference-and-queue-behavior)      | M05               | REF-04, AI-03                       | Backlog |
| [AI-CONTEXT-START](https://trello.com/c/p56nlmao/520-ai-context-start-qualify-lazy-task-context-loading-and-resumed-sessions)         | M05               | REF-04, AI-SKILLS-CONTEXT           | Backlog |
| [UI-10-LANGUAGE-CS](https://trello.com/c/5Pzv6Bo9/521-ui-10-language-cs-qualify-czech-interface-coverage)                             | M02               | REF-04, UI-10-LANGUAGE              | Backlog |
| [UI-10-LANGUAGE-PTBR](https://trello.com/c/zzxjVEtR/522-ui-10-language-ptbr-qualify-brazilian-portuguese-interface-coverage)          | M02               | REF-04, UI-10-LANGUAGE              | Backlog |
| [UI-10-LANGUAGE-ID](https://trello.com/c/h3nf3GpQ/523-ui-10-language-id-qualify-indonesian-interface-coverage)                        | M02               | REF-04, UI-10-LANGUAGE              | Backlog |

The generation-state leaves explicitly exclude recreating the vendor image quota or subscription trigger. They qualify applicable independent pending/retry/imported-operation behavior and real generated output without artificial free-editor limits. Existing DRAW-14/DRAW-15 retain background removal/vectorization; AI-09 retains its Layout/Style base; MCP-03-READSKILL retains the guide-read contract. Native/provider applicability and output acceptance remain separate.

## Evidence and sequencing

The [versioned current reference supplement](pen-feature-reference/update-1.2.23-2026-11-13.md) and [machine catalog](pen-feature-reference/update-1.2.23-2026-11-13.json) allocate 75 added,14 removed and 6 changed message IDs plus guide/source/native findings. Neither source messages nor extraction counts accept features. The independent review corrected presentation/iteration/generation ownership and the task-context overlap before external writes.

Private receipts are retained under `local-evidence/pen-reference-1.2.23/`: `created-cards-verified.json`, compact `board-audit-current.json`, independent review, full native traces/teardown, source dispositions and REA/Hopper exports. Proprietary bytes, user-account/history captures and private evidence are excluded from publication. REA's post-close response reports no open target or pending cleanup.

REF-04 is bounded Executed at private catalog publication `64f61e4cd`. [Normal Save delivery](NATIVE-SAVE-DELIVERY.md) records the subsequently installed `db4e528c`, actual owned Cancel/copy/edit/refusal/OK/retry/reopen, exact original workspace/older recovery preservation and independent review. Its new leaf belongs to M07, which now records 14/36 primary cards Executed. M00 records 4/5; both milestones remain open.

The earlier JPEG and WebP handoffs below retain their historical evidence. Current work is CLI-05; PNG/JPEG/WebP/PDF remain Verify for their explicit open reference/native/connected/standalone criteria. See [PDF qualification](CLI-PDF-EXPORT.md).

FILE-NATIVE-SAVE-UI remains Verify for matched critical-alert pixels. UI-MAC-WINDOW-CONTROLS remains Verify for pointer dragging. The normal installed app now contains the Save correction; broader normal-profile process-loss, native updater, TCC and beta acceptance remain separate. Existing recovery content/profiles, protected icon work, private GitHub/draft PR and disabled Actions remain constraints.

The controller goal stays Active. Product Done still requires every applicable task and matched reference state, PARITY-ALL's own combined acceptance, the normal-installed core journey, and the separate public-beta trust/package/support gates. No catalog publication alone meets that terminal criterion.

New bounded technical prerequisite: [FMT-LINE-2-22](https://trello.com/c/N4z4LJt8/525-fmt-line-2-22-qualify-current-schema-line-serialization), primary M04 and dependent only on REF-04, is Backlog. FMT-01 and FMT-05-PATH consume it. Terminal closure includes it; the temporary legacy-line header exception is not current-schema line acceptance.

## JPEG handoff — 2026-11-13

CLI-04-JPEG moves to Verify with [bounded executed evidence](CLI-JPEG-EXPORT.md),
including the zero-quality correction, strict raster ownership split, complete
static gate, 107 caller cases, four separately enabled heavy cases, 38 browser
cases and 17 actual workspace Node controls. Its actual Pen/native/app-connected
quality/standalone gates remain open. CLI-04-WEBP is the sole Building card. The
complete readback retains 507 single primary owners, 506 terminal prerequisites
and 18 open milestones, with no unknown dependencies, cycles or terminal
contradictions. No new execution card is created or marked Executed in this handoff.

## WebP handoff — 2026-11-13

CLI-04-WEBP moves to Verify with [bounded executed evidence](CLI-WEBP-EXPORT.md):
18 actual workspace Node controls, 75 owner cases and 42 browser cases, including
the actual inspector selector/button/download in both engines. The measured
WebKit browser fallback gap has a qualified source correction; the original two
failures remain retained. Static and production build gates pass. Its current Pen,
native, connected-bridge and standalone-package gates remain open. CLI-04-PDF is
the sole Building card. The index remains 507 single-owner tasks and 18 open
milestones with 506 terminal prerequisites. No task is newly marked Executed.

## PDF handoff — 2026-11-13

CLI-04-PDF moves to Verify with [bounded executed evidence](CLI-PDF-EXPORT.md).
Both actual Node failures are reproduced before their corrections; 148 caller
cases, 44 browser cases, six independently read Node exports and seven actual
failure/refusal controls qualify the candidate. Original startup/image failures
remain retained. Full repository and production build gates pass; high-frequency
resource sampling and actual Pen/native/connected/standalone acceptance stay open.
CLI-05 is the sole Building card. All 507 source states and unique primary owners,
506 terminal prerequisites and 18 allocations reconcile with the full live board.
No new card, Executed promotion, milestone or full-parity acceptance occurs.

## Interactive headless handoff — 2026-11-14

CLI-05 moves to Verify with [bounded executed evidence](CLI-INTERACTIVE.md).
The initial missing command and both review-discovered rollback faults reproduce
before correction. Strict changed-code limits,1,655affected caller cases,39final
parser/caller cases,16actual outside-checkout Node controls, actual terminal
Save/Ctrl-C,62browser cases, full repository/production build and final read-only
review qualify the candidate. Original failed controls remain retained. Pen
API/connected/native/standalone and earlier strict pixel gates remain open.
CLI-06 is the sole Building card. All507source states/owners,18allocations and506
terminal prerequisites reconcile. No new execution card or Executed promotion;
allmilestone exits and the full parity goal stay open.

## Saved-wrap import leaf — 2026-11-14

[LAYOUT-WRAP-IMPORT](https://trello.com/c/Pn8vqBeJ) isolates the confirmed omitted-width/bare-Fill60/61-versus220reopen discrepancy from the published wrapping command. Its primary owner is M04, it requires REF-04, and LAYOUT-WRAP plus PARITY-ALL require it. No original wrapping, native, history or pixel criterion is removed. It starts Backlog while CLI-06 is Building; the later guarded handoff below supersedes that scheduling state without accepting the leaf.

## Guarded connected CLI handoff — 2026-11-14

CLI-06 enters Verify after188owner cases/652assertions, full check0/zero clones, production build0 and35actual Node/live-browser controls with no skips/retries/unexpected/flaky cases. The matching app advertises unique document identities; older bridges are refused before opening a file. Source and scoped limits are in [Connected CLI](CLI-APP-CONNECTION.md). LAYOUT-WRAP-IMPORT becomes the sole Building card;374Backlog/46Verify/87Executed plus1Building reconcile to508tasks. All18milestones stay open; native/reference/tool-name/standalone and full parity are not accepted.


2026-11-15 resource delivery: MCP-03-READSKILL moves to Verify after
[bounded software qualification](CLI-SKILL-RESOURCES.md); current Pen payload
equivalence, native delivery and full acceptance remain open. MCP-03-GETAPPSTATE
is the sole Building task. Both card descriptions/states are exactly read back;
all524other card descriptions/names/lists are unchanged, with526cards total.
The508task IDs,18primary allocations and507other terminal prerequisites persist.

2026-11-15 selection-delivery discovery adds one bounded Backlog leaf,
[MCP-05-SELECT](https://trello.com/c/zValTMfQ/527-mcp-05-select-deliver-explicit-selection-to-the-targeted-editor), primaryM05, consumed by MCP-05. A built Node connected select_nodes call
returns success while actual editor selection remains empty; retain the original
red receipt separately from the read-only app-state candidate. The complete
readback has527cards/509tasks/18milestones,374Backlog/1Building/47Verify/87Executed;
GETAPPSTATE remains soleBuilding. Only the new leaf and three linked parents
change;523other descriptions/names/lists are unchanged. M05 has82primary children;
PARITY-ALL expands all508other required tasks. No acceptance state is promoted.

2026-11-15 state delivery moves GETAPPSTATE to Verify after the
[bounded software receipt](CLI-APP-STATE.md):277owner passes/1platformskip,
22stable actualNode/realMCP/browser cases with0skip/retry/flaky results, fullcheck
and productionbuild0/zero clones,6559built files unchanged across controls.
Exact Pen/native/standalone/full-card acceptance stays open. MCP-05-SELECT is
soleBuilding; complete527-card readback confirms373Backlog/1Building/48Verify/
87Executed and525other descriptions/names/lists unchanged.509IDs/18primary
allocations/508other terminal prerequisites remain intact.

## Selection delivery handoff — 2026-11-15

[Explicit selection](CLI-SELECTION.md) has bounded software evidence: 263 owner
tests, 27 actual Node/MCP/browser cases, three outside-checkout Node controls,
strict changed-code checks, full static zero clones and production build. All
6,559 built files and 15 runtime/test inputs remain exact across final controls;
17 protected file hashes/modes and three retained artifacts are preserved. The
original valid-call/no-editor-selection, invalid-ID, ARIA and lazy-page refusal
failures remain retained. SELECT is Verify, not accepted full parity.

MCP-05-CANCEL is the sole Building task. Independent review finds the existing
MCP RPC does not forward cancellation; actual SDK cancellation remains to be
reproduced. This separate M05 child has no prerequisites; SELECT and MCP-05
consume it without a backedge. There are 510 tasks/18 milestones/528 cards, with
509 other terminal inputs and 83 primary M05 children. Native/current Pen,
standalone, strict rendering and combined feature acceptance remain open.

## Owned automation fixture and worker observation — 2026-11-16

The first frozen run has eight cancellation passes, eleven older automation
failures from unisolated external Cloud discovery and sixteen serial skips.
The local service fixture preserves every assertion; the second run has
34 passes and one FIG worker/page error. A shared three-case profile retains
two dirty documents from prior cases; the isolated case passes, and an
instrumented shared sequence also passes with one 29,541-byte recovery row.
This neither proves archive damage nor resolves the worker cause.

The three target cases pass with per-case page/context ownership, without
error suppression, retries or changed limits. STAB-FIG-RECOVERY-WORKER remains
Backlog under M07; FILE-07 and PARITY-ALL consume it. Current allocation:
511 tasks/18 milestones/529 cards; 374 Backlog/0 Ready/1 Building
(MCP-05-CANCEL)/49 Verify/87 Executed. Full parity and all milestone exits remain
open. Final combined runtime qualification is still pending; original failures
and probe receipts remain in local-evidence/mcp-cancellation-2026-11-15/.

## Qualified cancellation handoff — 2026-11-16

The complete seventh check and third production build exit zero. After both
finish, 288 owner cases pass with one Windows-only skip, and all 35 actual
Node/MCP/WebKit cases pass without skips, retries or flaky results. All 6,558
built files and 142 scoped inputs remain exact; protected work and retained
binaries/originals remain exact. MCP-05-CANCEL moves Verify, not full acceptance.
STAB-FIG-RECOVERY-WORKER is the sole Building task, retaining the separate
multi-tab worker observation. Current lists: 373 Backlog/0 Ready/1 Building/
50 Verify/87 Executed across 511 tasks and 18 open milestones. Earlier
allocation-time snapshots above remain historical. The [software receipt](CLI-CANCELLATION.md)
does not accept full native/reference/standalone, recovery, milestone or parity gates.
