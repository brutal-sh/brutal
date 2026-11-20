# Document format and compatibility

Research date: 2026-10-29. Status: public specification research; no cross-application round-trip executed.

## Public `.pen` facts — reported

The [official format reference](https://docs.pencil.dev/for-developers/the-pen-format) describes a JSON object tree and permits JSON comments. Its published document schema currently declares version **2.21**, independently of application version 1.2.21.

The root contains a version and children, with optional themes, imports and variables. Nodes have unique IDs and types. Positions are relative to parents; root nodes use canvas coordinates. Layout may control child geometry. The type set includes frames, groups, geometric shapes, paths, text, notes, prompts, context, icons, scripts, browsers and references.

Reusable nodes act as components; references can override or replace descendants. Themes and typed variables affect property values. Images, imported documents, scripts and shaders can depend on relative external paths. Graphics include multiple fills, strokes and effects. Text sizing modes change wrapping behavior.

The vendor warns that the format can change. Its editor converts supported older documents when opening and writes the converted format when saving. The public schema is a compatibility reference, not evidence that another renderer produces identical output.

## Brutal policy — proposed

- Use an explicitly versioned, independently defined native format for the first build. Do not label Brutal documents as universally compatible `.pen` files.
- Keep import separate from editing state. Validate the complete input before replacing an open document. Reject non-finite geometry, duplicate IDs, excessive document size/depth, and unsupported native versions.
- For a future `.pen` importer, define a supported-version and property matrix. Preserve originals; produce a separate converted file. Never silently drop unsupported nodes or overwrite the source.
- If partial import is offered, show a concrete unsupported-feature report before conversion. Keeping unknown JSON does not establish visual or editing fidelity.
- Treat external paths as untrusted. Importing a design must not execute scripts/shaders, open arbitrary network resources, or read unrelated local files. Those capabilities need separate boundaries and user-visible controls.
- Keep serialization deterministic where practical so Git diffs describe design changes. Undo history and selection are editor state unless deliberately specified otherwise.

## Compatibility proof required

1. Independently authored fixtures cover each supported shape, text/layout mode and property; malformed fixtures leave the current document intact.
2. Brutal save → close/reload → reopen reproduces node data and rendered geometry.
3. For declared `.pen` support: original fixture opens in the installed reference app, imports into Brutal, exports to a new path, and reopens in the reference app without error or unexplained visual changes.
4. Add nested references, overrides, variables/themes, external dependencies and unsupported-version fixtures before broadening the compatibility claim.

**Not yet established:** which public schema revision exactly matches installed Pen 1.2.21; undocumented fields; renderer defaults; font shaping; migrations; import/export equivalence. Prefer a visible compatibility error over data loss.
