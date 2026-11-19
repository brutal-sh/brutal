# Current Open Pen priorities

Jason owns product and release decisions. The replacement controller goal is active
after he cleared the previous goal on 17 November. Open Pen is a desktop product;
local browser runners are engineering tools, and the website is information/help.
The desktop Browser View/import feature remains in scope.

## Now, next and later

The bounded [slider-label repair](https://trello.com/c/MeJ2EoyA) is published at
`16bbfd9e5` and Executed for its declared browser criterion. Its controls do not
cover its wider native, actual-Pen or parent acceptance. The bounded Codex tool connection is Executed on local native candidate `d18cbc54b`, and native request recovery is Executed on local candidates `260ef4846` and `01727ee4c`.

## Public beta qualification order

Open Pen is a working Mac candidate. The public beta still needs release qualification.

The live board and task index agree on 552 required execution tasks, one
deferred Photoshop follow-up and 18 milestone cards. The live board also
retains three archived cards. The required dependency graph has no cycles. All 551 other required
tasks remain inputs to PARITY-ALL. Board positions express sequence. Acceptance
continues to require the original evidence on each card.

1. **Finish the macOS file safety and core journey.**
   [FILE-07](https://trello.com/c/pLxRX3u0) is Building for the remaining
   installed and Pen-reference recovery criteria. [FILE-RECOVERY-CANCEL](https://trello.com/c/jMQrSjFS),
   [FILE-08](https://trello.com/c/ZHvzXqoN), [FIRST-03](https://trello.com/c/apRnHd1j),
   [UI-MAC-WINDOW-CONTROLS](https://trello.com/c/8iOj7MNs),
   [AUTH-02-CODEX](https://trello.com/c/3NQFXUXH),
   [STAB-WEBKIT-MIXED](https://trello.com/c/ech6H0Xm),
   [VERIFY-INSPECTOR-CONTROLS](https://trello.com/c/ngc2tr1y), and
   [ERR-07](https://trello.com/c/OTshm7tR) lead Verify in that order. The [installed Save As check](RECOVERY-FILE-DECISIONS.md#installed-macos-save-as-cancel-and-write-back--2026-11-19)
   now covers Cancel, separate-file write-back and reopen. The
   [current Pen comparison](RECOVERY-FILE-DECISIONS.md#pen-1223-native-decision-reference--2026-11-19)
   also verifies both Cancel paths and reopening Pen’s saved copy in both apps.
   The [isolated normal-feature Mac run](NATIVE-RECOVERY-PROFILE.md#normal-feature-macos-recovery-after-process-loss--2026-11-19)
   now covers interruption, Restore, Save and reopening in a third process.
   The [Pen recovery comparison](RECOVERY-FILE-DECISIONS.md#pen-1223-recovery-after-process-loss--2026-11-19)
   verified direct recovered-tab reopening and the close-and-retain choice.
   [FILE-RECOVERY-KEEP](https://trello.com/c/vvn9pBkm) is Executed on the
   [isolated normal-feature Mac build](RECOVERY-FILE-DECISIONS.md#keep-an-existing-file-recovery-backup-on-macos--2026-11-19).
   [FILE-WATCH-METADATA](https://trello.com/c/HPooh1BH) is Executed for the
   metadata-only conflict repair. The [regular installed history checks](RECOVERY-FILE-DECISIONS.md#installed-file-history-and-metadata-only-changes--2026-11-19)
   exercised Undo, Redo, Cancel, Save and reopen with an owned file.
2. **Qualify the normal package and support path.**
   [ENV-01-MAC](https://trello.com/c/hzrysOeC) is Ready and unlocks the
   [distribution trust](https://trello.com/c/eAB7Tdzk) and
   [install and rollback](https://trello.com/c/2OSPK0Pb) cards, which lead Backlog.
   The installed arm64 v0.16.0 bundle passed strict local signature verification
   with an ad-hoc signature and was rejected by Gatekeeper. Open Pen’s signing
   team and notarization credentials need qualification before a first-launch
   test of the final distribution package. The support
   packet needs [sanitized diagnostics](https://trello.com/c/OTshm7tR) and
   [verified support links](https://trello.com/c/Nyoko3k5). Backlog puts the
   original website and branding dependencies before their release consumers.
   The existing website/help chat retains ownership.

   A local arm64 package from `de105fe1b` contains the live Help link and
   file-watcher fix. The archive hash is
   `c4c4979a152ccf3864519bbe620959dbcd6257f8b8e4b51decbfe8f27077f1fe`.
   All four bundle files matched after extraction, and strict signature
   verification passed. Gatekeeper rejected the extracted bundle. The
   normal bundle refused the reserved native-test profile argument without
   creating a profile. The package has no install, upgrade, rollback or
   clean-machine launch evidence. Its private receipt is
   `local-evidence/normal-installed-recovery-2026-11-19/integrated-package-receipt.json`.

   The [two-build native trial](NATIVE-RECOVERY-PROFILE.md#macos-bundle-replacement-and-rollback--2026-11-19)
   verifies install into a private directory, manual replacement, restart,
   rollback and recovery. The regular installation and its recovery data
   matched their original checksums. Clean-machine first launch and
   signed updater delivery remain open for the exact release package.

   The [exact regular-identity trial](NATIVE-SAVE-DELIVERY.md#exact-regular-identity-package-trial-on-macos)
   launches the package from `4926f5f36`, checks About and update
   availability, and executes native Duplicate, Undo, Redo, Cancel,
   permission refusal, Save retry and clean reopen. The prior installed
   bundle and its exact recovery records and blobs are preserved.
3. **Qualify one exact release candidate.**
   [BETA-01](https://trello.com/c/sYpWJdvu) requires its six remaining direct
   gates: brand verification, both recovery owners, the draft journey,
   WebKit reliability, and inspector controls. The
   [public beta decision](https://trello.com/c/8HWMW9GE) additionally requires
   [PARITY-ALL](https://trello.com/c/cr0YPLzZ) and all three release artifacts
   on the exact build. Jason decides whether to publish.

The connection check reached a terminal timeout, cleaned up the stalled child and succeeded on retry. Settings > MCP > Restart restored the connection after a controlled loss of the test bridge. The trigger of the original live incident remains unknown. A live request recovered from the unsupported inherited model, made one canvas edit and verified Undo. A separate native stand-in verified specific error copy, one-edit Retry and no-edit Stop. The installed window passed pointer drags below the plus and minimize buttons. The [regular Mac close and relaunch](NATIVE-WINDOW-CONTROLS.md#regular-mac-close-and-relaunch--2026-11-19) restored the exact frame, controls, and recovery offers. The card stays in Verify for visual sign-off. The original screenshot’s build remains unknown.
Ready/Building describe scheduling, not acceptance. No more than three Ready cards
and one primary app Building card are allowed. Move the next eligible owner into
Building only after the current unit has its actual accepted exit.

Save/recovery retain release-blocking priority. Existing normal Save delivery has
bounded executed evidence. The [native Save UI](https://trello.com/c/ysa9PnRd)
comparison is Executed after matched installed native alert captures and successful
refusal and retry in both apps. [FILE-07](https://trello.com/c/pLxRX3u0) and
[FILE-08](https://trello.com/c/ZHvzXqoN) retain their broader native, reference, and
combined criteria. The old untraced
[Cancel/Home observation](https://trello.com/c/jMQrSjFS) remains unclassified.
Do not repeat green controls indefinitely or call them a repair. Capture an actual
recurrence and its first failing transition before assigning a cause.

The [agent-created .pen Save fix](https://trello.com/c/8ZY96bsg) is Executed on the isolated native candidate after real Codex creation and saved reopen. Pen 1.2.23 renders the saved file with the expected pixels. The [Codex acceptance parent](https://trello.com/c/3NQFXUXH) remains in Verify for the remaining Pen provider runtime criteria.

Describe recovery is Executed after a controlled chat in the installed Mac app. Stock-photo fallback is Executed after the installed Mac chat preserved its placeholder and continued. Removing stock keys was verified on the isolated native build. The broader format request stays in Backlog. Additional Photoshop verification is deferred and its existing native evidence remains available.

After the current user blockers, continue file preservation and native delivery,
core editing/portable-file compatibility and M05 agent/welcome workflows, then the
remaining required domains in dependency order. Performance, modularity, Figma and
actual-Pen checks, trust, packaging and support remain required. No broad surface
card can bypass its bounded children or replace an original exit criterion.

## Concrete evidence checkpoints

- **A usable Codex canvas session:** connection and request leaves accepted, followed
  by the parent's real controlled edit, Undo and Save/reopen criteria.
- **Stable native editing and files:** window transitions, Save refusal/retry and
  backup/restore decisions pass their original native/reference criteria while
  preserving originals, recovery data, editable content and exact target identity.
- **One reviewable beta candidate:** all required tasks and 18 original milestone
  exits, PARITY-ALL's full closure and its own combined acceptance, normal installed
  core journey, and exact-candidate trust/package/rollback/support evidence accepted.
  Jason then decides release. BETA-01 alone is insufficient.

These are evidence checkpoints, not release dates. A new demonstrated data-loss,
credential or startup failure interrupts the queue. A fresh source/build, actual
dependency failure, reference update or user priority change triggers re-entry
review; a passing adjacent layer does not accept a blocked criterion.

## Separate website and repository work

The user-owned chat **Build Open Pen website and help site** uses the isolated
`scratch/branding-site-2026-11-17` branch. Its six smaller canonical cards are
[site](https://trello.com/c/rGzAWsRj), [native media](https://trello.com/c/mW9wUV9a),
[Suggested](https://trello.com/c/EzHkzr7H),
[app destinations](https://trello.com/c/BcmhcIXG),
[desktop positioning](https://trello.com/c/CL8mkEf2) and
[repository presentation](https://trello.com/c/qYv9h3oW).
They are allocated under M15 and retain their explicit publication/native limits.
The source handoff requires independent integration review; its existence does not
accept the app's normal installation or full branding milestone.

Three overlapping cards created in this chat are archived with full text/history
and canonical mappings retained. No original required task is removed. Necessary
OpenPencil attribution, licenses, engine/package/protocol identifiers and actual
provider/service destinations remain. A static help origin must not replace an
editor/share endpoint. User history and manually entered URLs remain usable.

[Branch protection](https://trello.com/c/1yZiw9U8) accepts configuration readback
only: exact default branch, administrator enforcement, no force pushes or deletion.
It does not accept CI or merge/release checks. Repository privacy, draft PR and
disabled Actions remain required.

## Canonical inventory and review

Current scheduling inventory: 571 cards, 552 required tasks, one deferred task and 18 milestones.
The board contains 397 Backlog, 1 Ready, 1 Building, 55 Verify and 99 Executed cards.
PARITY-ALL explicitly expands all 551 other required execution tasks. Each task has exactly
one primary milestone owner. Independent live-board comparison verifies unique IDs,
no unknown prerequisites/cycles, and no Ready/Executed card blocked by an open
prerequisite. All 18 original milestone exit blocks are byte-identical.

Counts are not parity percentages or delivery estimates. The board is canonical;
[TASKS](TASKS.md), [MILESTONES](MILESTONES.md), [TRACKING](TRACKING.md),
[PRD](PRD.md) and the [goal instructions](GOAL-REFRESH-2026-11-16.md) derive from it.
Private before/after, consolidation, graph and independent-review receipts remain
in `local-evidence/priority-refresh-2026-11-17/`.
