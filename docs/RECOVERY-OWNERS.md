# Recovery ownership and existing-file gap

Updated: 2026-11-11. [MOD-RECOVERY-LIFECYCLE](https://trello.com/c/cGCjHTm2) owns the bounded recovery extraction. [MOD-DOCUMENT-SOURCE](https://trello.com/c/SZ4ZF919) and [MOD-TAB-OPEN-RECOVERY](https://trello.com/c/cVK1VfgL) own the two remaining source/save and tab-opening factories. [FILE-RECOVERY-LOCAL](https://trello.com/c/7JAWHZSv) depends on them and owns the behavioral correction; FILE-07 retains full acceptance.

## Confirmed behavior gap

The current official .pen-files guide requires separate recovery for unsaved existing-file edits. An isolated Chromium control opens an actual origin-private file through a real handle, observes Autosave off, duplicates its rectangle through the UI and verifies dirty content plus unchanged original file bytes. Actual IndexedDB still has no recovery snapshot after the normal wait. The original case fails at expected count one versus actual zero; reload/restoration is not reached.

The controller currently excludes every writable source. File backups must eventually remain distinct from dashboard drafts and retain validated original-file identity for review/write-back. The new feature child does not waive FILE-07's original association, review UI, native file panels, actual Pen state, cancellation, discard or physical-restart criteria. The original failing test remains an uncommitted feature candidate until the correction is qualified.

## Recovery-only extraction

The original controller factory has 127 code lines and its writer has complexity eleven. Snapshot coalescing moves to snapshot.ts, generation/protection/disable/adoption/discard to lifecycle.ts and per-instance state/defaults to runtime.ts. The controller keeps the same public factory, returned methods and existing type export; shared interfaces stay in types.ts. All five changed runtime modules pass 300 code lines/file, 50/function, complexity ten, four parameters and depth four.

The extraction retains the original writable-source exclusion, watch timing and error propagation. All 56 focused recovery/store/save/tab cases and 175 assertions pass. Ten canonical browser controls pass: actual Chromium OPFS autosave and no-picker recovery, two draft/reload/save/history/reopen journeys in both engines, and four existing Chromium recovery and pen-save paths. The exact original existing-file control then fails again at count zero, without a timeout or assertion change. This proves the known defect is not silently repaired or waived by this structural work. Independent read-only source review finds no actionable regression for current callers.

The complete bun run check passes, including literal zero duplicate-code clones. All five frozen source hashes match the executed controls. Private publication remains pending at this snapshot. Source hashes, successful/failed raw runs and reviews remain in private local-evidence/claude-brand-review-2026-11-11. This is not native delivery, full recovery, Pen parity or beta acceptance.

## Reference and preservation

Fresh REA directory inspection examines 818 entries and 60 file headers; it reads 5,040 header bytes and does not follow 14 symlinks. That metadata/read-range evidence is not a full-content hash or a runtime test. A separate full ASAR hash matches 1c6d0129dc9dda08f2f0da5dde23aa8cc52df11858fec1e35cd3bd2647bcf407 and the installed plist reports Pen 1.2.22, preserving the current reference identity. Computer Use still reports the Mac locked. No reference asset/implementation is published, and no normal app/profile/recovery/credential or protected icon change is made.
