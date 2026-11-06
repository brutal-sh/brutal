# Scene Graph model ownership disposition

Reviewed 2026-11-06 for [MOD-02](https://trello.com/c/BW7NKv2t).
Disposition: retain `packages/scene-graph/src/types.ts` as a specific model-contract size
exception. Owner: Scene Graph model maintainers; review/evidence owner: Codex.
This is an ownership review, not an executed code modularization or a line-count reduction.

## Observed boundaries

The 1,107-line file exports 56 interfaces, 53 type aliases, six constant catalogs or
regex definitions, and two three-line synchronous predicates. There are no mutation workflows,
render loops, network/file access, subscriptions or asynchronous operations in it. The predicates
classify library collections and valid mode-attribute names; they do not change document state.

The package root exports this model once. The graph owns nodes, variables, collections and
library bindings. SceneNode has 168 fields and directly refers to 52 model contracts in the same
file. The model is consumed from 125 internal import sites/files. These counts describe coupling,
not a requirement to keep declarations in one physical file.

Mutation lives in `graph.ts`; variable evaluation/resolution and validation live under
`variables/`; paint and text operations have their own domains. Shared field groups already live
under `fields/`. The default-node factory requires a complete flat runtime object, which is
compatible with either one type file or several: splitting declarations can preserve object
shape and public names. API breakage is not an inevitable cost of a careful split.

## Reason and review trigger

Retain one canonical root model surface for the coupled document contracts. This file defines
what data crosses existing domain boundaries, rather than implementing those domains' behavior.
A physical split is possible, but this review identifies no separate procedural responsibility
whose extraction would improve the current implementation. Avoid adding forwarding-only
compatibility shims or new public subpaths solely to meet a physical-line target.

The exception is limited to these model contracts and their small catalogs/predicates.
A future mutation, parsing, I/O, event lifecycle or substantial algorithm belongs in its owning
domain. Reopen the disposition if those responsibilities enter this file, or if a model domain
acquires an independent owner/consumer that benefits from separation. The other oversized runtime
modules remain open; this exception does not extend to them.

## Executed checks and limits

- The Scene Graph owner shard passes 1,486 tests and 10,789 assertions across 126 files.
- An actual public-root model probe creates a rectangle and checks all 168 runtime fields
  against the declared keys. Both predicates retain valid/invalid and length-boundary behavior.
- Package metadata, unique exports, contents, Publint and ATTW checks pass. The existing source,
  Vue and shared-test type gates pass in the current worktree, including the documented
  unrelated icon changes; they are not a clean published-checkout build receipt.
- Independent review reads the full contract and confirms the ownership rationale, while
  correcting the distinction between flat object shape and physical declaration co-location.

No runtime source, public export, serialized field or behavior changes in this disposition.
GUI/native and full-product parity are not established by these checks. The separate canvas
candidate remains in Verify with its native criterion held by a locked desktop.
