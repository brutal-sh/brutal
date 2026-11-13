# Headless interactive CLI

Started 2026-11-13; updated 2026-11-14. CLI-05 is Verify. Current reference is Pen1.2.23, with its
unchanged archive already cataloged through REA/Hopper. The official interactive
contract is documented at https://docs.pen.dev/for-developers/pen-cli. Actual
reference CLI execution remains subject to its existing account/access gate;
there is no retry or bypass of that gate.

## Original control and implementation scope

At `28d94c77a`, the built workspace Node entry rejects `interactive` and creates no
requested output. Two committed process regressions fail before implementation.
The candidate adds a persistent headless document/API session over existing Core
tools, using explicit `save()` and `exit()` calls. Input and local assets use the
existing rooted reader; output uses existing `.pen`/`.fig` IO and strict atomic
replacement. Exit, EOF and interruption do not write another copy.

The command parser uses the workspace's existing Acorn8.18.0 parser, declared as a
CLI dependency with its existing lock integrity. A frozen offline install passes;
an earlier unconstrained offline resolution fails on uncached metadata and is
retained. No package version is upgraded. The parser constructs only bounded
literal data; the explicitly requested existing `eval` tool keeps its code
execution semantics. It is not a sandbox for that tool's host effects.

The shared headless-tool extraction retains existing tool/diff callers. Failed
session calls restore graph state and the API's page/selection; failed saves retain
live edits and the prior file for retry. Normal app binaries, credentials, profiles,
recovery, original workspace and protected icon work remain outside this slice.

## Review controls and corrections

The initial111-case caller cohort passes with442assertions. Sixteen actual Node
controls outside both checkouts execute new `.pen`/`.fig` sessions, fresh-process
reopen, PNG decoding, exit/EOF, malformed/unknown calls, macro arguments,
unsupported output/future input, embedded relocated image bytes, limited/restricted
writes and retry, symlink targets and input/resource preservation. An earlier
resource-control typo addresses a nonexistent node: the CLI correctly refuses it;
the corrected fixture ID/paint-array control passes without production changes.
Those results precede the rollback corrections below and require rerunning on the
final source before qualification.

Independent read-only review identifies two real omissions. Executed red controls
confirm both: graph rollback restores a connector node while leaving the wrong
connector-index entry, and a refused read queues recovery notifications as edits,
changing an untouched stored Hug extent from100to50 on the next geometry read.
The shared Scene Graph checkpoint now restores its connector Set before notifying
consumers, preserving its identity; its validation/recovery responsibilities are
split under the strict size limits. Core captures outstanding pending-layout
impacts, and the session restores those after graph recovery, retaining earlier
successful edits without reflowing untouched geometry. Focused red assertions stay
unchanged and pass after rebuilding the public packages.

## Open qualification

All 1,655 affected caller cases pass with 11,681 assertions across163files,
including SceneGraph, history, clipboard, pending layout, shared-tree and CLI
callers. Strict changed-code limits, root structure and source/test types pass.
All16 actual outside-checkout Node controls repeat successfully on the corrected
build. An actual PTY session creates, inspects, explicitly saves and exits; a
second session creates an unsaved shape and Ctrl-C exits without changing the
last saved file bytes. A second read-only review finds no further product defect
and corrects the public guide introduction to include the headless exception.
The first full gate retains a typed indexed-access failure; both potentially empty
AST arrays now use `at(0)`. Typed lint and39related CLI cases/96assertions pass,
and all16Node controls plus the actual Save/Ctrl-C terminal control repeat on that
source. Only the parser changes after the1,655-case cohort; all other16runtime
hashes remain identical. The complete repository gate now passes in182.86seconds
with zero clones. All62browser cases pass with no skipped, unexpected or flaky cases and retries
disabled: export runs in Chromium/WebKit; scale, in-memory clipboard and history
run in Chromium. The22retained artifacts are independently decoded, including two
PDFs with exact owned solid-image samples/searchable text and WebP fidelity against
the owned PNG. Existing strict fractional assertions stay unchanged. Production
Vitebuild passes in5.59seconds. This is browser/build evidence, not an installed
WebView or production-preview acceptance. Final independent read-only source/receipt review verifies all17qualified hashes,
22artifact hashes, complete gate/build, actual Node controls and final PTY retained
bytes and finds no remaining actionable issue. Existing strict Note,
wrap and resource-pixel failures stay unaccepted with no changed baseline or
threshold. A synthetic stored-Hug control does not qualify current Pen pixels or
saved-reference import behavior.

Actual Pen tool-name/execute parity belongs to CLI-07, connected interactive mode
to CLI-06; those are not implemented by this headless shell. Native desktop reopen,
reference/platform comparisons, standalone package installation and release trust
remain open. This slice cannot close CLI-05, any milestone or the full parity goal
without their actual required evidence. Private commands, failures, test logs,
source hashes and synthetic outputs are under
`local-evidence/cli-interactive-2026-11-13/`.

## Current handoff — 2026-11-14

CLI-05 is Verify and CLI-06 is the sole Building card for live app connection.
All525live cards reconcile:507execution tasks with one primary owner each,
18milestones, and506other terminal prerequisites. Counts are374Backlog, noReady,
oneBuilding,45Verify and87Executed. Source states and milestone allocations match;
there are no unknown dependencies, cycles or Executed/open-prerequisite
contradictions. No execution card or milestone is newly accepted. These counts do
not measure design/functionality parity or predict a beta date.
