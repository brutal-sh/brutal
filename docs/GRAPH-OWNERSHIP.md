# Graph ownership candidate

[MOD-04](https://trello.com/c/TrLXJQUl) remains unaccepted pending native interaction and
the imported-page acceptance gap. This is a behavior-preserving extraction candidate; source size,
unit tests and browser paths do not establish full Pen parity.

`packages/scene-graph/src/graph.ts` decreases from 848 to 592 physical lines, removing its
size suppression. Four internal owners under `src/graph/` hold actual domain procedures:

| Owner | Lines | Responsibility |
| --- | ---: | --- |
| `tree.ts` | 231 | Hierarchy queries, world-preserving moves, deletion, subtree copying and the absolute-position cache. |
| `scopes.ts` | 133 | Nested preview/import/source/layout/icon scopes, observers and delayed layout publication. |
| `ids.ts` | 38 | Collision-safe allocation across nodes, variables, collections and modes. |
| `indexes.ts` | 35 | Instance-index registration, removal and type/component transitions. |

The facade retains node creation/property application, change observers, buffered events and
existing variable/instance/hit-test delegation. All 94 public member declarations/signatures
remain unchanged. No public root export, serialized model, dependency, forwarding-only shim
or new size suppression is added. The remaining facade is above typical feature-module
size guidance; its explicit orchestration is retained rather than split into arbitrary files.

The tree owner reads current graph maps and calls the existing public recursive/query/edit
paths. Its removal callback reads the current instance-index map. Mutation scopes publish
layout updates before their depth decreases and restore nested generators/observers through
`finally`, retaining the original error and reentrant paths. History/checkpoints and document
writers capture explicit public maps and metadata; generic internal graph-object serialization
is not a supported behavior established by this review.

## Executed controls

- All 1,334 Scene Graph tests / 10,334 assertions pass before and after. Initial extraction
  leaves four helper receiver references pointing at the helper object; existing tests catch
  70 failures. Correcting those references to the graph restores the same complete suite.
  No test is weakened or removed to obtain the result.
- Core history, undo, clipboard, hierarchy, layout and component-scope checks pass:
  417 tests / 1,691 assertions across 70 files.
- Source/Vue/shared-test types, focused lint and architecture pass. A current-source AST
  comparison verifies all 94 public graph declarations/signatures against the original.
  This is a public-surface check, not universal external-subclass equivalence.
- Fifteen browser controls pass after extraction in 33.2 seconds: Chromium canvas history
  across keyboard layouts, opened-file saved/close state and focused text/context Undo;
  WebKit executes the three text/context paths. Those exact cases also pass before editing.
  Browser keyboard delivery is separate from trusted native OS keyboard acceptance.
- Ten existing named visual controls pass in Chromium and WebKit in 34.5 seconds with no
  snapshot updates. Five exported PNG assertions use zero pixel tolerance; the pending dark
  viewport retains its earlier tolerance. These controls originate before the font extraction
  with the identical original graph source. They establish bounded visual stability, not
  actual Pen pixel parity.
- The production build, package metadata/exports/contents/Publint/ATTW checks and isolated
  native-test compile pass. Existing warnings are retained in logs. These builds include
  preserved unrelated icon worktree changes; they do not qualify a clean release or native
  interaction. No main app installation or profile is changed.
- Independent source/saved-receipt review finds no concrete residual defect in the five
  source files, including mutable-map access, receiver correction and nested cleanup.
  The reviewer does not independently rerun the browser or native paths.

## Retained gaps

The full original browser baseline has 15 passes and one failure: the imported `slots.fig`
page control resolves but is invisible, so its click times out. This occurs before any graph
source edit and is recorded under [IO-01](https://trello.com/c/HWOtsePR). The candidate run
selects the 15 passing cases; it does not accept the omitted page route. The original suite's
11.9-minute total exceeds its listed case times; the startup/runner cause is not established.

Private receipts: `scratch/mod04-owner-before-2026-11-06.log`,
`scratch/mod04-owner-after-2026-11-06.log`,
`scratch/mod04-owner-corrected-2026-11-06.log`,
`scratch/mod04-core-contracts-2026-11-06.log`,
`scratch/mod04-browser-before-2026-11-06.log`,
`scratch/mod04-browser-after-2026-11-06.log`,
`scratch/mod04-visual-after-2026-11-06.log`,
`scratch/mod04-normal-build-2026-11-06.log`,
`scratch/mod04-package-quality-2026-11-06.log`,
`scratch/mod04-native-build-2026-11-06.log` and
`local-evidence/mod04-graph-2026-11-06/before-page-case/`.
Original and candidate source hashes and the public-declaration check remain private.
The original source matches the graph source at both font-control commits and the published
parent, so existing named visual controls retain their graph provenance without rebaselining.

Native UI was last blocked by a confirmed locked desktop. No native interaction or whole
product completion is claimed. Preserve the main installation, user profiles, credentials,
recovery state and unrelated icon changes. The full design and functionality goal stays active.
