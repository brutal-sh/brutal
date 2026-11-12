# Recovery ownership and existing-file gap

Updated: 2026-11-12. [MOD-RECOVERY-LIFECYCLE](https://trello.com/c/cGCjHTm2) owns the bounded recovery extraction. [MOD-DOCUMENT-SOURCE](https://trello.com/c/SZ4ZF919) and [MOD-TAB-OPEN-RECOVERY](https://trello.com/c/cVK1VfgL) own the two remaining source/save and tab-opening factories. [FILE-RECOVERY-LOCAL](https://trello.com/c/7JAWHZSv) depends on them and owns the behavioral correction; FILE-07 retains full acceptance.

## Confirmed behavior gap

The current official .pen-files guide requires separate recovery for unsaved existing-file edits. An isolated Chromium control opens an actual origin-private file through a real handle, observes Autosave off, duplicates its rectangle through the UI and verifies dirty content plus unchanged original file bytes. Actual IndexedDB still has no recovery snapshot after the normal wait. The original case fails at expected count one versus actual zero; reload/restoration is not reached.

The baseline controller excludes every writable source. File backups must eventually remain distinct from dashboard drafts and retain validated original-file identity for review/write-back. The new feature child does not waive FILE-07's original association, review UI, native file panels, actual Pen state, cancellation, discard or physical-restart criteria. The original failing control is retained separately from the corrected-flow qualification below.

## Recovery-only extraction

The original controller factory has 127 code lines and its writer has complexity eleven. Snapshot coalescing moves to snapshot.ts, generation/protection/disable/adoption/discard to lifecycle.ts and per-instance state/defaults to runtime.ts. The controller keeps the same public factory, returned methods and existing type export; shared interfaces stay in types.ts. All five changed runtime modules pass 300 code lines/file, 50/function, complexity ten, four parameters and depth four.

The extraction retains the original writable-source exclusion, watch timing and error propagation. All 56 focused recovery/store/save/tab cases and 175 assertions pass. Ten canonical browser controls pass: actual Chromium OPFS autosave and no-picker recovery, two draft/reload/save/history/reopen journeys in both engines, and four existing Chromium recovery and pen-save paths. The exact original existing-file control then fails again at count zero, without a timeout or assertion change. This proves the known defect is not silently repaired or waived by this structural work. Independent read-only source review finds no actionable regression for current callers.

The complete bun run check passes, including literal zero duplicate-code clones. All five frozen source hashes match the executed controls. Private source b0ad9f66a publishes the qualified recovery-only extraction; its bounded card is Executed. Source hashes, successful/failed raw runs and reviews remain in private local-evidence/claude-brand-review-2026-11-11. This is not native delivery, full recovery, Pen parity or beta acceptance.

## Reference and preservation

Fresh REA directory inspection examines 818 entries and 60 file headers; it reads 5,040 header bytes and does not follow 14 symlinks. That metadata/read-range evidence is not a full-content hash or a runtime test. A separate full ASAR hash matches 1c6d0129dc9dda08f2f0da5dde23aa8cc52df11858fec1e35cd3bd2647bcf407 and the installed plist reports Pen 1.2.22, preserving the current reference identity. Computer Use reports the Mac locked at that original inspection; the current native execution below supersedes that access limitation. No reference asset/implementation is published, and no normal app/profile/recovery/credential or protected icon change is made.

## Source and save extraction

MOD-DOCUMENT-SOURCE separates the original 259-code-line factory into eight runtime modules: public assembly, captured inputs/context, builders, identity actions, serialization/version tracking, local file/autosave callbacks and external target rollback. Existing source-state re-export and returned methods remain available. Captured inputs preserve original getter lookup order. An idle save still starts synchronously so the browser file picker retains user activation. Target rollback, revision tracking, protection, watch and disposal ordering remain unchanged for current callers.

All 153 focused document I/O, recovery, tab and storage-save cases pass with 401 assertions across 23 files. All eight changed modules pass the same strict 300/50/10/4/4 limits. Ten canonical browser journeys pass without retries or skips, including actual OPFS autosave, automatic draft/reload/restore, cancellation, save/download/reopen and undo/redo in Chromium and the named WebKit draft journeys. The unchanged existing-file control is run separately after this extraction and still fails at recovery count zero; reload/restoration is not reached. Both engines’ captured Home draft output is inspected separately from Pen pixel acceptance. Independent read-only comparison finds no actionable current-caller regression. The complete static gate passes, including zero duplicate-code clones; private source f0f5411f6 publishes the qualified source/save extraction and its bounded card is Executed; no native or full feature acceptance is implied.

Native access is refreshed successfully later on 2026-11-11. Actual Pen Home Drafts and its first draft’s More actions menu are observed directly: Open, Reveal in Finder, Rename and Delete Draft. The menu is dismissed and original Home Recents selection restored, with no document changed. This refresh removes the current lock blocker; it does not accept Open Pen’s corresponding native design/functionality or physical-restart recovery.

## Tab opening extraction

MOD-TAB-OPEN-RECOVERY keeps the public tab facade and separates file-open coordination, tab reuse/failure lifetime, imported graph preparation, storage operations and recovery operations. The singleton coordinator, source identity/coalescing, immediate deferred rejection handling, success/failure cleanup, original callbacks and failed-recovery retention remain unchanged for current callers. All 163 focused document, tab, recovery, storage-save and preparation cases pass with 421 assertions across 24 files. The six changed modules satisfy strict 300/50/10/4/4 limits. Independent read-only comparison finds no actionable regression. The expanded browser run passes eleven cases and fails three storage controls before the changed opener is reached. Restoring the original f0f5411f6 index reproduces all three failures with the same untouched tests, and the six candidate hashes are restored exactly afterward. STORAGE-HOME-ENTRY and TEST-STORAGE-SAVE-TO own the corresponding public-navigation and current Save To acceptance. No passing storage UI claim follows from the owner tests. The exact existing-file negative control separately still fails at count zero with original bytes unchanged; reload is not reached. The complete static gate passes with zero duplicate-code clones; source 5886a5766 publishes that qualified extraction.

## Existing-file candidate — 2026-11-11

FILE-RECOVERY-LOCAL is accepted at private source b519e79f6 after all four structural/tooling prerequisites are Executed. The original zero-backup failure remains archived. The candidate records a validated confirmed file identity with the snapshot, keeps file backups out of Home Drafts, restores the source without marking edits saved or enabling automatic writes, and preserves managed/provisional storage policy. Invalid file-origin metadata is refused before creating a restoration tab or replacing a valid snapshot; validation refusal no longer switches persistent recovery into session-only fallback.

A held actual Save As owner control first reproduces missing recovery after its write completes with newer edits still dirty. Making confirmed identity reactive lets the existing debounced controller observe eligibility again; the unchanged held-write control then passes. Its first setup timeout from awaiting a fake-clock-controlled zero-delay sleep is separately retained and is not the product reproduction. The input-validation/fallback control independently fails with a false-to-true memory fallback before its narrow error classification repair and passes afterward.

The expanded owner run passes 177 cases and 470 assertions across 27 files. All fourteen canonical browser cases pass with default Playwright 1.65 Chromium and the named WebKit draft controls. Four real-file cases cover: capability persistence across reload; automatic backup/restore with unchanged source before Save, explicit source writes, Undo/Redo and editable reopening; cancelled Save As retaining backup followed by a separately saved copy; and refused write retaining the backup until explicit discard. The browser chooser and write refusal are controlled inside runner-owned profiles; actual OPFS read/write, IndexedDB, app controls and Core document decoding execute. Native OS pickers, real filesystem read-only permissions, physical app restart and exact Pen UI remain separate. The earlier engine crashes remain retained under [the tooling qualification](RECOVERY-ENGINE.md).

Restored files defer disk watching until a clean successful Save; cancelled/refused writes retain that protection. An executed control first exposes the missing restart and then passes after repair. Three original watcher-lifetime controls fail before generation guards and pass afterward: stopped pending setup is cleaned up, late setup cannot replace the active watcher, and retired callbacks cannot reload or stop a replacement. All twenty-four changed runtime modules satisfy the strict size/complexity gate. Independent current source review finds no additional actionable regression.

Computer Use is checked again after this validation and reports the Mac locked; native comparison cannot continue in this state. The complete new `bun run check` exits zero, including zero duplicate-code clones. The final owner run passes 177 cases and 470 assertions; four real-file browser controls pass again after the canonical helper move and test type correction; the earlier fourteen-case cohort retains legacy Chromium/WebKit coverage. Frozen executed, working and staged source/control hashes match. Private branch and draft PR independently read back b519e79f6286f051b447213729872f7f23c250a3. Actions are disabled; the normal app and all 17 protected file hashes/modes remain unchanged. This accepts only the bounded child; full native/reference acceptance remains open. No full feature, FILE-07, parity or beta acceptance follows from these interim controls.

## Browser process-loss control — 2026-11-12

The new control executes a real SIGKILL of a runner-owned Chromium process after
an existing-file edit has persisted its separate recovery copy. Its fresh persistent
profile lives inside test output; no normal browser or application profile is used.
The PID is reacquired through that context's browser CDP session and checked against
the unique profile path in the OS command line before interruption. Launch/context
settings come from the canonical runner. The initial synthetic onboarding state is
installed only in the first process. Later launches retain actual profile storage,
using [Playwright's persistent context](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context).

The first executed macOS control passes with Chromium 158.0.8127.18: three distinct
browser PIDs use the same owned profile, and the killed PID matches the first.
The second process sees the same 29,507-byte backup digest and unchanged original
before Restore. Public Restore retains two shapes; explicit Save writes two decoded
64 × 64 rectangles to the original OPFS file. A third process has no recovery prompt
or backup, reopens that saved file and executes Duplicate to three shapes and Undo
to two. The existing reload helper keeps its prior behavior by sharing preparation
and Restore phases. No production recovery code changes for this test.

Two initial fixture failures remain retained and stop before interruption: persistent
Chromium cannot supply its command line through the selected CDP method, and an
incorrect Browser event-wait method is then replaced with the actual `once` event.
The OS identity check adds no launch flag; the three-launch case starts with its own
45-second budget and changes no existing case timeout or assertion. The successful
run has no skip, retry or flaky case. The POSIX identity guard is not Windows coverage.
Independent review finds no actionable source/control defect. Test types and all
three touched TypeScript modules pass strict 300/50/10/4/4 checks. The final combined
cohort passes all 19 cases (17 Chromium and two named WebKit), including the new
process-loss path, existing reload/cancellation/refusal/history cases and storage
Save To. It has no retry, skip or flaky case; earlier unrelated mixed-menu failures
remain unclassified. Frozen candidate hashes match after the run. The complete static gate subsequently
exits zero with zero duplicate-code clones; no full-unit or strict Note success is
claimed by this test-only change.

The chooser returns a real runner-owned OPFS handle; it does not execute an OS file
panel or external-file permission prompt. Browser process loss does not establish
power-loss durability, a native Tauri restart, WebKit process-loss behavior or matched
actual Pen recovery states. Those FILE-07 gates stay open while native access is
blocked. Receipts stay private under
`local-evidence/claude-brand-review-2026-11-11/recovery-process-loss-*`.

## Native persistent-profile candidate

The isolated physical-process recovery runner and its refusal boundaries are documented in [NATIVE-RECOVERY-PROFILE.md](NATIVE-RECOVERY-PROFILE.md). Pure Rust and owned-process controls have executed; native WebView persistence and the three-process journey remain unexecuted while the desktop is locked. FILE-07 remains Verify. Use the standalone helper only after building the separate native-test host; preserve its retained test-owned marker/store and all normal profiles.

## Executed native profile and reference round trip — 2026-11-12

The rebuilt isolated host now executes the existing-file recovery journey across three distinct verified processes. Its fresh private test-owned WebKit store retains the backup after interruption; Restore preserves the external source until explicit Save, and the saved file independently decodes to two 64 × 64 rectangles. Third-process reopening has no stale backup/offer and supports Duplicate/Undo. The success receipt follows teardown. Normal installed-app, physical input, automatic backup debounce, OS picker/permission/read-only cases and actual Pen recovery states remain open under FILE-07/08. The prior intermittent Cancel timeout remains unclassified; this successful journey does not repair it.

Actual Pen 1.2.22 opens that recovered output. Its Layers/inspector show both 64 × 64 rectangles, with original position0,0 and restored position120,120. Native Save As writes a separate owned file. The built public Open Pen reader preserves both names, types, positions, dimensions and solid fills exactly; the original source hash remains unchanged. This is a small executed interchange round trip, not Pen crash recovery or full recovery-dialog visual acceptance. See [the reference record](pen-feature-reference/recovery-1.2.22-2026-11-12.md).

Private evidence: `native-recovery-final-{source,journey}.json`, `renderer-native-resources/verification.json` and `pen-recovery-roundtrip-2026-11-12/roundtrip.json`. Full unit execution records 10,172 passes, one Windows-only skip and the unchanged strict Note failure at 12,792 channels. No strict threshold, reference image or user file is changed.
