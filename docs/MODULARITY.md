# Runtime modularity audit

The [expanded runtime inventory](RUNTIME-PACKAGES.md) measured on 2026-11-07 covers
3,607 authored code files across twenty owners, including the additional packages and
four native JavaScript helpers, two public OAuth callbacks and two browser alias stand-ins. It finds fourteen code files above 600 lines, plus a
separate review queue for the Kiwi schema and eight translated catalogs. The original
five-root measurement below is retained with its exact scope; it is not the whole app.

Measured 2026-11-06 from the current source after the graph ownership candidate.
This includes canvas, font and graph candidates whose native acceptance is pending; counts do not qualify behavior.
This is a size/ownership review, not proof that all architecture or behavior is accepted.
The implementation uses OpenPencil's existing package boundaries; Brutal-specific behavior is added to the owning domain.

The subsequent [Note Fill ownership follow-up](NOTE-FILL.md) reduces the layout
coordinator from 622 physical lines to 128 (102 code lines), with flex construction,
child sizing, leaf measurement and geometry writes in their owning domains. Vue layout
actions retain one preview owner across focused property, sizing and alignment modules.
All 18 changed TypeScript source modules pass the strict 300-code-line, 50-function-line,
complexity-10, four-parameter and depth-four checks. Comments and blank lines are excluded;
this does not assert that all runtime owners meet those limits. MOD-14 remains unaccepted
pending its complete behavior/rendering criterion and GPU dependency.

The 2026-11-11 Hug follow-up groups Note leaf/body layout and its height contribution
under `layout/notes/`. Browser test-driver factories separate setup, selection,
components, paints and read probes while preserving their 11 methods. All seven
TypeScript runtime/test modules touched by this follow-up meet the same size and
complexity limits. The [Note evidence](NOTE-FILL.md) keeps the behavioral and rendering
qualification boundaries explicit; this remains a bounded ownership change.

The 2026-11-11 remaining-branding candidate groups AI defaults into chat, models, failures
and setup; Cloud defaults into editor connection/documents/workspace/history and portal
access/account/admin; and provider tables into agents, provider types, OpenAI models and
registry. Public catalog and provider contracts remain unchanged apart from intended copy.
The same candidate moves 37 Cloud request methods into their owning domains, preserving
method bodies and original request options. Its focused 155 tests, complete Cloud suite and combined repository check pass. All 36 touched
TypeScript source modules meet the strict size/complexity limits; the optimized macOS package is installed and its bounded English identity surfaces are observed. These bounded changes do not establish whole-app
compliance with the size limits.

The AssetsPanel extraction on 2026-11-11 reduces its original 669 physical lines to
308 (below 300 code lines), with catalog projection, preview request/URL lifecycle,
insertion/materialization and details-dialog markup in four focused owners. Existing
thumbnail and page lookup modules remain unchanged. All nine asset source/example
modules meet the strict 300/50/10/4/4 checks. Current Components-workspace tests retain
insertion, details, search, main-component navigation, real canvas drag, entered-container
coordinates and FIG/library lifecycle contracts; legacy grid/list metadata stays in an
isolated real-component story. The unchanged original component passes the repaired
frozen baseline before extraction. Candidate Chromium/WebKit runs pass 12 app and four
story cases; all 12 captured images exactly match the original pixels. Focused library
and Core component owners pass 113 tests/454 assertions. Independent source review
finds no concrete regression. These are behavior-preservation and ownership receipts,
not actual Pen surface, trusted OS input or full-product acceptance. Private receipts:
`local-evidence/assets-modularization-2026-11-11/`.

The recovery-owner follow-up is tracked in [RECOVERY-OWNERS.md](RECOVERY-OWNERS.md). The original recovery/source/tab factories exceed the requested function or module gates. Five recovery runtime modules now pass strict 300/50/10/4/4 checks with owner and browser preservation controls; the complete static check passes with zero clones and private publication remains pending. The separate local-file backup defect remains red and is not accepted by modularization.

Scope: authored `.ts`, `.vue`, `.rs` and `.css` under `src`, `packages/core/src`,
`packages/vue/src`, `packages/scene-graph/src` and `desktop/src`. Counts are physical lines.
`.d.ts` declarations, tests and `.stories.ts` examples are excluded; authored catalogs are included.
This original scope excludes other first-party format, CLI/MCP and service package owners.
[MOD-AUDIT-CLOSURE](https://trello.com/c/R0oPWJAa) adds their measured inventory and bounded
MOD-16–MOD-20 follow-ups. Inventory acceptance does not accept those module dispositions.

| Size      | Files |
| --------- | ----: |
| 1–50      | 1,192 |
| 51–200    | 1,365 |
| 201–300   |   205 |
| 301–600   |   161 |
| Above 600 |    12 |

Total: 2,935. Median: 65. At most 300 lines: 2,762 (94%).

The initial baseline has 2,922 files, median 64.5, and 15 above 600. MOD-07 adds one
focused owner and reduces the over-600 count to 14. MOD-02 records a reviewed model-contract
exception among those 14, leaving 13 open dispositions. The canvas candidate adds two small
owners, included in the current count without accepting its pending native behavior.
The font candidate adds six internal owners and brings the over-600 count to 13; one is the
reviewed model exception, 12 oversized owners still need disposition, and font acceptance
remains open pending native execution. The graph candidate adds four owners and brings the
count to 12: one reviewed model exception and 11 other oversized owners. Both font and
graph acceptance remain open despite their reduced sizes. The baseline remains available at the planning commit; counts describe the measured source scope, not accepted product parity.

There is no universal industry file-size standard. Use 50–200 lines as a useful range for
focused helpers/controls and 200–300 for a cohesive feature module, not a compulsory split.
The repository's configured review warning is 600 lines. Some inherited files have exceptions.

| File                                                       | Lines | Required review                                                                  |
| ---------------------------------------------------------- | ----: | -------------------------------------------------------------------------------- |
| `packages/core/src/canvas/scene.ts`                        | 1,140 | Separate cohesive scene drawing responsibilities; retain pixels and order.       |
| `packages/scene-graph/src/types.ts`                        | 1,107 | Reviewed model-contract exception; see MOD-02 disposition below.                 |
| `packages/core/src/canvas/renderer.ts`                     |   752 | Separate lifecycle/state responsibilities using existing renderer domains.       |
| `src/app/tabs/index.ts`                                    |   715 | Separate tab lifecycle, persistence and selection ownership.                     |
| `packages/vue/src/i18n/messages/panels.ts`                 |   694 | Review catalog domain ownership; a declaration/catalog exception needs a reason. |
| `src/components/assets-panel/AssetsPanel.vue`              |   669 | Separate asset browsing, selection and operations by responsibility.             |
| `src/components/browser-preview/BrowserPreviewControl.vue` |   658 | Separate browser toolbar/menu workflows while preserving native dock geometry.   |
| `packages/core/src/io/formats.ts`                          |   650 | Extract format-owned loading/export helpers; preserve registry contracts.        |
| `packages/vue/src/canvas/useCanvasInput.ts`                |   632 | Separate input domains; retain focus, modifiers and cancellation.                |
| `src/app/shell/menu/schema.ts`                             |   621 | Review menu domains while retaining shared IDs/order/native parity.              |
| `packages/core/src/layout.ts`                              |   619 | Separate layout coordination domains; retain authored geometry.                  |
| `packages/core/src/figma-api/index.ts`                     |   606 | Review facade versus domain implementation; retain public API.                   |

Every original oversized file has its own review/refactor task. Eleven listed oversized dispositions
remain open; `types.ts` is the reviewed exception. The font and graph candidates are below the size warning
but their acceptance remains open. Completed dispositions are recorded separately below.
Do not remove attribution, change serialized formats or introduce forwarding-only public
exports to reduce a count. Declaration/catalog exceptions must identify an owner and reason.

For each refactor, read callers and the owning guide, extract one cohesive responsibility,
run the relevant behavioral tests, and compare affected browser/native output. Required
checks include public exports and architecture; renderer changes retain canvas evidence.
Measure candidates explicitly without accepting them from line reduction. Record executed
dispositions only after the corresponding behavioral criterion runs.

## Executed disposition: MCP startup

[MOD-07](https://trello.com/c/Z8yoNzfz) separates health response/model/version checks into
`src/app/automation/mcp/health.ts` (102 lines) and startup-exit formatting into the existing
`failure.ts` (112 lines). `spawn.ts` decreases from 703 to 584 lines and retains native routing,
auth/discovery state, fetch failure recording, child ownership and timeout/cleanup behavior.
The runtime imports the health type from its owner. No forwarding-only module or new generic
factory is introduced. The remaining orchestrator is above the usual feature-module guidance;
its retained connection lifecycle remains explicit and is reviewed when changed.

Executed: the four extracted blocks retain their original implementation after export/whitespace
normalization. All 53 startup/runtime/native-configuration/transport tests pass (301 assertions),
and independent review repeats 18 spawn/runtime tests. The isolated native WebView reaches
Running, passes authenticated health, restarts from PID 65564 to 65611, and verifies the previous
process exited. Both test-owned MCP processes are independently absent after the session.
The captured native MCP screen shows Running; no visual layout change is implemented.

The native fixture reads its route from the test-only command, checks the private temporary
directory, and never hides or renames an installed executable. Source/Vue/shared-test types,
focused lint and architecture pass. The native test bundle builds at 90.22 MiB and passes local
strict ad-hoc signature verification. The first source type check overlaps package-output
regeneration and fails resolution; a repeat after package outputs are restored passes.

Limits: the dedicated native-driver type gate retains 67 errors outside the changed files.
The native bundle includes preserved unrelated icon/GPU WIP, so this is bounded MCP-path
evidence, not clean release qualification. Native DOM/WebDriver handlers and real processes
are exercised; trusted OS-pointer and forced missing-install native delivery are not claimed.
Missing/outdated refusal logic remains covered by focused tests and natural native branches.
Driver window-title/mock-cleanup warnings remain in the receipt; visibility is asserted and
process cleanup is independently checked. Main installation, user data and global MCP binaries
remain untouched. Fourteen oversized owners and full product parity remain open.

## Candidate awaiting native verification

[Canvas reuse](CANVAS-LIFECYCLE.md) adds two focused app owners of 38 and 48 lines.
Browser resource, rendering and teardown evidence passes; isolated native acceptance is held
by a confirmed locked desktop. These additions are not an executed oversized-module disposition.
The current source-size table includes those additions without qualifying native graphics.
[MOD-03](https://trello.com/c/4ehkJaOM) separates the font-manager responsibilities.
Its [ownership and verification record](FONT-OWNERSHIP.md) distinguishes the passing
refactor controls from existing workflow failures and unexecuted native acceptance.
[MOD-04](https://trello.com/c/TrLXJQUl) separates graph hierarchy/cache, scope and ID/index
procedures; its [ownership record](GRAPH-OWNERSHIP.md) retains owner/history/browser and visual
controls, the pre-existing import-page failure and pending native criterion.

## Executed disposition: model-contract exception

[MOD-02](https://trello.com/c/BW7NKv2t) retains the 1,107-line root Scene Graph model contract.
Owner: Scene Graph model maintainers. The [ownership disposition](MODEL-OWNERSHIP.md)
records 56 interfaces, 53 aliases, six constant catalogs/regex definitions and two three-line
pure predicates; mutation/evaluation and validation already have separate domain owners.
This is an ownership review and explicit exception, not a code extraction or line reduction.
A careful physical split could preserve runtime shape and public names; it is not prohibited.

All 1,486 Scene Graph owner tests / 10,789 assertions, actual public model/predicate checks and
package metadata/export/contents/Publint/ATTW checks pass. Independent review confirms the narrow
rationale. No runtime source, public export or serialized shape changes. Reopen this exception
when procedural responsibilities enter the contract or an independently owned domain benefits
from separation. At that review, fourteen files remain above 600 lines; thirteen need disposition.
The current table additionally includes the unaccepted font and graph candidates, reducing
those counts to twelve files and eleven other oversized owners.

## Executed criterion: format registry

[MOD-11](https://trello.com/c/yoCuhcXD/97-mod-11-split-cohesive-responsibilities-formatsts) separates the existing PEN adapter and
its asset-loading helpers into their format owner. The candidate registry is 513 lines,
the adapter 129 and shared immutable contracts 17. The complete moved bodies and public
metadata/order are retained. The expanded baseline above remains 3,607 code files at its
measured source; this candidate adds two files (3,609) and reduces code files above 600
from fourteen to thirteen, without accepting behavior from counts. [Format evidence](FORMAT-OWNERSHIP.md)
records the before/after controls, one executed isolated native save/reopen path and
remaining native file-panel/full-format limits. Source publication/readback follows.

## Candidate awaiting native verification: tab ownership

[MOD-06](https://trello.com/c/4BpMrJ8z) separates lifecycle state and cover ownership from
the opening/recovery entry: 715 lines become 495, 218 and 57. The same 31 public names,
singleton refs, moved bodies and cleanup order are retained. The expanded baseline gains
two more files, reaching 3,611, with twelve code files above 600: one reviewed model
exception and eleven other oversized code owners. These counts include the unaccepted
tab candidate and do not close its behavioral criterion.

[Tab evidence](TAB-OWNERSHIP.md) records 150 owner tests and twelve browser controls before
and after, source/consumer types, lint, architecture and build. Both full app-shard controls
retain the same three failures; two narrow verification cards preserve those failures.
MOD-06 remains Verify until fresh isolated native tab acceptance can run on an available
desktop. The existing font and graph native criteria remain open too.

## Candidate awaiting reference acceptance: FIG text import

[MOD-16](https://trello.com/c/P6y3uJe1) moves the existing text-conversion concern into
`node-change/text/import.ts` (187 lines), reducing `convert.ts` from 1,333 to 1,155.
Seven helpers and their private type retain their implementations; dispatcher order,
other declarations and public exports are unchanged. The remaining coordinator
still exceeds the review threshold and belongs to MOD-19.

The expanded source candidate now has 3,612 runtime code files and twelve above 600. [FIG text evidence](FIG-TEXT-OWNERSHIP.md) records 761 owner tests before/after,
zero differences in two complete archive digests, four browser round trips in both
controls, and an identical actual wrapped-text PNG. The old stored visual control
still fails, and required live Figma validation is unexecuted. MOD-16 stays Verify;
line reduction and preserved before/after output do not close those gates.

## Candidate awaiting reference acceptance: FIG raw payload export

[MOD-17](https://trello.com/c/uGL3MDSH) moves raw payload preservation into the existing
export domain: `node.ts` decreases from 1,017 to 712 physical lines; `raw-payload.ts`
has 312 physical lines, 233 excluding blank/comment-only lines. Twenty declarations,
context/cache identity, field precedence, remaining dispatcher order and public exports
are retained. MOD-20 still owns the oversized coordinator review.

[Payload evidence](FIG-PAYLOAD-OWNERSHIP.md) records the 761 owner and 26 Core patch
checks and three complete saved archives. All decoded records, blob/image hashes and
interpreted digests match; only the metadata export timestamp differs. The actual
wrapped-text browser image is unchanged, while its failed stored control and required
live Figma validation remain open. MOD-17 stays Verify. The expanded runtime candidate
now has 3,613 files and twelve above 600; that count does not accept either FIG refactor.

## Reviewed declaration exception: Kiwi wire schema

[MOD-18](https://trello.com/c/3TOfol9P) retains the 5,628-line protocol declaration
under a named exception, with ownership, provenance, pinned hashes and review triggers
in [schema ownership](KIWI-SCHEMA-OWNERSHIP.md). This is a data-contract disposition,
not code extraction or line reduction. The schema grammar has no include mechanism;
adding a composition step solely for counts does not simplify its protocol model.

The actual raw/parser/shipped schema, binary-schema round trip, codec bytes and
compiled tables preserve all 605 definitions, 2,210 non-enum fields and 1,604 enum
values. All 43 Kiwi tests and package types pass; twelve source hashes remain unchanged.
Existing whole saved-archive controls retain records, blobs, images and interpreted
values. Independent review finds no concrete blocker to the bounded exception after
publication. This does not accept complete message semantics or native/Figma behavior.

## Candidate awaiting browser/native verification: menu catalog

[MOD-13](https://trello.com/c/dqmI6X9G) reduces the 621-line declaration owner to 106 lines
plus file/settings (118), view preferences (120), and editing/selection/text/arrangement
(296) catalogs. All four are below 300 nonblank/noncomment lines. Original exports, data,
shortcuts and generated native artifacts are retained; 24 owner checks and the normal
build/type/architecture controls pass. [Ownership evidence](MENU-SCHEMA-OWNERSHIP.md)
retains both browser runs and the two explicit blockers. Counts are a candidate measurement,
not acceptance or an update to the historical global-size snapshots above.

## Executed criterion: canonical rectangle types

MOD-RECT reuses Scene Graph's Rect contract in stroke outlines and browser dock bounds, removing two parallel declarations in `1306f6cf2`. No external app consumer of PreviewBounds exists and Box was private. Emitted JavaScript is byte-identical in both files; the unchanged object-shape checker passes and the exact owner selection executes 13 tests with 52 assertions across two files. This does not rerun or close the complete size audit.

The full clean combined check subsequently reaches its final unchanged duplication gate and reports five groups/39 lines. MOD-DUPES-AUTH, MOD-DUPES-STORIES, MOD-DUPES-SCRIPT, MOD-DUPES-PAINT and MOD-DUPES-GENERATED each own one group with explicit preserved behavior and verification. Their acceptance is tracked separately; their links and states are in TASKS.md. No broad baseline/threshold exception is introduced, and full native/design/functionality parity remains open.

## Executed criterion: shared native callback schema

MOD-DUPES-AUTH moves the identical native callback validation to the existing shared sign-in domain in `cf9d319cf`, retaining both callback bodies and provider-specific redirect checks. Both owner selections execute 39 tests/93 assertions across nine files; types, architecture, clean bundle and bounded review pass. The unchanged duplicate check now reports four other groups/31 lines. Live OAuth and the whole modularity/full-parity goals remain unaccepted; MOD-DUPES-STORIES is the next bounded owner task.

## Connection fixture ownership follow-up

MOD-DUPES-STORIES uses one owning builder for the unreachable Codex state, retaining distinct long/null diagnostics and fresh nested state per call. Original and extracted captures for all 25 stories match exactly; the story file is 299 nonblank lines and its fixture owner is 112. The canonical all-story sweep remains intact. The actual family walk reveals four pre-existing dark sign-in contrast failures, reproduced by the original story source; the separate A11Y-SIGNIN-CONTRAST repair preserves geometry and actions through local theme styling. Final play/axe execution passes all 25 states in both themes and all 18 translated grids. [Executed scope and limits](NATIVE-TEST-TYPE-CONTROL.md#connection-fixture-and-contrast-follow-up) retain the failed baseline and distinguish UI evidence from real OAuth and Pen parity. The unchanged scoped duplicate gate now reports three other groups/20 lines; no checker exemption is introduced.

## Script runtime ownership follow-up

Candidate `56ce0e655` and its typed-callback follow-up `bc6d56c3b` separate Script materialization from scheduling/source-watch orchestration, sharing graph/node/size capture while retaining distinct normal/empty guards. The coordinator falls from 506 raw lines to 294 nonblank lines; the largest extracted module is 203. Newly extracted functions are at most 50 lines, while the existing coordinator factory still contains nested lifecycle functions. This bounded extraction does not establish whole-app function-size acceptance. Source/general/native types, architecture, lint, 24 owner cases and 34 Chromium/WebKit workflows pass. Placeholder IO payloads remain byte-identical in seven original/current requests; strict existing visual baselines remain unchanged. The clean normal/native builds and one fresh native save/reopen/source-watch/refusal case also pass. The unchanged duplicate gate now reports two other groups/15 lines. [Executed scope and remaining qualification](SCRIPT-PARITY.md#runtime-ownership-continuation--2026-11-10) distinguish these checks from full Script/Pen acceptance.

## PEN paint projection follow-up

`56d3e4c85` shares inverse point/handle projection through canonical MeshPoint-derived keys and moves the unchanged private gradient reader concern into its own owner. The reader falls from 349 to 295 nonblank lines, with no public export, validation or binding change. Three codec/reopen controls retain exact bytes; focused 23-case controls pass against original and candidate sources. The shared/clean package selections pass 322/319 cases, and clean bundle, types, typed lint and browser controls pass. [Qualification and remaining pixel/native limits](MESH-PARITY.md#pen-point-projection-ownership--2026-11-10) distinguish this extraction from full Mesh acceptance. The paint clone is absent, but one known eight-line generated-output clone remains even though the whole-repo percentage rounds to zero and the unchanged CLI exits zero. Strict-count hardening has its own task; no all-green combined-check or whole-app modularity acceptance is inferred.

## Generated-output traversal and strict clone policy

MOD-DUPES-GENERATED shares the private visible subtree owner in `865f693c3`, retaining
Script/GLSL readiness checks, subtree pruning, cycle protection and consumer mutation
timing. Original/current expanded owner controls both pass 1,373 cases/10,475 assertions;
the clean checkout repeats them. Normal build, types, architecture and six Chromium
export workflows pass. The unchanged scanner reports literal zero clones.
[Executed scope and limits](GENERATED-OUTPUT-OWNERSHIP.md) keep native/reference and
full modularity acceptance separate.

VERIFY-DUPES-ZERO adds only the existing CLI's `--exitCode 1` policy in `4bfdeae7c`.
The actual full-root command rejects the controlled original one-clone/zero-percent
corpus and accepts the restored zero-clone candidate. Its complete clean combined check at that commit exits zero and reports literal zero
clones; historical false-green and five-group failures stay retained. Full-unit fixture
materialization and native/reference acceptance remain separate controls.

## Browser control candidate — 2026-11-11

BROWSER-CLIP splits the 658-line BrowserPreviewControl into toolbar, landing, surface,
height, viewport, history and feedback owners while preserving the existing native bridge,
cleanup order and page/workspace ownership. The parent is 300 nonblank code lines; all 23
browser source modules meet 300-code/50-function-line, complexity-10, four-parameter and
depth-four gates. `previewDockViewport` now takes named options and isolates fixed-device
fitting without changing the projection math. Root controller state remains per instance.

This is a measured candidate disposition, not closure of every app module or native gesture.
See [browser evidence and remaining acceptance](BROWSER-FIXED-BACKDROP.md#height-control-candidate--2026-11-11).

The candidate is published privately as `bb399a9b4`. MOD-10 moves to Verify, retaining its
STAB-GPU dependency and native/reference limits. The original-flow follow-up passes 29 cases
and fails three; all three also occur on the rebuilt pre-refactor source. This does not
close native lifecycle reliability or accept a normal-app installation.

## AssetsPanel publication — 2026-11-11

Private source `c37b11ba2603f77a6358d96da8bad9c2c162ff4b` publishes the qualified extraction and fixture repair. All 12 frozen source/fixture hashes match the committed tree; all 12 original/candidate image pairs are re-read and pixel-exact. The existing serial browser, owner-unit, strict-size, full static and isolated native receipts remain bound to those unchanged bytes. Runtime suites are not repeated during this source-only publication.

MOD-09 and TEST-ASSETS-WORKSPACE meet their bounded refactor/fixture criteria and move Executed. Actual Pen Components, trusted OS input and broader native/unit/parity gates remain separate. All 17 protected file hashes/modes remain intact; the repository stays private, PR draft and Actions disabled. The normal installation is unchanged. Private receipt: `local-evidence/assets-modularization-2026-11-11/publication.json`.

## Recovery and source owners — 2026-11-11

MOD-RECOVERY-LIFECYCLE is accepted and privately published at b0ad9f66a. Its five changed modules satisfy the strict size/complexity contract, with 56 focused cases, ten browser journeys, independent review and the complete static gate. MOD-DOCUMENT-SOURCE is accepted: eight modules replace the oversized source/save factory; 153 focused cases and ten browser journeys pass. Its complete static gate passes, including zero duplicate-code clones; source f0f5411f6 publishes the qualified extraction. MOD-TAB-OPEN-RECOVERY is accepted at 5886a5766: six focused modules pass strict limits and 163 owner cases/421 assertions; the expanded browser run passes eleven cases and retains three storage failures also reproduced with the original tab facade. The exact existing-file control remains red. Two bounded M12 cards own storage navigation/current Save To acceptance; the complete static gate passes with zero duplicate-code clones. Source 5886a5766 publishes that qualified tab extraction.

The exact existing-file control remains red after the recovery extraction: edits are dirty, original file bytes remain intact, and recovery count is zero. These structural cards do not accept FILE-RECOVERY-LOCAL, FILE-07, native delivery or full parity. See [ownership and retained failures](RECOVERY-OWNERS.md).

## Scripting API owner candidate — 2026-11-12

MOD-15 is bounded Executed at `f6edb506f`. The original public FigmaAPI entry measures606physical/488code lines. The candidate moves node creation, structural operations and per-instance page/selection/proxy/view state into three cohesive owners, while public prototype methods, overloads, explicit exports and host callbacks stay at the entry. Existing font-axis ownership moves to the font domain; its previously complex style expression is extracted unchanged into a private resolver. Window dimensions remain late-bound at the existing guarded platform boundary. No mixin/inheritance hierarchy, wildcard public exports or per-instance replacement of prototype methods is introduced.

All five runtime owners and two acceptance files pass strict300/50/10/4/4; public prototype/own-field descriptors and explicit type-export sets compare exactly. Before and after owner suites each pass980cases/3770assertions across129files, retaining12pre-existing heavy CLI skips. A separate small actual CLI control creates a page/group, checks proxy identity/selection/viewport, writes a disposable FIG and reopens it in a second process; the after-build repetition produces identical summaries, including separate-process reopening.

The new real browser automation-handler control passes in both Chromium and named WebKit before and after: create/group rectangles, Undo/Redo, Save As, close the saved tab, reopen downloaded bytes under their original name, then Duplicate/Undo. Both requested640×400CSS-region captures produce1280×800PNG files and compare with zero differing channels against their same-project originals. The first fixture passed an extensionless temporary UUID filename and correctly triggered refusal; its second revision omitted selecting the new tab's Layers panel. Both failed receipts remain retained; the final fixture uses actual public file/sidebar actions and preserves error checking.

Source/test types, architecture and independent source review pass. The complete static gate exits0with zero clones; rebuilt CLI create/save/reopen results match their baseline. The full canonical unit run exits1:10,155passes,one skip and one strict Note raster failure. A paired original API source control also fails at12,792channels; imported/reopened PEN serialization,920×500PNG and decoded RGBA hashes match the candidate exactly. All seven candidate hashes are restored after the control. This accepts no Note raster or whole-suite success. Selected9-file working/index/Git hashes match private branch/draft PRf6edb506f; Actions remain disabled and normal/protected work unchanged. The browser control uses the live app command handler/host factory through the existing test hook, so it does not establish MCP wire/auth, native trusted input, live Figma or Pen parity. Private receipts: `local-evidence/claude-brand-review-2026-11-11/figma-api-*`.

## Scene renderer ownership candidate — 2026-11-12

MOD-01 separates traversal, culling/transforms, masks/children, paint lifetimes,
containers, shape/effect caches, stroke geometry/painting and text dispatch into
existing canvas domains. Twelve runtime modules meet strict 300/50/10/4/4 limits;
the public renderer entry and method adapters remain byte-identical. All 334 focused
owner cases pass, and 20 recorded-reference renders plus 12 browser outputs match
before/after exactly. Original canvas snapshot and strict Note failures remain red;
preservation does not accept reference pixels. [Scope and controls](SCENE-OWNERSHIP.md)
retain the complete unit result (10,155 passes, one skip, the existing Note failure),
the passing 19-case recovery cohort and native acceptance blocked by the locked Mac. No normal installation or unrelated icon work changes.

## CLI export ownership — 2026-11-13

CLI-04-PNG separates the existing 411-line command into 230 physical lines of
orchestration, 175 lines of argument metadata/ordered validation and a 10-line
format-registry owner. All touched runtime/test files pass strict300/50/10/4/4.
The extraction preserves argument metadata, validation ordering, file/document/page/
node targets and output names; primary-write and malformed-response repairs remain
explicit behavior changes. [CLI export qualification](CLI-PNG-EXPORT.md) retains
original failures, independent review and built-entry qualification; standalone
installation, actual reference and pixel gates remain open.
This is a bounded CLI slice; it accepts no whole-package or whole-app modularity.

## Raster export ownership — 2026-11-13

The JPEG candidate separates `packages/core/src/io/formats/raster/render.ts`
selection/bounds/transforms from `surface.ts` GPU/software allocation and
supersampling, and `encode.ts` alpha trimming/matte/encoding/fallback. Existing public
positional APIs and callable metadata remain compatible. The shared encoding
boundary owns the CanvasKit zero-quality workaround for both IO and direct callers.
Strict 300/50/10/4/4 checks pass for all changed code; this bounded disposition does
not establish whole-application modularity or Pen visual parity.

## Document export ownership — 2026-11-13

The WebP candidate separates the 171-line document export factory into bindings
and context, format rendering, file delivery, and batch-request owners. The bounded
`webp/` domain keeps codec loading and binary validation apart, so a Vite asset URL
does not enter Bun's unit-test boundary. The shared Core encoding helper avoids a
second CanvasKit quality workaround. New owners satisfy 300/50/10/4/4; old direct
API, cancellation, selection, ZIP-order and delivery-gated telemetry contracts are
retained under owner/browser execution and independent review. This is a bounded
modularity disposition, not an application-wide acceptance claim.
