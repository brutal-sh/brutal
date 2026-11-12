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
