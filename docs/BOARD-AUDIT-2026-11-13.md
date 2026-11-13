# Open Pen current board reconciliation — 2026-11-13

This readback covers all 523 open cards after the Pen 1.2.23 update catalog allocation. It updates current scheduling; the [2026-11-11 audit](BOARD-AUDIT-2026-11-11.md) and intervening execution receipts remain historical. Actual Pen is the reference; OpenPencil is the implementation foundation.

There are 505 execution tasks and 18 milestone gates:383 Backlog,0 Ready, 1 Building (REF-04), 36 Verify and 85 Executed. These are workflow states, not a product-parity percentage, an estimate of unbuilt features or a beta date. Full parity and all milestone exits remain unaccepted.

## Checks actually executed

- Re-read the complete 523-card live board after 13 creates and 19 tracking-description updates; every new description/state and every updated description matches the intended bytes.
- Reconcile 505 unique execution IDs to exactly 505 single primary milestone owners. M02 now owns 114 tasks; M05 owns 81. Other ownership remains unchanged. An existing Note-raster child link was moved from M02's historical tail into its current primary block; its rendering acceptance stays open.
- Expand PARITY-ALL to all 504 other execution IDs before validating the explicit dependency graph. There are no unknown named prerequisites, reachable cycles or Executed/open-prerequisite contradictions. This checks declared edges, not undiscovered real prerequisites or runtime behavior.
- Preserve 18 open milestones, one Building card and no Ready cards. No feature card or release gate is promoted by adding/cataloging work.

## New bounded followups

| Task | Primary milestone | Declared prerequisites | State |
| --- | --- | --- | --- |
| [UPD23-GEN-PENDING](https://trello.com/c/XTrLx7Xo/511-upd23-gen-pending-match-pending-generation-state-and-generate-discard-controls) | M02 | REF-04 | Backlog |
| [UPD23-GEN-IMAGE](https://trello.com/c/5WiqhSl1/512-upd23-gen-image-generate-a-raster-fill-from-its-pending-operation) | M02 | UPD23-GEN-PENDING, AI-02 | Backlog |
| [UPD23-GEN-SVG](https://trello.com/c/BvV0tswJ/513-upd23-gen-svg-generate-editable-svg-from-its-pending-operation) | M02 | UPD23-GEN-PENDING, UPD23-SVG-SELECT | Backlog |
| [UPD23-GEN-REPLACE](https://trello.com/c/a5Lt3v1v/514-upd23-gen-replace-replace-an-image-background-through-its-pending-operation) | M02 | UPD23-GEN-PENDING, AI-02 | Backlog |
| [UPD23-SVG-SELECT](https://trello.com/c/5Of2UB2h/515-upd23-svg-select-match-svg-provider-and-model-selection) | M05 | REF-04, AI-02 | Backlog |
| [UPD23-IMAGE-MODELS](https://trello.com/c/HKWyHR64/516-upd23-image-models-reconcile-image-model-choices-and-legacy-selections) | M05 | REF-04, AI-02 | Backlog |
| [AI-09-CREATIVE](https://trello.com/c/PV3BZ4pr/517-ai-09-creative-add-and-qualify-creative-iteration-mode) | M05 | REF-04, AI-09 | Backlog |
| [SURF-CHAT-FULLSCREEN](https://trello.com/c/gd5T43yy/518-surf-chat-fullscreen-match-full-screen-chat-and-history-island-round-trip) | M05 | REF-04, AI-01 | Backlog |
| [AI-03-STEER-PREF](https://trello.com/c/6Jc0ORzA/519-ai-03-steer-pref-match-always-steer-messages-preference-and-queue-behavior) | M05 | REF-04, AI-03 | Backlog |
| [AI-CONTEXT-START](https://trello.com/c/p56nlmao/520-ai-context-start-qualify-lazy-task-context-loading-and-resumed-sessions) | M05 | REF-04, AI-SKILLS-CONTEXT | Backlog |
| [UI-10-LANGUAGE-CS](https://trello.com/c/5Pzv6Bo9/521-ui-10-language-cs-qualify-czech-interface-coverage) | M02 | REF-04, UI-10-LANGUAGE | Backlog |
| [UI-10-LANGUAGE-PTBR](https://trello.com/c/zzxjVEtR/522-ui-10-language-ptbr-qualify-brazilian-portuguese-interface-coverage) | M02 | REF-04, UI-10-LANGUAGE | Backlog |
| [UI-10-LANGUAGE-ID](https://trello.com/c/h3nf3GpQ/523-ui-10-language-id-qualify-indonesian-interface-coverage) | M02 | REF-04, UI-10-LANGUAGE | Backlog |

The generation-state leaves explicitly exclude recreating the vendor image quota or subscription trigger. They qualify applicable independent pending/retry/imported-operation behavior and real generated output without artificial free-editor limits. Existing DRAW-14/DRAW-15 retain background removal/vectorization; AI-09 retains its Layout/Style base; MCP-03-READSKILL retains the guide-read contract. Native/provider applicability and output acceptance remain separate.

## Evidence and sequencing

The [versioned current reference supplement](pen-feature-reference/update-1.2.23-2026-11-13.md) and [machine catalog](pen-feature-reference/update-1.2.23-2026-11-13.json) allocate 75 added,14 removed and 6 changed message IDs plus guide/source/native findings. Neither source messages nor extraction counts accept features. The independent review corrected presentation/iteration/generation ownership and the task-context overlap before external writes.

Private receipts are retained under `local-evidence/pen-reference-1.2.23/`: `created-cards-verified.json`, compact `board-audit-current.json`, independent review, full native traces/teardown, source dispositions and REA/Hopper exports. Proprietary bytes, user-account/history captures and private evidence are excluded from publication. REA's post-close response reports no open target or pending cleanup.

Now: qualify/publish REF-04's bounded catalog criterion. Next: continue normal-installed save/refusal/recovery delivery and unresolved native chrome/critical-alert visual criteria using owned fixtures. Later: execute remaining domain tasks in prerequisite order, including new reference followups. Re-evaluate after each accepted card or newly observed reference change.

FILE-NATIVE-SAVE-UI stays Verify despite its passing source/native/browser slice; matched critical-alert pixels and normal-installed Save UI delivery remain open. UI-MAC-WINDOW-CONTROLS stays Verify for pointer dragging. Normal installed `9ec149` contains the measured traffic-light correction; it has not been replaced with the new Save UI build. Existing recovery content/profiles, protected icon work, private GitHub/draftPR and disabled Actions remain constraints.

The controller goal stays Active. Product Done still requires every applicable task and matched reference state, PARITY-ALL's own combined acceptance, the normal-installed core journey, and the separate public-beta trust/package/support gates. No catalog publication alone meets that terminal criterion.
