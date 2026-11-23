# Recovery copy and retention

Updated: 2026-11-07. Status: bounded browser criterion executed and published for
[BRAND-RECOVERY-COPY](https://trello.com/c/0qhVjqaB).
Source commit: [`a289fe255`](https://github.com/jpoindexter/brutal-editor/commit/a289fe25500786f12e5ce9fe68070192bb295b29).
Full branding, native recovery and Pen design parity remain open.

## Resulting behavior

Failed Restore uses the existing translated recovery-failure message in all nine catalogs.
The original parser error remains in the local recovery warning for diagnosis. Successful
Restore, Close, Discard, snapshot persistence and busy-state cleanup retain their existing
code paths. No recovery database, format, compatibility name or user profile is migrated.

The actual failed-restore capture exposed the problem: a damaged snapshot produced
“Operation failed: invalid zip data,” including the untranslated parser detail. The same
Error-first fallback is present at upstream tag `v0.16.0`. The change removes the generic
notification formatter from this dialog and uses its existing recovery message.

## Browser criterion

The 72 new journeys use fresh Playwright contexts with one disposable rectangle snapshot
each. Their canonical first-run preferences remain in place, and normal `/` startup loads
the real dialog. The four existing controls retain their prior context setup.
The four independent outcomes are:

- Close hides the dialog and retains the identical stored binary hash.
- Restore recovers the fixture's layer name and dimensions and retains its recovery entry.
- Failed Restore of deliberately damaged test bytes shows feedback, restores enabled controls,
  and retains the same bytes before and after Close.
- Discard removes the test snapshot; a subsequent reload finds no recovery dialog or binary.

The matrix covers English, German, Spanish, French, Italian, Japanese, Polish, Russian and
Simplified Chinese in Chromium and WebKit. Captures include the dialog, the failure toast
and the pre-discard state. Geometry probes check horizontal content and button containment.
Actual captures require separate inspection for naming, placeholder leakage and legibility.
The final run passes all 76 cases (72 translated outcomes plus four existing controls)
with zero skipped, flaky or unexpected cases and no retries, in 772,351 ms. All 72 captures
are inspected across 18 contact sheets, with full-resolution checks of the English dialog
and error. All 72 containment probes pass, and all 16 source-freeze hashes still match.
These are executed browser copy/retention checks, not actual-Pen pixel acceptance.

Known remote metadata requests use the existing local fixtures. The shared helper monitors
HTTPS requests; unconfigured HTTPS requests remain failures. The existing browser-error
policy is retained, including its official Cloud-origin console-error exception. This is
not universal network/error coverage. The test helper opens only its current runner-owned
context's IndexedDB, waits for transaction completion and closes the connection in `finally`.
No installed app, user document, recovery store, credential or browser profile is accessed.

## Validation and retained attempts

The normal worktree build, sequential source/Vue and test type checks, focused lint, and
18 recovery-owner tests (39 assertions across two files), architecture, documentation,
changelog and owned-file format checks pass. The first source type check
overlaps package generation and reports missing generated exports; its receipt is retained.
The sequential rerun after the build passes. No type suppression is added. The wider
combined gate retains its separately recorded native-typing and cache-scan limitations.

The existing recovery/tab controls pass four cases after two test-target corrections:
select the accessible Close Untitled action instead of the pinned Home tab, and open Layers
before checking a restored layer's visible name. No recovery-source behavior is changed by
those corrections.

The initial existing control fails at the old Close target; the next reaches Restore but
looks for a layer in the Agent panel. Both traces are retained. A new combined journey exceeds
the unchanged 15-second limit during its third reload. A split three-outcome matrix stops at
the first cold restore deadline with 53 cases unrun. The four-outcome baseline is intentionally
interrupted after 15 passes when its captures expose the parser-message problem; its remaining
cases are not accepted. No timeout, retry, baseline or global error filter is relaxed.

Raw reports, traces, source copies and hash manifests remain in ignored
`local-evidence/brand-recovery-*`, with command logs and source-freeze records in `scratch/`.
These local evidence roots are excluded from the published source change.

## Limits

The short Simplified Chinese failure toast groups its icon, message and controls into three
rows in both engines. It is readable and contained, but that grouping has no actual-Pen
comparison. [VERIFY-TOAST-SHORT](https://trello.com/c/f3kDECKO) preserves the unmeasured
design state as a full-parity dependency; no shared layout change is inferred from this check.

The failed-restore case proves retention through Close, not rediscovery after another launch.
One snapshot does not prove selective preservation among multiple snapshots or unrelated
documents. The fixture does not qualify OS crash recovery, native file panels, trusted pointer
or keyboard delivery, installation, storage migration or Pen's exact dialog geometry.
Restore does not mean its adopted recovery entry should be deleted; the restored document
still contains unsaved work.

See the [identity record](BRANDING.md), [PRD](PRD.md) and [task index](TASKS.md).
