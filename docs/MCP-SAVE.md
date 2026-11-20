# URI-addressed MCP Save

MCP-06-SAVE is Verify. This independently implemented candidate adds `save` with
one required string `uri`, alongside the existing `save_file` interface. Actual
Pen remains the reference; OpenPencil is the implementation foundation.

## Behavior

A file URI must resolve inside the configured MCP root and identify exactly one
already-open source. It never selects the active document as a fallback, opens a
file implicitly, asks for a destination, or retargets a source. Queries, fragments,
non-file schemes, invalid encoding and null bytes are refused. Existing root and
symlink containment checks apply before dispatch.

The application reuses the serialized document Save pipeline. It checks source,
tab ownership, access and cancellation before preparation and immediately before
the write begins. Browser automation writes through the authenticated MCP file
route; native automation writes its existing source. A refused write does not
mark that version protected or saved. Cancellation after an actual disk write
has begun cannot undo that write and is not an atomic rollback promise.

`save` and `save_file` share one access decision. Disabling either stored name
omits both tools; enabling either UI control clears both denials. Both HTTP and
stdio entries accept `--disable_save_tool`. Selection-only scope still excludes
writes, and this change does not enable eval or widen the filesystem root.

Save and Save As now have separate modules under the existing document I/O owner.
The ordinary picker, permission failure, download fallback, source restoration,
version tracking and recovery cleanup paths retain their existing owners.

## Qualification

The final software candidate passes the full repository check and production
build with zero clones. All changed TypeScript passes strict 300/50/10/4/4 limits.
The affected owner cohort passes 148 tests/720 assertions across 32 files.

The final real Node 24.18/MCP/WebKit cohort passes 32 cases without skips or retries:
background-source Save and fresh-reader reopen over HTTP and stdio; unknown and
malformed URI refusal; root/symlink containment; cancellation after encoding
without a write plus successful retry; access/source changes before writing;
persisted paired switches at 1280/390 px; and existing state, selection,
cancellation and connected PEN/FIG Save regressions. Actual built HTTP processes
also confirm default availability and flag-based omission/refusal of both Save
interfaces, with inspection retained and eval disabled.

There are 6558 built files and 2846 scoped inputs frozen byte-exact through the final
runs. The 17 protected files/modes, normal and older test binaries, and retained
workspace backup remain exact. Two earlier settings cases failed on unisolated
Cloud discovery; the stock fixture resolves those requests without suppressing
errors. One launch during a package rewrite ran no cases; builds and final tests
then run sequentially. Red controls also cover shared descriptor mutation.

The separate native-test build at `d73451a34` passes current-companion HTTP URI
Save on macOS: background A saves while active B's graph, history, dirty state,
source, file and accepted backup stay exact. Unknown and read-only targets refuse;
explicit retry and separate B Save persist the intended geometry and modes. A
fresh second native process opens both files without stale backups. The current
native two-document recovery regression also passes five phases across three PIDs.

Two native test corrections are retained: wait for the final startup file before
selecting an earlier tab; identify the authored rectangle by ID and type rather
than the same-name CANVAS page. No app-source, expected-geometry or timeout waiver
is used. The native binary SHA256 is
`e4c487e9f6ca0c9e3e1d9fba6dc35cdd0b8ae140b4858a934e2af684fcfe7292`.
The test uses an isolated current Node companion, not the normal installed one.

Live reference behavior, current native Save As pixel equivalence, complete
unit/browser suites and standalone packaging remain unaccepted.

Evidence: `local-evidence/mcp-save-2026-11-16/` (private local evidence).

## Reference limits

The host-provided Pen `save` registration advertises required string `uri`.
The official [AI integration guide](https://docs.pen.dev/getting-started/ai-integration)
documents omission with `--disable_save_tool`. Neither observation establishes
live reference Save output, error behavior or disabled-flag registration. Pen's
MCP quota refusal remains binding; no retry or extracted helper execution is used.

Current catalog reference is Pen 1.2.23, ASAR SHA256
`d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.
Exact reference outputs, remaining native delivery, standalone packaging and full
parity remain unaccepted. No normal Brutal installation or user profile is changed.
