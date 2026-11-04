- Export editable `.pen` 2.21 documents for supported shapes, text, paths, frames, stack layouts, gradients, embedded images, themes and linked instances, with actionable errors for content the writer cannot preserve.
- Scale selected layers and their contents proportionally with the Scale tool (`K`), including text, strokes, effects, layout spacing and bound values, with one-step Undo and Escape cancellation.
- Open the native browser from the selected layer’s Code section and import supported rendered pages as editable frames, text and image layers with undo, validated fixed geometry, bounded extraction, browser-owned keyboard input, and actionable refusals for content that cannot yet be preserved.
- Installs a verified standalone local canvas bridge so the native app can use an existing Codex CLI login without reading the development checkout at launch.
- Adds Linear Burn and Linear Dodge to paint/effect blend menus and preserves them through supported `.pen` and FIG round trips.
- Adds a screen-color sampler control with browser capability detection and a native macOS bridge.
- Adds Mesh fill and stroke editing with grid and vertex colors, canvas point and curve handles, Undo, and supported editable format persistence.

- Export selected layers directly as PNG, JPEG, WEBP or a PDF with one layer per page, including Mesh PDF pages and a native lossless WEBP fallback.
- Load local or HTTP GLSL fill and stroke sources, edit annotated numeric, vector and color uniforms, animate time uniforms in the editor, and retain source snapshots through supported editable formats. Reuse sources already referenced in a document, choose a local file or reveal it in the native file manager. Explicit reload keeps uniform edits; native file watching follows source changes and atomic replacement without adding document edits. Invalid sources display a recoverable diagnostic paint in the canvas and exported PNGs. Clearing a source draws its checkerboard placeholder and remains Undoable.

- Add absolute shader-uniform range bars with live paint previews, direct numeric editing, gesture cancellation and a single Undo step.

- Add persistent Small, Medium and Large agent transcript text sizes through View and chat settings.
- Adds snapshot ZIP export for supported editable designs with relocated image, GLSL and JavaScript dependencies, dependency preview and cancellation-safe delivery.
- Open native File guides for design-to-code and Figma import, check the local MCP server, and reach Open Pen’s CLI setup documentation.
- Add the macOS Window menu, document-only tab navigation and reordering, and numbered desktop document shortcuts while preserving Shift zoom.
- Add Help links for Open Pen documentation, prompt examples, editor setup and support.

- Add independently implemented Script primitives with isolated synchronous QuickJS workers, bounded CPU and memory, deterministic random, typed scalar inputs, local source watches, authored `.pen` round trips and editable-layer conversion with Undo. Show recoverable missing-source and runtime diagnostics on canvas and in exports, with authored source locations and excerpts when available. Refuse stale/unrendered exports and snapshots with missing JavaScript sources. Support component references, variable/theme inputs and eleven bundled MIT Script Gallery examples with editable inputs; retain explicit refusals for unsupported dependencies.
- Per-layer Context retains text through save/reopen and returns to its first line when editing ends.

- Expand the browser over the canvas, restore split view and retain page history across mode changes; remember the chosen mode, loaded page and viewport when reopening the dock. Enter web or localhost addresses inline, cycle Desktop/Phone/Tablet viewports, close a page back to the web-import landing screen and revisit or remove up to 50 saved recent pages. Inspect individual page elements, import their editable subtrees and capture selected elements, visible areas or full pages as logical-size image slices in one reversible canvas insertion.
- Keep the current browser viewport visible beneath its screenshot, history and canvas Zoom menus, refreshing changed page pixels when an editor menu reopens.
- Add browser zoom and More controls, fit fixed Phone and Tablet page dimensions to the dock, and confirm clearing the current site’s storage and related cookies before reloading.
- Remember browser device and separate responsive zoom choices across new documents and editor reloads, disable unavailable history navigation, and show browser feedback without resizing the page.
- Place a centered white24px heart with the Primitives Icon tool, return to Move after placement, and undo or redo the whole icon; Insert Icon keeps the glyph picker, and secondary Line/Star tools remain available through toolbar customization.
- Save and reopen verified square Lucide, Feather, Phosphor and Material Symbols icons with their authored paints and supported Material weights, and refuse unsupported bindings or artwork changes.
- Open `.pen` icons with solid and gradient paint stacks, alpha and disabled or empty fills while preserving glyph stroke geometry, nested instance paint overrides and resolved descendant weights.
- Edit named icon colors and opacity through the shared Fill controls and retain solid, gradient and mesh paint stacks when saving supported icons.
- Choose icon families separately from glyphs and edit Material Symbols weights with cancellable, single-step history.
