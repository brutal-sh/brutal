# Pen feature inventory

Research date: 2026-10-29. Decision owner: Jason. Target: an independently implemented local design editor. This is a parity backlog, not a claim that Open Pen implements these features.

## Evidence boundary

**Reported** below means described by the vendor's public documentation, inspected on the research date. These pages describe current pen.dev behavior; they do not prove every feature exists or behaves identically in installed Pen 1.2.21. **Proposed** means an Open Pen implementation decision. No proprietary source, assets, or licensing logic was used for this inventory.

## Parity categories

| Category | Reported capabilities | Official reference |
| --- | --- | --- |
| Canvas and selection | Pan/zoom, fit view, nested selection, multi-selection, grouping, frames, clipping, alignment, undo/redo | [Interface](https://docs.pencil.dev/core-concepts/pencil-interface) |
| Layers and properties | Hierarchical layer list, rename/reorder/reparent, visibility, geometry and appearance inspectors, snapping and configurable nudges | [Interface](https://docs.pencil.dev/core-concepts/pencil-interface) |
| Layout | Horizontal/vertical flex, gap/padding/alignment, fixed/hug/fill sizing, absolute-position children | [Interface](https://docs.pencil.dev/core-concepts/pencil-interface) |
| Vector drawing | Rectangles, ellipses, polygons, paths, point and curve editing, proportional scaling, corner radii | [Drawing](https://docs.pencil.dev/core-concepts/drawing-and-editing) |
| Text | Editable text, font/weight/size/spacing/alignment, wrapping modes, imported document fonts | [Drawing](https://docs.pencil.dev/core-concepts/drawing-and-editing) |
| Graphics | Multiple fills, gradients including mesh, image fills, blending, strokes, shadows, blurs, shader fills/effects | [Drawing](https://docs.pencil.dev/core-concepts/drawing-and-editing) |
| Components | Reusable origins, nested instances, property overrides, source navigation, detach | [Components](https://docs.pencil.dev/core-concepts/components) |
| Slots | Instance-specific inserted content; optional component suggestions | [Slots](https://docs.pencil.dev/core-concepts/slots) |
| Variables/themes | Color, number, string, boolean tokens; aliases; theme axes; inherited theme choices | [Variables](https://docs.pencil.dev/core-concepts/variables) |
| Libraries | Imported component/token libraries, `.lib.pen` files, instance overrides, conflict handling during cross-document paste | [Libraries](https://docs.pencil.dev/core-concepts/design-libraries) |
| File interchange | Figma file/layer import, PNG/JPEG image import, editable SVG import; raster/PDF and HTML+CSS/Tailwind export | [Import/export](https://docs.pencil.dev/core-concepts/import-and-export) |
| Browser workflow | Desktop browser preview, device sizing, editable page/element import, screenshots; imported layers omit page interactions | [Import/export](https://docs.pencil.dev/core-concepts/import-and-export) |
| AI editing | Model/session selection, selection context, attachments, skills, permission prompts, usage estimates, parallel agents, iterative variants | [Agents](https://docs.pencil.dev/core-concepts/ai-agents) |
| External automation | Local MCP bridge with document state, execution, styles and skill tools; browser/spawn tools depend on host/configuration | [AI integration](https://docs.pencil.dev/getting-started/ai-integration) |
| CLI | Headless editor, agent requests, tool shell, document saving and image/PDF export | [CLI](https://docs.pencil.dev/for-developers/pen-cli) |
| Code/design exchange | Agent-assisted design-to-code and code-to-design, CSS token exchange | [Design/code](https://docs.pencil.dev/design-and-code/design-to-code) |
| Procedural content | Script nodes with parameters, watched local files, generated children and conversion to editable layers; sandboxed execution | [Code on Canvas](https://docs.pencil.dev/core-concepts/code-on-canvas) |
| Presentations | Ordered top-level frames as slides, presenter navigation, ordered PDF export | [Presentations](https://docs.pencil.dev/core-concepts/presentations) |
| Sharing | Uploaded document/dependency snapshots, browser viewing/download, snapshot updates, link revocation | [Sharing](https://docs.pencil.dev/core-concepts/sharing) |
| Hosted image operations | Background removal and vectorization require network/sign-in according to the docs | [Drawing](https://docs.pencil.dev/core-concepts/drawing-and-editing) |

## First vertical slice — proposed

**Outcome:** Jason can create a simple composition, edit it, save it locally, and recover the same composition after reopening without an account or subscription.

1. Add rectangle, ellipse and text; select, move, resize, rename, recolor, duplicate and delete.
2. Inspect numeric geometry; use layers and undo/redo; pan and zoom.
3. Save a versioned Open Pen document; open it after a reload; reject malformed input without replacing the current design; export a visual artifact.

**Done evidence:** execute this entire journey in the browser, compare saved/reopened node data, inspect the exported result, and exercise invalid-file recovery. A build or unit test alone does not prove this journey. This slice is intentionally smaller than full parity.

## Dependency order — proposed

- **Now:** document integrity and core editor journey above.
- **Next:** frame hierarchy/flex layout, richer text/vector editing, then components, variables and libraries. Add `.pen` interoperability only with declared support and regression fixtures.
- **Later:** optional provider-backed AI and MCP, native packaging, imports/browser capture, scripts/shaders, presentation and sharing. Hosted services need independent implementations and explicit cost choices.

## Open acceptance gaps

- Installed-build behavior and UI have not been exercised by this research pass; parent investigation owns REA/Hopper evidence.
- Rendering fidelity, font metrics, history semantics, large-document performance, accessibility and file round-trip fidelity need executable fixtures.
- Current subscription terms, exact plan limits, cloud APIs and service entitlements were not established. No assumption of free third-party inference, hosting, background removal or vectorization.
- Every category needs its own acceptance test before “full parity” can be asserted. The inventory is bounded by the linked public pages and is not exhaustive proof of all shipped behavior.
