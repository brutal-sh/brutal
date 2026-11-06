# Runtime modularity audit

Measured 2026-11-06 from the current checkout. This is a size/ownership review, not proof that
all architecture or behavior is accepted. The implementation uses OpenPencil's existing
package boundaries; Open Pen-specific behavior is added to the owning domain.

Scope: authored `.ts`, `.vue`, `.rs` and `.css` under `src`, `packages/core/src`,
`packages/vue/src`, `packages/scene-graph/src` and `desktop/src`. Counts are physical lines.
Declarations, tests and `.stories.ts` examples are excluded; authored catalogs are included.

| Size | Files |
| --- | ---: |
| 1–50 | 1,187 |
| 51–200 | 1,359 |
| 201–300 | 204 |
| 301–600 | 159 |
| Above 600 | 14 |

Total: 2,923. Median: 65. At most 300 lines: 2,750 (94%).

The initial baseline has 2,922 files, median 64.5, and 15 above 600. MOD-07 adds one
focused owner and reduces the current oversized queue to 14. The baseline remains available
at the planning commit; counts describe the measured source scope, not accepted product parity.

There is no universal industry file-size standard. Use 50–200 lines as a useful range for
focused helpers/controls and 200–300 for a cohesive feature module, not a compulsory split.
The repository's configured review warning is 600 lines. Some inherited files have exceptions.

| File | Lines | Required review |
| --- | ---: | --- |
| `packages/core/src/canvas/scene.ts` | 1,140 | Separate cohesive scene drawing responsibilities; retain pixels and order. |
| `packages/scene-graph/src/types.ts` | 1,107 | Review declaration ownership; extract coherent type domains or document the schema exception. |
| `packages/core/src/text/fonts.ts` | 1,014 | Separate font loading/resolution responsibilities; retain font recovery and shaping. |
| `packages/scene-graph/src/graph.ts` | 848 | Review graph mutation/storage domains without weakening invariants. |
| `packages/core/src/canvas/renderer.ts` | 752 | Separate lifecycle/state responsibilities using existing renderer domains. |
| `src/app/tabs/index.ts` | 715 | Separate tab lifecycle, persistence and selection ownership. |
| `packages/vue/src/i18n/messages/panels.ts` | 694 | Review catalog domain ownership; a declaration/catalog exception needs a reason. |
| `src/components/assets-panel/AssetsPanel.vue` | 669 | Separate asset browsing, selection and operations by responsibility. |
| `src/components/browser-preview/BrowserPreviewControl.vue` | 658 | Separate browser toolbar/menu workflows while preserving native dock geometry. |
| `packages/core/src/io/formats.ts` | 650 | Extract format-owned loading/export helpers; preserve registry contracts. |
| `packages/vue/src/canvas/useCanvasInput.ts` | 632 | Separate input domains; retain focus, modifiers and cancellation. |
| `src/app/shell/menu/schema.ts` | 621 | Review menu domains while retaining shared IDs/order/native parity. |
| `packages/core/src/layout.ts` | 619 | Separate layout coordination domains; retain authored geometry. |
| `packages/core/src/figma-api/index.ts` | 606 | Review facade versus domain implementation; retain public API. |

Every original oversized file has its own review/refactor task. The remaining rows are open.
Completed dispositions are recorded separately below.
Do not remove attribution, change serialized formats or introduce forwarding-only public
exports to reduce a count. Declaration/catalog exceptions must identify an owner and reason.

For each refactor, read callers and the owning guide, extract one cohesive responsibility,
run the relevant behavioral tests, and compare affected browser/native output. Required
checks include public exports and architecture; renderer changes retain canvas evidence.
Update this audit after the corresponding task is executed, not after moving text alone.

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
