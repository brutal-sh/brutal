# Automatic drafts and project-file acceptance

Updated: 2026-11-11. [FIRST-03](https://trello.com/c/apRnHd1j) retains the full draft/restart/Save As/edit/Save/reopen criterion and actual Pen 1.2.22 comparison. [FIRST-DRAFT-REFRESH](https://trello.com/c/F5Uw69NM) owns the narrower observed Home-list correction. Neither substitutes browser reload for an OS restart or download for a native writable file.

## Observed Home-list defect

The isolated browser fixture opens Home, creates a design, draws a rectangle and returns to Drafts before the recovery debounce. Actual IndexedDB contains one snapshot, but the visible list stays empty. The corrected four-case Chromium/WebKit run fails at that list assertion on original source f606d6de9. An earlier unscoped New design locator matches both the tabbar and Home buttons; that fixture failure remains separate from the product defect.

The recovery service now exposes a read-only revision after successful write/remove/clear completion. Reads and failed mutations do not announce a completed change. Home watches that revision and its active state through the existing stale-read cleanup. No polling, storage-schema change, forced persistence, timeout increase or Home reentry is added.

Strict size checking exposes an existing 58-line resilient-store function. Its fallback migration becomes a focused helper, preserving the serialized queue, original failure propagation, retained-byte migration and removal from both stores. An IndexedDB write-refusal control checks actual migration, one completed-write notification, retained bytes, and successful cleanup in memory and the persistent store.

## Bounded qualification

The refined four-case browser run passes in both engines. It checks an automatically persisted draft appearing while Home stays visible, reload/restoration, cancel-close recovery-byte retention, actual .pen download bytes, snapshot removal after saving, edits, Undo/Redo, Save and reopening editable content. The reopened document owns its own panel selection, so the final fixture explicitly selects Layers there; the earlier downstream missing-panel failure is retained. One Home capture per engine is visually inspected, showing the draft entry. They are not cross-app pixel-parity receipts.

The focused recovery/save/tab owner run passes 56 cases and 175 assertions, including memory notifications, failed mutations, IndexedDB fallback and retained content. The final five-file strict check passes 300 code lines per file, 50 per function, complexity ten, four parameters and depth four. Independent read-only source review and the focused migration-extraction follow-up find no actionable defect.

The final browser regression run passes all eight cases: the two new journeys in both engines plus four existing Chromium recovery/clean-Undo and pen-save workflows. No retry, timeout, threshold or skip changes. The complete bun run check passes, including literal zero duplicate-code clones. Final source/control hashes match the executed owner/browser runs. Private source publication is the remaining child criterion at this snapshot; broader FIRST-03/native/reference acceptance stays open. Raw failed and passing receipts, source hashes and captures stay private in local-evidence/claude-brand-review-2026-11-11.

## Remaining full-journey gates

Actual Pen initial Frame geometry, matched Home/native state matrices, trusted native file panels, physical restart, write-in-place and error/read-only workflows remain on FIRST-03 and their existing owners. The Mac is locked at the latest Computer Use attempt. The normal installed app, user profile/recovery, credentials and protected icon work are unchanged. Full parity and beta remain unaccepted.
