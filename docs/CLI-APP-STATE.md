# Read-only app-state delivery

Updated 2026-11-15. This independently implemented candidate belongs to
MCP-03-GETAPPSTATE. It does not accept full reference, native or milestone parity.

## Contract and ownership

`get_app_state()` has a strict empty semantic input. Core returns its current
graph identity, page and selected layer summaries through one shared tool:

```text
graph: { rootId, name }
page: { id, name }
selection: [{ id, name, type }]
```

`graph.rootId` identifies the graph, not an app tab or automation target. The
existing transport resolves document/page targets and the connected CLI pins
their identity. MCP keeps its existing `document_id` / `page_id` transport fields,
tool policy and selection-only restrictions. No second state engine is introduced.
The shared runtime result schema is exported from
`@open-pencil/core/tools/read/schema` without loading authoring prompts.

The reader uses metadata rather than geometry getters, refuses a disappeared
page and excludes deleted, other-page and foreign-graph selection proxies without
rewriting selection. Imported IDs may match across documents, so graph identity
is checked before resolving an ID. The existing layer-summary helper preserves
public slot types. Reading state does not save or change the view/history.

## Executed controls and limits

Private evidence is retained under `local-evidence/get-app-state-2026-11-15/`.
The original missing-tool control fails. An equal-ID/two-graph control reproduces
false local selection before the graph check; a slot control reproduces a FRAME
summary before reuse of the public summary helper. All eight Core state cases
then pass, including unchanged graphs and selection and missing-page refusal.

The affected Core/CLI/MCP transport cohort passes 277 cases with one Windows-only
skip. Test types, strict changed-code rules and the full repository check pass;
the latter reports zero duplicate clones. The production build exits zero.
Actual compiled Node 24.18 public APIs confirm foreign-proxy exclusion, unchanged
graphs/selection, public SLOT summaries and missing-page refusal.

Three actual Node headless controls outside the checkout read state, change an
owned fixture's selection/page, reject unsupported arguments with exit 1, retry,
preserve source/prior bytes and modes, explicitly save and reopen in a fresh
process. Real MCP and connected Node/browser controls cover intended document
and page, selection, dirty/history state, unavailable or invalid targets, page/tab
switches, closed targets and renderer replacement. Final artifact hashes and the
combined runtime matrix are recorded with the private qualification receipt.
The final combined cohort passes 22 cases without skips, retries or flaky results;
all 6,559 built-file hashes and 20 frozen source-path hashes remain exact across
those controls. Seventeen protected file hashes/modes and the retained installed,
isolated native and original-workspace artifacts also remain exact.

Initial typing, fixture assumptions and package-rebuild overlap failures remain
retained. The full repository check rebuilds workspace artifacts in its later
tooling phase; final runtime qualification runs after both that command and the
production build finish. The renderer-replacement fixture completes an owned
Save before reload rather than interrupting an unrelated export-worker startup.

## Separate required work

The actual Pen reference remains 1.2.23 with archive SHA-256
`d0c5c23a3a86ec1802c8754b59e82600d815f0e2b6a383f655319535e6e07925`.
Its static get_app_state input is empty and read-only. Its current authenticated
MCP usage limit prevents live result/error observation; no retry or workaround
is used. REA's archive inspection records an unpacked-helper integrity mismatch,
and targeted analysis of the cataloged editor bytes times out before parsing.
Retained partial inventory evidence does not establish function coverage.
REA is closed. Exact Pen response/error equivalence remains unknown.

[MCP-05-SELECT](https://trello.com/c/zValTMfQ) separately owns the observed
connected selection call that reports success without changing editor selection.
The state tests establish selection through actual canvas UI; this reader does
not silently mutate selection to hide that failure. MCP-05 consumes the bounded
leaf, M05 owns it, and PARITY-ALL requires it.

Normal native delivery, standalone installation, reference/visual acceptance and
the full CLI-07 matrix remain open. No normal installation, signing/release,
profile/credential reset or strict pixel-baseline change occurs in this slice.
