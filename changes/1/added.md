- Export editable `.pen` 2.21 documents for supported shapes, text, paths, frames, stack layouts, gradients, embedded images, themes and linked instances, with actionable errors for content the writer cannot preserve.
- Scale selected layers and their contents proportionally with the Scale tool (`K`), including text, strokes, effects, layout spacing and bound values, with one-step Undo and Escape cancellation.
- Import supported rendered browser pages as editable frames, text and image layers with undo, validated fixed geometry, bounded extraction, and actionable refusals for content that cannot yet be preserved.
- Installs a verified standalone local canvas bridge so the native app can use an existing Codex CLI login without reading the development checkout at launch.
- Adds Linear Burn and Linear Dodge to paint/effect blend menus and preserves them through supported `.pen` and FIG round trips.
- Adds a screen-color sampler control with browser capability detection and a native macOS bridge.
- Adds Mesh fill and stroke editing with grid and vertex colors, canvas point and curve handles, Undo, and supported editable format persistence.

- Export selected layers directly as PNG, JPEG, WEBP or a PDF with one layer per page, including Mesh PDF pages and a native lossless WEBP fallback.
- Load local or HTTP GLSL fill and stroke sources, edit annotated numeric, vector and color uniforms, animate time uniforms in the editor, and retain source snapshots through supported editable formats. Reuse sources already referenced in a document, choose a local file or reveal it in the native file manager. Explicit reload keeps uniform edits; native file watching follows source changes and atomic replacement without adding document edits. Invalid sources display a recoverable diagnostic paint in the canvas and exported PNGs. Clearing a source draws its checkerboard placeholder and remains Undoable.

- Add absolute shader-uniform range bars with live paint previews, direct numeric editing, gesture cancellation and a single Undo step.
