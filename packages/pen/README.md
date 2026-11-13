# @open-pencil/pen

Pencil.dev `.pen` document parser, bounded writer, and SceneGraph adapter.

This package owns the `.pen` document model and import policy. It depends on `@open-pencil/scene-graph` for the shared editable design model and does not depend on `@open-pencil/core`.

Before converting, `buildPenGraph`, `parsePenFile`, and `readPenFile` reject known content losses with `PenImportError`. Its `diagnostics` contain stable codes, JSON Pointer paths, optional node IDs, and explanations. `inspectPenCompatibility(document)` returns the same findings without building a graph; `parsePenDocument` remains schema-only for inspection.

The guard covers unsupported node types, paints and effects, blend modes, library imports, slots, non-frame components, and newer/unrecognized schema versions. It checks descendant overrides as well as ordinary children. Empty diagnostics do not establish complete fidelity: missing assets/fonts, unresolved references, unknown properties, layout details and older-version semantics still require verification.

`writePenDocument(graph)` returns a 2.21 document and `writePenFile(graph)` serializes it. The Core `pen` I/O adapter exposes writing and document/page/selection/node export; the Export panel can persist `pen` settings. The editor saves `.pen` or `.fig` according to the chosen local destination.

The writer supports a single sRGB canvas with frames, reusable frame definitions, rectangles, ellipses/arcs, polygons, plain text, groups, line nodes, and SVG paths from vector networks. Linked Script nodes retain authored source/input metadata; generated children remain derived. It preserves hierarchy, transformed placement, solid and ordinary linear/radial/angular gradient paints, embedded PNG/JPEG/GIF/WebP images with fill/fit/crop placement, uniform/per-side strokes including paint lists in object strokes, basic shadows/blur, and horizontal/vertical stack sizing, spacing, padding, and alignment. Scalar variables, aliases, independent collection theme axes, supported node bindings, and theme overrides are written as editable tokens. Linked instances retain root and nested descendant overrides; unclaimed fields continue following their components. Selection export includes its necessary ancestor context. Colors are written as hex colors at 8-bit precision; `.pen` text uses default font optical size. Editor export presets, expansion state, source provenance, caches, bookkeeping plugin data, empty single-mode collections, and page labels are not interchange content.

Unsupported content throws `PenExportError` with node IDs and property paths before any output is returned. This includes diamond/skewed elliptical gradients and unsupported mesh/shader payloads, tiled/rotated images, missing image bytes, instance structural replacements/swaps and component properties, unsupported variable metadata/expressions/bindings, multiple pages, rich text, masks, grid/wrap layouts, non-default constraints, smoothing, dashed/arrow strokes, unsupported blends/effects, content plugin data, and other non-default fields the writer cannot represent. Native collection names are made unique as theme axes; the existing reader combines axes into one collection of theme combinations, so collection identities are normalized on roundtrip. Simplify a copy or retain the `.fig` original. This is an explicit supported subset, not a lossless `.pen` implementation; reference-app visual/font equivalence and external assets remain separate acceptance work.

`isLegacyStroke(stroke)` recognizes the object form with `thickness` and `fill`, so hosts discover image/GLSL dependencies inside its paint list. A legacy `dashPattern` property is ignored as observed in Pen; exporting actual dashed graph strokes remains refused.

The reader accepts supported node shapes from schema 2.22 as well as older versions. Notes,
prompts, contexts, browser nodes and unknown node types still produce explicit compatibility
errors before import, preserving the source. The writer continues to emit schema 2.21.

Core application I/O applies its current-save header policy after this bounded writer. Compatible document and scoped exports use schema 2.22; records containing legacy `line` nodes retain their prior header until current-schema line conversion is qualified. This package’s interchange defaults and structured refusals remain unchanged.
