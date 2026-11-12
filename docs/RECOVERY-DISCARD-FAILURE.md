# Refused recovery discard and retry

[FILE-RECOVERY-DISCARD](https://trello.com/c/fgEjGL6B) owns this bounded error-handling repair. FILE-07/08 and full native/reference acceptance remain open.

## Reproduced failure

The original dialog awaits recovery deletion and resets its busy state in `finally`, but has no `catch`. Refusing the actual recovery database's write transaction leaves both recovery rows present without visible failure feedback. The initial toast-oriented negative control fails; after consulting the repository's persistent actionable-error rule, the corrected inline-alert control also fails before the production change. Both receipts remain retained. The missing discard catch also exists in released `v0.16.0`, verified directly before adding the release-note fix.

The controlled transaction refusal affects only `open-pencil-recovery` writes in a fresh runner profile. Read transactions still inspect the actual recovery bytes. It does not simulate filesystem permissions, corrupt data, browser termination or a native OS prompt.

## Resulting behavior

The dialog catches the failed discard and shows the existing accessible `AppAlert` beside the rows. The message stays visible while the user chooses what to do. Discard and Restore become available again; the next discard attempt clears the previous error. No raw backend error is displayed and no duplicate toast is added. English and all eight existing translated recovery catalogs contain the new message.

The database removal, serialization, fallback policy and restoration implementation are unchanged. Rows are removed only after the existing deletion promise succeeds. The repair does not claim to resolve the separately retained intermittent Cancel-to-restored-canvas timeout.

## Executed evidence

Both Chromium and the named WebKit control pass the initial error/retention/retry journey. Each binds two distinct backups before refusal, checks their exact digests after failure and reload, retries deletion of the selected target, then reloads and restores the unrelated rectangle with Duplicate/Undo. The scoped refusal is restored in `finally`. Captured dialog images from both engines are inspected: the alert, document rows and controls fit without clipping.

Three source/test owners pass strict 300/50/10/4/4 limits, test types pass and all locale catalogs pass structural/translation-baseline checks. The first combined recovery cohort passes 19/20 cases. WebKit fails an added mouse-focus assertion that had no established focus precondition; the original error/retention/retry path passes in both engines. The corrected keyboard control explicitly focuses and verifies the target before Enter, retaining the post-failure focus assertion. The corrected keyboard control passes in both engines with focus verified before Enter and retained after failure; the successful retry clears the alert. No production focus change is needed. The final combined cohort passes all 20 cases in 207.520 seconds (14 Chromium and six named WebKit), with zero skips/retries/flaky cases. It includes both corrected keyboard/error/retry paths, all ten draft-decision cases and all eight existing-file/held-read cases. The complete static gate exits zero with zero duplicate-code clones; final source/test types, locale checks, architecture and structure checks pass. The existing 15-second case budget, retries and assertions are not weakened.

Actual Pen remains 1.2.22 with the retained archive hash. Computer Use again reports the Mac locked, so this does not accept Pen error-state matching, native input, OS panels, external-file permissions or physical Tauri restart. No normal app, user files/profile/credentials/recovery or protected icon work is changed.

Private evidence: `local-evidence/claude-brand-review-2026-11-11/recovery-discard-failure-{red,inline-red,green,cohort,strict,final-strict,i18n,types}.*` and corresponding artifact directories. The full unit receipt predates this UI repair and retains the strict Note rendering failure; it is not full recovery/native/parity acceptance.
