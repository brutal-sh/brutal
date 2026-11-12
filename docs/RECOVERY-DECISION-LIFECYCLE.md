# Recovery decision fixture lifecycle

This is a bounded test-fixture qualification. FILE-07/08 remain Verify. The earlier Home-state timeout stays retained under FILE-RECOVERY-CANCEL; these results do not establish a production restore repair or a 15-second combined workflow.

## Recorded failure

The unchanged Cancel journey runs twenty times sequentially, with tracing and no overlapping heavy checks: nineteen pass and one reaches the total 15-second test deadline. The failure snapshot shows the unrelated file reopened; the final loader query continues during teardown after the total test deadline. The older failure also reports the total test deadline, but stops on Home and has no trace of its in-flight transition. Those observations remain distinct.

Fixture construction performs a cold Home load, creates two real OPFS files, opens and edits both, persists two actual recovery backups and reloads to the offer. That construction previously consumed the decision test's deadline. The trace records substantial startup/reload time before the actual decision assertions.

## Bounded change

Each scenario now owns its fresh page and prepared files/backups through `beforeAll`/`afterAll`, following the existing canvas-spec lifecycle. The setup hook and actual decision test each retain the canonical 15-second limit. **Their combined wall time can exceed 15 seconds.** The page is closed after its scenario, and other scenarios receive fresh contexts.

The original eight scenarios and loop values remain. An AST/token control compares all three source-level test bodies after removing only the relocated setup statement: every decision, file/backup assertion, reload, Restore, Save, reopening and Duplicate/Undo statement is equal. `playwright.config.ts` is byte-identical. No retry, locator timeout, assertion, snapshot or threshold override is introduced. Production source is unchanged.

## Executed controls

- The first traced candidate passes. Its setup hook takes 9.092 seconds and the reported case duration is 5.432 seconds; the trace retains the same base URL, 1280 × 800 viewport, display scale two and test-ID convention.
- Twenty Cancel repetitions pass in 293.723 seconds, without skipped, retried or flaky cases. Reported case durations are 5.156–6.510 seconds, including their test cleanup; this does not include fixture construction or server startup.
- The complete recovery cohort passes twenty cases in 223.796 seconds: fourteen Chromium and six WebKit. It covers existing-file/draft decisions, write/Save As refusal, held-read dismissal, failed Discard retention and target-only retry. All original data/history checks remain.
- Both touched TypeScript owners satisfy strict 300/50/10/4/4 and test types pass. The complete static gate passes with zero clones.

The last full unit run records 10,172 passes, one Windows-only skip and the existing strict Note failure; that run precedes this test-only lifecycle change. Native application source remains identical to the separately executed profile/resource host, so these fixture results add no new native acceptance.

Private evidence: `local-evidence/claude-brand-review-2026-11-11/recovery-cancel-{repeat-original,lifecycle-*}.*`, original source copies under `recovery-cancel-before/`, and the original Home-state error snapshot. No original failure is removed or reclassified as successful runtime behavior.
