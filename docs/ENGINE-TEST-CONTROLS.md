# Engine test contract controls

These controls qualify the named test behavior. They do not accept full unit,
native, visual or Pen parity. The historical full-unit failure remains retained
under `local-evidence/generated-traversal-2026-11-10/`.

## CLI manifest refusal

[VERIFY-STORYBOOK-REFUSAL](https://trello.com/c/2Q5gUQVN) executes the actual CLI
against a valid local manifest containing a forbidden `../outside.png` entry.
The command must exit one, identify the rejected manifest and leave the outside
file's bytes exactly `keep`. The original failure demands inherited product prose
despite the correct refusal; it reproduces at both retained source revisions.

Commit `5ca803090` replaces only that wording assertion with the actual manifest
path. Parser validation, output writing, compatibility filenames and outside-file
checks are unchanged. Independent review finds no weakened refusal criterion.

The owner executes 22 tests and 93 assertions. The complete, explicitly selected
25-file CLI shard executes 122 tests and 435 assertions with zero failures.
General test types, owned lint and formatting also pass. Private receipts are in
`local-evidence/cli-storybook-refusal-2026-11-10/`.

This is a bounded traversal-refusal control, not every traversal/symlink case or
complete CLI product parity.

## Unit runner file selection

[VERIFY-UNIT-EXACT-PATHS](https://trello.com/c/zKgtuyp0) retains a separately
demonstrated runner defect: its 25 discovered CLI paths execute 52 files when bare
relative names also match copies inside ignored evidence and comparison trees.
The failed run records 243 passes, three failures and two errors. Ignored evidence
is preserved; removing copies would conceal the invocation defect.

Bun documents `./` or absolute paths as explicit files, while other positional
arguments are filters ([official documentation](https://bun.sh/docs/test)). The
candidate prefixes discovered relative paths at the existing spawn boundary,
preserving shard membership, supplied flags and heavy-process scheduling.

A temporary nested-copy control executes the actual runner. Original selection
includes the failing historical copy and exits one; the candidate runs only the
selected passing case and exits zero. A deliberately failing selected case still
exits one. Both temporary files are removed in `finally`, with receipts retained
in `local-evidence/unit-exact-paths-2026-11-10/`. The complete canonical CLI shard then passes 122 tests and 435 assertions across
25 files. Runner owner tests pass eight cases and 34 assertions; tooling types,
lint and corrected formatting pass. Independent review finds no selection or
failure-propagation defect. Commit `5aaffc45a` records the runner repair.

## Renderer Surface contracts

[VERIFY-GPU-SURFACE-CONTRACTS](https://trello.com/c/i3ut8d7u) reproduces three
`surface.flush` TypeErrors in the original owner tests. The fixtures omit the
required CanvasKit Surface method used by the unchanged production renderer.

Commit `a8f684aa1` uses the existing sanctioned double helper and asserts old
surface flush before tiled-resource cleanup and main-surface deletion. The next
surface is untouched. Destruction records flush, paint, text-cache, tile and
surface disposal order; a second destruction performs no additional teardown.
Existing paint/font and surface-reset assertions remain.

The affected owner passes three cases and 16 assertions. The complete render
shard, including its separately scheduled heavy cache file, passes 391 tests and
2,300 assertions across 66 files. Test types, lint, formatting and independent
review pass. Private receipts are in
`local-evidence/gpu-surface-contracts-2026-11-10/`. Mocked call ordering does not
prove real GL context selection, native stability or strict reference pixels.
