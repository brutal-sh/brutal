# CLI conversion output

Updated 2026-11-13. ERR-06 is Verify. Actual reference remains Pen 1.2.23,
archive `d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.

## Outcome and control

The [current troubleshooting guide](https://docs.pen.dev/troubleshooting) asks
users to check command status and the output file before using it. The [current CLI reference](https://docs.pen.dev/for-developers/pen-cli) still
warns that an export error may accompany a successful exit status. This is
documented reference behavior, not a newly executed Pen1.2.23 CLI failure.
Own CLI failure must report an error and preserve an existing conversion output.

At source `35ac925ee`, an actual owned `.pen` conversion exits one under a
1,024-byte process write limit after truncating its 4,480-byte destination to
1,024 bytes. An unrestricted retry succeeds. A first correction using the
existing atomic helper protects a writable output folder, but an actual
restricted-folder control reproduces the truncation through its in-place fallback.
Those controls, failure logs and intermediate source/test states remain private.

## Candidate and compatibility

The converter uses its existing Core I/O registry for both writable formats,
retaining Fig thumbnail generation. It writes through the existing Node atomic
helper with explicit fallback refusal. The helper's optional policy preserves
default behavior for all existing callers. Conversion requires permission to
create a temporary sibling; a destination symlink is replaced, leaving its target
untouched. Existing regular output modes are retained.

The headless document-save helper remains byte-identical to the published base;
its API, default symlink following and in-place fallback are unchanged. No normal
app Save, recovery, provider, install or native-menu behavior is modified.
The stricter conversion-folder and symlink policies are documented release changes.

## Qualification and re-entry

The first strict candidate passes 16 owner cases: both formats' limited-write
failure/retry, restricted-folder refusal/retry, symlink-target retention, future
schema refusal, existing font/thumbnail controls and Core mode/fallback contracts.
Strict size checking first rejects large test wrappers and a complexity increment.
Removing test-only grouping wrappers, isolating the existing fallback predicate and
keeping the headless helper unchanged yields the smaller four-file candidate. Its
final eight-file caller cohort passes all 32 cases with 140 assertions, including
existing import/eval/lint/diff/tool/library writes. The complete repository check
passes in 182.24 seconds with zero clones; strict 300/50/10/4/4 checks pass.

Now: publish the qualified converter slice privately, preserving exact source/output
identities, failure controls and independent review. ERR-06 retains applicable actual
reference/platform/CLI-output states outside this bounded converter slice. Next:
CLI-04-PNG qualifies actual export/output/failure/resource paths on owned designs.
No all-OS, power-loss, other export-command, native, beta or full-parity acceptance
follows from these controls. Windows does not execute the POSIX-only resource and
directory-mode cases; existing tests and thresholds are not weakened.

Private receipts: `local-evidence/cli-write-2026-11-13/`, including `before.json`,
`after.json`, `restricted-before.json`, `restricted-after.json`, `strict-after.json`,
retained failed owner/strict checks and the final source/check/publication records.
