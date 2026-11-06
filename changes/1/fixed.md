- Opening `.pen` files reports known unsupported content with node paths before replacing a document, rather than silently dropping it.
- Browser builds avoid probing an unavailable local MCP server during startup.
- macOS builds find the SF Symbols library when Command Line Tools uses the Swift Build output layout.
- Dispose canvas resources in their owning graphics context when replacing a surface or closing a document.

- Keep nested color pickers open when Tab follows a format-menu selection, including while deferred cleanup timers are delayed.

- Composite transparent JPEG artwork over white while retaining transparency in PNG exports.
- Preserve independent shader paints through duplication, resizing, component updates and supported FIG/clipboard transfers, including image resources used by strokes and vector paths.
- Release numeric-field keyboard focus when an edited control is replaced so document shortcuts remain available.
- Reload watched local files when native filesystem events use an equivalent parent-folder alias, including atomic saves.
- Omit an empty dialog description slot so dialogs without a description do not reserve a blank description row.
- Show the resolved local MCP endpoint after server startup.

- Route native Edit → Delete to focused inspector text or canvas text selection, preserving the layer and separating the menu edit from preceding typing for Undo.
- Canvas text Undo and Redo work while typing, including pending changes on an existing layer with empty document history; Escape exits text editing after using a menu.
- Gap and padding fields preserve fractional values when displaying and editing layout, including paired and individual padding.
- Width, Height and selection-size badges show fractional dimensions to two decimals while preserving the full saved and variable values.
- Position fields retain fractional coordinates, compare mixed selections before formatting, and normalize typed turns without clamping them to one revolution.
- Numeric fields read signed values as absolute numbers and use numeric prefixes to match Pen input behavior.
- Text ending in a newline reserves its final empty line when sizing the layer and its containing layout.
- Zoom buttons and menu actions keep the canvas center stationary when side panels offset the canvas.
- Desktop tool flyouts focus the selected tool when opened and use the measured spacing, checks and corners; Primitives import labels follow the reference menu.
- Fractional edges retain their canvas coverage in raster exports, with software fallback for oversized images.
- Reload a browser page while its first response is pending without leaving navigation stuck, and discard frame errors from dismissed or replaced editor menus.

- Keep command-copy buttons readable against their field background in both themes.
- Keep translated toast messages readable when recovery actions need another row.
