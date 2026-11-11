# Automatic drafts and project-file acceptance

Updated: 2026-11-11. [FIRST-03](https://trello.com/c/apRnHd1j) retains the full draft/restart/Save As/edit/Save/reopen criterion and actual Pen 1.2.22 comparison. [FIRST-DRAFT-REFRESH](https://trello.com/c/F5Uw69NM) owns the narrower observed Home-list correction. Neither substitutes browser reload for an OS restart or download for a native writable file.

## Observed Home-list defect

The isolated browser fixture opens Home, creates a design, draws a rectangle and returns to Drafts before the recovery debounce. Actual IndexedDB contains one snapshot, but the visible list stays empty. The corrected four-case Chromium/WebKit run fails at that list assertion on original source f606d6de9. An earlier unscoped New design locator matches both the tabbar and Home buttons; that fixture failure remains separate from the product defect.

The recovery service now exposes a read-only revision after successful write/remove/clear completion. Reads and failed mutations do not announce a completed change. Home watches that revision and its active state through the existing stale-read cleanup. No polling, storage-schema change, forced persistence, timeout increase or Home reentry is added.

Strict size checking exposes an existing 58-line resilient-store function. Its fallback migration becomes a focused helper, preserving the serialized queue, original failure propagation, retained-byte migration and removal from both stores. An IndexedDB write-refusal control checks actual migration, one completed-write notification, retained bytes, and successful cleanup in memory and the persistent store.

## Bounded qualification

The refined four-case browser run passes in both engines. It checks an automatically persisted draft appearing while Home stays visible, reload/restoration, cancel-close recovery-byte retention, actual .pen download bytes, snapshot removal after saving, edits, Undo/Redo, Save and reopening editable content. The reopened document owns its own panel selection, so the final fixture explicitly selects Layers there; the earlier downstream missing-panel failure is retained. One Home capture per engine is visually inspected, showing the draft entry. They are not cross-app pixel-parity receipts.

The focused recovery/save/tab owner run passes 56 cases and 175 assertions, including memory notifications, failed mutations, IndexedDB fallback and retained content. The final five-file strict check passes 300 code lines per file, 50 per function, complexity ten, four parameters and depth four. Independent read-only source review and the focused migration-extraction follow-up find no actionable defect.

The final browser regression run passes all eight cases: the two new journeys in both engines plus four existing Chromium recovery/clean-Undo and pen-save workflows. No retry, timeout, threshold or skip changes. The complete bun run check passes, including literal zero duplicate-code clones. Final source/control hashes match the executed owner/browser runs. The source is privately published at7194388737fff6837ff3feb4b8f8c81d4753e78f, with working-tree and committed hashes matched to the executed evidence. The narrow FIRST-DRAFT-REFRESH criterion is accepted; broader FIRST-03/native/reference acceptance stays open. The draft PR and repository remain private, Actions is disabled, and all17protected file hashes/modes are preserved. Raw failed and passing receipts, source hashes and captures stay private in local-evidence/claude-brand-review-2026-11-11.

## Chromium writable-file control

The inherited autosave test only checks that a picker function exists. Its replacement obtains a real origin-private browser file handle in the runner-owned context; only the picker choice is supplied by the fixture. After Save As writes initial bytes, the test observes Autosave initially off, enables it through the actual File menu, draws a 60 × 60 rectangle, rereads the file and parses the saved Pen content through Core. The file contains exactly that rectangle and the document becomes clean. A second isolated context checks that an unsaved document has no local-file Autosave menu, automatically retains one recovery snapshot, stays dirty and never calls the picker. Both cases pass, with no timeout/retry changes.

The first new attempt leaves Autosave off and fails on the empty saved graph; its following serial case does not run. That is retained as a setup/disabled-mode control, not a product defect. The enabled pair passes in 18.1 seconds; focused types, lint, format and 300/50/10/4/4 checks pass. Independent source review finds no actionable test defect. This executes Chromium's browser-owned real writable-handle path; the mocked picker choice does not accept a native OS panel, arbitrary user-folder access, WebKit writable handles or a physical restart. Application source remains unchanged from719438873.

## Remaining full-journey gates

Actual Pen initial Frame geometry, matched Home/native state matrices, trusted native file panels, physical restart, write-in-place and error/read-only workflows remain on FIRST-03 and their existing owners. The Mac is locked at the latest Computer Use attempt. The normal installed app, user profile/recovery, credentials and protected icon work are unchanged. Full parity and beta remain unaccepted.
