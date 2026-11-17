- Opening `.pen` files reports known unsupported content, including custom font file declarations, with field and node paths before replacing a document.
- A failed recovery-copy discard shows a persistent error and keeps the recovery controls available for retry.
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
- Shared numeric inspector fields, color channels, paint opacity, gradient-stop percentages and image tile scale evaluate arithmetic and signed values while retaining committed values after invalid input and original precision after cancellation.
- Text ending in a newline reserves its final empty line when sizing the layer and its containing layout.
- Zoom buttons and menu actions keep the canvas center stationary when side panels offset the canvas.
- Desktop tool flyouts focus the selected tool when opened and use the measured spacing, checks and corners; Primitives import labels follow the reference menu.
- Fractional edges retain their canvas coverage in raster exports, with software fallback for oversized images.
- Reload a browser page while its first response is pending without leaving navigation stuck, and discard frame errors from dismissed or replaced editor menus.

- Keep command-copy buttons readable against their field background in both themes.
- Warning toasts use an opaque surface over drawings, and translated messages remain readable when recovery actions need another row.

- Reuse canvas contexts across document switches without retaining retired document renderers, and cancel initialization when its view closes.
- Desktop setup links open this Open Pen fork’s build instructions with translated setup labels.
- Failed recovery uses translated document-recovery feedback while retaining parser details in the local diagnostic warning.
- ACP connection failures retain structured agent messages and textual error details, and stop the starting agent when its tool-connection check fails.
- Open supported designs saved by Pen 1.2.22 while retaining explicit errors for unsupported content.
- Imported .pen text uses prepared paragraph metrics so supported fonts retain their bounds after saving and reopening.
- Saved .pen text retains its font weight when opened in Pen.
- Export multiple selected objects as separate SVG files in one ZIP, and offer SVG in the desktop File export menu.
- Keep sign-in Cancel and Change actions readable on their status background in both themes.
- Use Open Pen names in the workspace menu, assistant, microphone permission prompt and recovery-code download, and neutral Cloud labels in service controls.
- Keep the browser panel background around fixed-device previews consistent with its toolbar.
- Long agent command titles truncate inside tool cards while retaining the full tooltip and inspectable command details.
- Open FIG documents from byte views without reading padding outside the supplied file data.
- Preserve unsaved browser-file edits and recovery backups when another writer changes the source, with explicit reload and save-copy decisions.
- Center the native macOS window controls within the document header.

- macOS Save As panels use format-specific titles and follow the editor appearance; permission-denied saves show file-specific guidance while preserving edits and recovery copies.
- Adding flex layout to rotated layers retains the initial measured extent, and wrapping or undoing a wrap leaves unrelated page layouts untouched.
- Diagnostics redact supported credential formats in new and retained error details while preserving technical identifiers, and advise reviewing reports before sharing.

- Save compatible `.pen` designs with the current 2.22 schema header while retaining existing legacy-line interchange output.
- Failed CLI conversion and primary export writes preserve existing output and allow retry after resolving the write failure.
- Empty or malformed encoded app-export responses are refused before replacing existing output.

- Refuse invalid CLI export quality values before replacing an output, and preserve minimum JPEG quality in shared file and document IO exports.

- Export WebP in browsers without a built-in encoder using an on-demand codec, retaining explicit quality and the default native lossless fallback.
- Export PDF files from the Node CLI with embedded local images instead of failing or silently omitting them.

- Deliver explicit tool selections to the intended editor and refuse invalid mixed selections without replacing the prior selection; refuse cancelled queued MCP selections before they apply.
- Keep the Layers tree's accessible selection state consistent with its visible selection.

- Apply explicit color-slider calculations even when their result matches the rounded display.
