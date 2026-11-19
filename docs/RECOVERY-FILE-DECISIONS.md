# Decisions across two existing-file backups

[FILE-08](https://trello.com/c/ZHvzXqoN) retains full native/reference acceptance. This bounded browser control extends the [two-draft decision cases](RECOVERY-DECISIONS.md) to two distinct existing files. It changes no production recovery code.

The fresh runner context owns two OPFS `.pen` files: a 64 × 64 rectangle in the target and a 91 × 64 rectangle in the unrelated file. Public File Open and Duplicate create two editable rectangles in each. Explicit fixture persistence isolates decision handling; automatic backup debounce is covered separately. Both originals and both recovery digests are bound before reload and public Restore.

| Target decision | Target outcome | Unrelated outcome |
| --- | --- | --- |
| Save | Parse two 64 × 64 rectangles written to its original; remove only its backup. | Exact original and backup unchanged before Restore. |
| Save As | Parse the separate copy; original stays byte-identical; remove only target backup. | Exact original and backup unchanged before Restore. |
| Cancel dirty close | Selected target tab and both exact backups remain. | Original and backup unchanged. |
| Close recovery offer | Both exact backups remain after reload. | Original and backup unchanged. |
| Discard target recovery | Target original remains unchanged; only its backup is removed. | Original and backup unchanged. |
| Cancel Save As | Both originals and exact backups remain. | Original and backup unchanged. |
| Refuse Save | Error notification, dirty state and both originals/backups remain. | Original and backup unchanged. |

Every case then restores the unrelated file, verifies both 91 × 64 rectangles, executes Duplicate/Undo, explicitly saves, decodes its actual bytes, closes and reopens it. The target bytes are checked again afterward, and the remaining target recovery digest must match exactly. A backup count alone cannot pass this final check.

The picker returns an actual test-owned OPFS handle; Save As cancellation and write refusal are scoped overrides restored in `finally`. The test awaits the visible clean saved state before reading the output. It uses the canonical Chromium project, original 15-second budget and zero retries. It does not establish native panels, real external-file permissions, WebKit file-capability persistence, physical Tauri restart, power-loss durability or matched actual Pen design/states.

Initial infrastructure failures are retained: shell Bun 1.2.13 cannot parse the current MCP source, and an anchored grep selects no cases. The project-qualified Bun 1.4.2 path restores server startup. The first functional case reaches its final unrelated Save but has an invalid nested close-button selector; the corrected public button is a sibling of the tab. The next five-case control passes four and reads Save output too early in one. Waiting for the public saved state corrects that fixture sequencing; no runtime repair is inferred.

The seven-case control then passes in 65.562 seconds. After strengthening the final digest checks, six cases pass and Cancel times out waiting for the restored canvas while the complete static gate is running. The unchanged isolated Cancel passes with a retained trace. The cause of that intermittent failure is not established; CPU overlap is context, not a demonstrated root cause. The final trace-enabled seven-case cohort passes in 87.142 seconds with zero skips, retries or flaky cases. That successful run executes the strengthened assertions; it does not establish a correction or long-run stability for the earlier timeout. No timeout, assertion, retry, reference image or product behavior is weakened.

The complete static gate exits zero with zero duplicate-code clones; both new TypeScript owners pass strict 300/50/10/4/4 and test types. Actual `/Applications/Pen.app` is refreshed through REA as version 1.2.22 and its archive hash remains unchanged. Native UI access still reports locked. FILE-07/08, parity and public beta remain open.

Private receipts: `local-evidence/claude-brand-review-2026-11-11/recovery-file-decisions-{first,owned-port,server-diagnostic,qualified-runtime,save,all,seven,final,cancel-trace,qualified}.*`, strict/type/static logs and matching artifact directories. Source owners: `tests/helpers/document/recovery/files.ts` and `tests/e2e/app/recovery/files.spec.ts`.

## Held-read dismissal control

A subsequent bounded case tests the asynchronous Close hypothesis directly. It holds only the unrelated recovery file's actual `.fig` array-buffer read behind a scoped promise, waits until that read has started, clicks the public recovery Close button, then releases the read. It requires the correct two unrelated layers, exact backup digests and both original files unchanged. The override is released/restored in `finally` and never touches a normal profile.

The first traced held-read case passes. The complete eight-case cohort then passes in 97.033 seconds with zero skips/retries/flaky cases. Closing the offer during that held read does not reproduce the earlier lost-canvas outcome; this control narrows the hypothesis and makes no production repair. The earlier timeout remains unresolved. The override is subsequently moved to the owning Blob prototype so restoration leaves File's inherited method ownership intact; the final targeted case passes with that restoration boundary. Both touched owners pass strict limits and test types.

## Decision fixture lifecycle — 2026-11-12

A fresh twenty-repeat Cancel run yields nineteen passes and one total 15-second test deadline at the final already-open unrelated file. This differs from the older Home-state timeout; its in-flight transition remains unobserved. The fixture's cold startup/file/backup construction now uses the existing canvas-spec beforeAll/afterAll pattern. Setup and decision phases each keep the canonical 15-second limit; combined wall time can exceed 15 seconds.

All eight scenarios and every original decision/data/history statement remain equal under the AST/token control. The candidate passes all twenty Cancel repetitions in 293.723 seconds and the complete twenty-case Chromium/WebKit recovery cohort in 223.796 seconds, without skips/retries/flaky cases. Strict/type/full-static checks pass, with zero clones. This is a bounded fixture qualification, not a demonstrated production restore repair or complete FILE-07/08 acceptance. [Lifecycle evidence and limits](RECOVERY-DECISION-LIFECYCLE.md) retain both failures.

## Installed macOS two-file decisions — 2026-11-18

The normal Open Pen app (executable SHA-256 `0cab0ec48c05d2d67e291f262df3d789c1cca68d70ba23ab2bd3c081eb6f6e51`) opens two disposable existing `.pen` files. Duplicate creates two rectangles per file. Automatic persistence adds two recovery records and one blob per file, alongside four records and two blobs present at launch. Recovery reads use a read-only SQLite transaction and compare SHA-256 digests.

- Cancel from File → Close Tab keeps both dirty tabs, both target rectangles and every recovery record, blob and source file byte-identical.
- Don’t Save on the same named alert closes the target and removes only its two records and blob. Both source files, the other dirty tab’s recovery data and the older backups retain their exact digests.
- Save writes two distinct 91 × 100 rectangles to the remaining source. Close and reopen shows both layers from disk. Opening and closing the saved file preserves the exact four pre-existing recovery records and both blobs.

This exercises the installed app’s Close Tab alert and a writable Save. The earlier untraced Cancel-to-Home report and FILE-08’s broader reference and recovery-offer criteria remain open. Private receipts are under `local-evidence/user-native-regressions-2026-11-17/full-run-mac-2026-11-18/native-two-file-recovery/`.

## Playwright recovery replay — 2026-11-18

Local autosave, automatic draft and isolated Chromium process-loss contexts explicitly use the existing Cloud discovery fixture. The affected browser cases had reported public discovery CORS. The five focused Chromium cases now pass, including Save and a second process restart.

Chromium also hung on a cancelled `page.reload()` three times. The trace ends during Playwright’s wait for navigation after the browser dismisses the beforeunload prompt. The test now requests a real reload from the page, requires the actual beforeunload prompt and dismisses it, then verifies live geometry, both flush requests and both restored archive contents. Chromium and WebKit each pass three cancelled-reload repetitions and three automatic draft repetitions at the original deadlines. The changes apply to test fixtures and navigation only.

## Installed macOS Save As, Cancel and write-back — 2026-11-19

The installed executable from `7b72a75ba` opened a disposable external
`.pen` containing one red 64 × 100 rectangle. Native Command-D added a
second rectangle. The app offered a dirty tab, and automatic persistence
added two recovery records and one blob while the original file retained
its exact bytes.

Cancel in the real File → Save As panel kept the original tab selected
with both rectangles. No destination file appeared. The dirty-state
recovery digest set, the original file and the four existing recovery
records and two blobs all matched the pre-cancel readback.

On retry, the native Go to Folder control selected a separate directory,
and Save wrote the new file with two distinct editable 64 × 100 red
rectangles. The original remained byte-identical. Recovery returned to
the exact baseline set. A further Command-D and ordinary File → Save
wrote three distinct red rectangles to the new copy and preserved the
original. Closing and reopening the copy from Recents rendered all three
layers and preserved its checksum and the baseline recovery digest set.

This qualifies the installed app's existing-file Save As Cancel and
write-back path. The prior intermittent Cancel/Home report remains
unclassified. The Pen reference tab was opened and closed without edits
when the work moved to the beta board audit. The current reference
decision matrix remains open. Private evidence is under
`local-evidence/regular-save-as-2026-11-19/`.

## Pen 1.2.23 native decision reference — 2026-11-19

The installed Pen reference opened a byte-identical copy of the normal Open
Pen Save As fixture. Native Duplicate and a right nudge created a second red
64 × 100 rectangle while preserving the source checksum. File → Close Tab
showed the owned filename and Save, Don't Save and Cancel. The verified
Cancel kept the same tab available and the original bytes intact. File →
Save As opened the native `save .pen file as…` sheet. Cancelling the sheet
kept the original bytes and left the destination directory empty.

The retry wrote a separate copy. Its two unique rectangle IDs, red fills and
64 × 100 dimensions were verified on disk. Pen wrote its fills as hex strings. Open Pen’s own Save As file uses an array of paints.
Pen reopened its saved copy and rendered a solid red area measuring
148 × 200 pixels on the 2× display. The regular installed Open Pen build
from `7b72a75ba` opened byte-identical Pen output, showed both layers, and
rendered a 147 × 200 solid red area at its own viewport. The file was
unchanged after closing, as were the four existing Open Pen recovery
records and two blobs. Pen returned to the original tab and frame.

An earlier attempt observed the native dirty-close prompt. The prompt
disappeared before the guarded Cancel action and the reopened disposable
file contained both rectangles. The exact input that caused the write
was unobserved. That file and the refused foreground actions are retained
separately. The controlled repeat verifies the explicit Cancel paths.
These checks leave process interruption and recovery-state comparison open.
Private native receipts are in `local-evidence/pen-save-decisions-2026-11-19/`.

## Pen 1.2.23 recovery after process loss — 2026-11-19

A second instance of the installed Pen executable used a fresh, disposable
Electron data directory. The separate process held 61 files open under
that directory and none under the regular Application Support directory
at the interruption guard. The regular Pen process, active document and
window geometry remained in place. The test used the normal Open dialog
and did not connect an agent or copy credentials.

The disposable file began with one 64 × 100 red rectangle. A native click,
Duplicate and nudges placed a second rectangle at x90. The original stayed
byte-identical. Only the process running with the disposable profile was
interrupted. A new process using that same profile opened the recovered
tab with a warning indicator. The canvas still showed both shapes and the
original file still had its initial checksum.

The recovered tab’s native close alert offered Save, Don’t Save,
Don’t Save and Discard Backup, and Cancel. Cancel kept the tab open.
Don’t Save closed it while preserving the original source. Opening the
original through the native picker restored both shapes again. At the
same viewport and scale, the recovered canvas, post-Cancel canvas and
post-reopen canvas each showed a 248 × 200 solid red area. Explicit Save
wrote both unique rectangle IDs at x30 and x90. A clean third process
reopened the saved file with the same checksum and no warning indicator.
The test observed the separate backup through reopening behavior.

The Open Pen normal-feature control restores through a startup dialog.
At the time of this comparison, the Open Pen close handler removed recovery
data on its discard branch. Recovered state and startup presentation remain
part of the FILE-07 and FILE-08 comparisons.
Private screenshots and receipts are in
`local-evidence/pen-isolated-recovery-2026-11-19/`.

## Keep an existing-file recovery backup on macOS — 2026-11-19

[FILE-RECOVERY-KEEP](https://trello.com/c/vvn9pBkm) follows the observed
Pen 1.2.23 behavior where the original can reopen the kept backup. Open Pen
offers Save, Close and Keep Backup, Discard Backup, and Cancel in its app
dialog for a recovered local file. Ordinary dirty files retain the existing
system Save, Don’t Save and Cancel alert.

An isolated macOS bundle with normal application features and identifier
`dev.jpoindexter.openpen.recoverykeepqa` exercised two owned `.pen` files by
keyboard, macOS file-open events and accessibility actions. Executable
SHA-256 `7183e032760518cf14de9df4bcbbb2f95585a30fc1a1f95bf117bef4bfe8d3d7`.
Its local signature verified. After two distinct backups survived process
loss, Restore opened both tabs. Choosing Keep for the first Quit prompt and
Cancel for the second left both tabs open and both recovery records and
blobs byte-identical. Tab Keep saved the latest eight editable layers to
the backup, closed only the target tab, and preserved both originals and
the other backup. Opening the original restored the eight layers in one
dirty tab. Save from its close dialog wrote the eight layers to the source
and cleared only its own backup. Discard for the other file removed its
backup and preserved that file’s original bytes. Reopening the saved file
showed the eight editable layers without a recovery offer. An ordinary
dirty file still opened the three-button native alert. Don’t Save closed
that tab and preserved the original file.

An earlier build showed two tabs when a launch-by-path and the startup
Restore button targeted the same retained snapshot. The final build
repeated that sequence and opened one tab with the expected layers and
unchanged original file. A browser control explicitly refused just the
retention write, checked the message and open document, then successfully
retried and reopened the latest edits. All four existing-file recovery
journeys and 47 focused unit tests passed. Private logs, failed runs,
backup digests and app captures are under
`local-evidence/recovery-keep-qualification-2026-11-19/`. The normal
installed identity and broader FILE-07 and FILE-08 evidence remain open.

## Installed file history and metadata-only changes — 2026-11-19

The regular `/Applications/Open Pen.app` v0.16.0 executable
`f911038709287031c11e0d25d177a6315f6cec2d8e62951734f767a86b72ae73`
opened an owned `.pen` file with one 86 × 58 rectangle. Duplicate created two
editable layers and a recovery copy while the source bytes stayed exact.
Undo returned to one layer and removed that copy. Redo recreated it.
Cancel on Close Tab preserved the source and both edited layers. Explicit
Save wrote both rectangles, removed the owned backup, and reopened the
saved design. The two older recovery copies retained their original
metadata, records and blobs. The regular process remained live.

Before the history check, the regular app displayed File changed with no
change in the fixture’s bytes. A controlled change of its permissions
from 0600 to 0400 reproduced the warning with unchanged source bytes,
size and modification time. The pinned macOS Notify watcher recorded a
metadata event. Ignore preserved the edits and backup. An access-time
control produced no watcher event. This isolated permission experiment
does not identify the trigger of the earlier unobserved File changed
alert.

[FILE-WATCH-METADATA](https://trello.com/c/HPooh1BH) ignores explicit
metadata-only events for open design files. The isolated normal-feature
Mac package `920c480050767c8be7a54d8ec40f4035fb0b964b975d330b5574c031adf4411a`
ran the same permission control, and the watcher probe emitted the
matching metadata event. The dialog stayed absent across 25 samples, the original and backup stayed exact, and further keyboard
edits succeeded while the file was read-only. A genuine in-place external
write raised File changed. Ignore preserved all four local rectangles and
the exact backup. A subsequent atomic replacement raised the warning
again. Reload opened the replacement’s 137 × 81 rectangle and cleared the
old backup.

The isolated app reported version 0.16.0 and showed the unavailable-update
message through the macOS app menu. On the regular installation, the
original executable and older recovery records were independently
compared after the run. The watcher repair has no regular-install
delivery receipt yet. The normal installed-identity interruption and
broader Pen recovery state checks remain open. All 48 focused tests
passed. Private files and captures are under
`local-evidence/normal-installed-recovery-2026-11-19/`.


## Discard one recovered file with another still open on macOS

On 19 November, actual installed Pen 1.2.23 and the normal-feature Open Pen
arm64 package from `a30883a18` exercised the same two-file workflow. Pen
ran with a fresh Electron data directory. Open Pen used the disposable
package QA identifier and the
[verified candidate executable](NATIVE-RECOVERY-PROFILE.md#macos-bundle-replacement-and-rollback--2026-11-19).
Both opened synthetic `.pen` sources A and B on macOS 27.3. The fixtures
used 64 × 100 rectangles with different names and colors. The original
checksums stayed intact through physical edits, process interruption,
relaunch and the discard decision.

- Pen brought both recovered tabs back with recovery indicators. A’s real
  native close alert offered **Don’t Save and Discard Backup**. It closed A.
  Reopening A via the native picker showed only its original red rectangle.
  The saved source retained its original bytes. The green canvas region for
  B had the same dimensions, position and filled-pixel count before and
  after discarding A and after saving and reopening B. B closed without
  a recovery alert after reopening.
- Open Pen offered the two files in **Recover unsaved work**. Restoring
  each reopened its own dirty tab. A’s **Discard Backup** closed A and
  removed both A recovery records and its blob. B’s records and blob
  digests were unchanged. Reopening A showed its original clean
  one-layer document and original bytes. Explicit Save on B cleared its
  backup, and reopening B showed a clean tab with three editable layers.

The two saved B files each contain three unique rectangle IDs at
(30,100), (30,100) and (90,100), with matching dimensions, names and
solid green paint. The comparison normalizes the hex string and the
paint array to the same color. The first faster Pen interruption
returned an earlier visible position for B. A further edit and a later
interruption produced the comparison above. The fast interruption
capture stays with the receipts and does not establish a timing threshold.

Both regular app processes, executable checksums and window-server
geometry matched before and after. The regular Open Pen recovery store
retained all four original records and both blobs. The initial regular
accessibility inspection only returned application containers. The
final regular Pen document title and frame also matched the earlier
reference receipt. Private receipts are in
`local-evidence/recovery-discard-pair-2026-11-19/`. This verifies
targeted discard and preservation of the other recovered file. The
regular-identity interruption, remaining recovery states and matched
visual criteria are open.


## Recover after the original changes while the app is closed

On 19 November, the Open Pen normal-feature package from `a30883a18`
and actual Pen 1.2.23 both silently replaced an independent disk version
when saving a recovered document. Both runs used disposable profiles
and owned fixtures. The starting document had one 64 × 100 red rectangle.
A real edit added a second red rectangle. The source stayed byte-identical
through process loss. With the application stopped, an atomic replacement
installed a single 105 × 100 green rectangle at the same path. The
recovered canvas still showed both red layers, and the green replacement
still matched its recorded bytes. Explicit Save replaced the green
file with the two red layers. The Open Pen backup cleared. Both input
versions and outputs are retained separately in the private receipts.

Open Pen now records a SHA-256 digest of the bytes a desktop file was
opened from, reloaded from, or last saved with. A recovery backup
includes that digest when available. The desktop save path checks the
actual source immediately before writing recovered work over it. When
the bytes differ, the source is inaccessible, or an older backup has
no digest, the app retains the recovered work and directs the user to
save a separate copy. Older backups remain readable. This pre-write
check does not make two independent file writers transactional.

The corrected normal-feature arm64 executable has SHA-256
`4ec01ea6593faf73d81926eba96327f1299be15810a67f0e78c5a79bfcd9b9c9`.
Both test files carried their original digests in recovery after process
interruption. For the replaced file, explicit Save displayed Save As
guidance and kept both files’ recovery records and blobs byte-identical. The
native Save As panel Cancel changed neither file nor backup. Saving the
alternate path wrote two editable red rectangles, retired only their
backup, and left the independent green source byte-identical. The other
file’s original was unchanged, so direct Save wrote its recovered layers
and cleared its own backup. The separate copy reopened clean. Both normal
installed app processes and executable hashes were preserved, and the
regular Open Pen recovery store kept its four records and two blobs.

An additional test created a native backup with the earlier package,
then restored it with the corrected build. The earlier backup had no
source digest. Direct Save left its original bytes and exact backup
intact. The native Save As panel wrote the two recovered layers to a
new file and cleared the backup.

The 65 focused IO, recovery and native-file tests pass. The native build,
source and test types, architecture, documentation and changelog checks
pass. The test uses a separate app identity. Delivery to the regular
installation and the remaining FILE-07 and FILE-09 cases are open.

The original overwrites and subsequent checks are retained under
`local-evidence/recovery-offline-source-2026-11-19/`. This case belongs to
[FILE-07](https://trello.com/c/pLxRX3u0) and
[FILE-09](https://trello.com/c/xw31qkJ3).
