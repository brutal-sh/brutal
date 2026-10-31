- Opening `.pen` files reports known unsupported content with node paths before replacing a document, rather than silently dropping it.
- Browser builds avoid probing an unavailable local MCP server during startup.
- macOS builds find the SF Symbols library when Command Line Tools uses the Swift Build output layout.

- Keep nested color pickers open when Tab follows a format-menu selection, including while deferred cleanup timers are delayed.

- Composite transparent JPEG artwork over white while retaining transparency in PNG exports.
- Preserve independent shader paints through duplication, resizing, component updates and supported FIG/clipboard transfers, including image resources used by strokes and vector paths.
- Release numeric-field keyboard focus when an edited control is replaced so document shortcuts remain available.
- Reload watched local files when native filesystem events use an equivalent parent-folder alias, including atomic saves.
- Omit an empty dialog description slot so dialogs without a description do not reserve a blank description row.
- Show the resolved local MCP endpoint after server startup.

- Route native Edit → Delete to focused inspector text or canvas text selection, preserving the layer and separating the menu edit from preceding typing for Undo.
