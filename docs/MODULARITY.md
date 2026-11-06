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
| 51–200 | 1,358 |
| 201–300 | 204 |
| 301–600 | 158 |
| Above 600 | 15 |

Total: 2,922. Median: 64.5. At most 300 lines: 2,749 (94%).

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
| `src/app/automation/mcp/spawn.ts` | 703 | Separate process startup/status responsibilities; preserve transport and redaction. |
| `packages/vue/src/i18n/messages/panels.ts` | 694 | Review catalog domain ownership; a declaration/catalog exception needs a reason. |
| `src/components/assets-panel/AssetsPanel.vue` | 669 | Separate asset browsing, selection and operations by responsibility. |
| `src/components/browser-preview/BrowserPreviewControl.vue` | 658 | Separate browser toolbar/menu workflows while preserving native dock geometry. |
| `packages/core/src/io/formats.ts` | 650 | Extract format-owned loading/export helpers; preserve registry contracts. |
| `packages/vue/src/canvas/useCanvasInput.ts` | 632 | Separate input domains; retain focus, modifiers and cancellation. |
| `src/app/shell/menu/schema.ts` | 621 | Review menu domains while retaining shared IDs/order/native parity. |
| `packages/core/src/layout.ts` | 619 | Separate layout coordination domains; retain authored geometry. |
| `packages/core/src/figma-api/index.ts` | 606 | Review facade versus domain implementation; retain public API. |

Every row receives its own review/refactor task. No row is marked resolved by this audit.
Do not remove attribution, change serialized formats or introduce forwarding-only public
exports to reduce a count. Declaration/catalog exceptions must identify an owner and reason.

For each refactor, read callers and the owning guide, extract one cohesive responsibility,
run the relevant behavioral tests, and compare affected browser/native output. Required
checks include public exports and architecture; renderer changes retain canvas evidence.
Update this audit after the corresponding task is executed, not after moving text alone.
