- Moves the Agent to a left sidebar with separate conversation and composer surfaces, alongside Layers, Slides, Components and Libraries.
- Places desktop drawing tools in a vertical rail and keeps a 221px inspector over the canvas so selection does not shift the drawing surface; selected-layer sections use compact spacing and type, with a collapsible title bar that retains property state.
- Uses floating document and view controls with a dark canvas and hidden rulers by default.
- Suggests `.pen` for the first local Save and accepts JSON comments while preserving strict malformed-file rejection.
- Keeps document-tab keyboard focus while the browser dock spans the full editor height.
- Uses measured Pen toolbar dimensions, inset borders, menu typography and dark surfaces.
- Uses the original violet Open Pen nib across native, web, favicon, PWA and monochrome artwork.
- Names owned diagnostics, MCP messages, JSX warnings and profiler exports for Open Pen while retaining compatibility identifiers.
- Replaces the storage sidebar on Home with a centered creation composer, import actions, document tabs and larger preview cards; keeps search and storage in compact controls, exposes recovery drafts and component libraries, and sends Home prompts and images through the new document’s Agent.
- Removes a document’s recovery snapshot when Undo returns it to a clean state, while preserving unrelated drafts and edits arriving during cleanup.

- Use compact paint category and Mesh tangent glyphs with separate point labels and regular-weight actions.
- Compact inspector controls use the measured transform and radius glyphs and a direct opacity field, with layer blending in Advanced properties.
- Corner controls keep the uniform radius visible while individual fields are open, support multi-selection and preserve values and variable bindings through collapse, cancellation and Undo.
- Compact dimension edits retain Fill sizing and update its numeric fallback; multi-selection offers mixed Fill controls and keeps clipping in Appearance.
- The Code inspector copies and exports selected layers together using the same HTML export settings.
- HTML exports use the document name; desktop exports save beside a saved design unless Ask where is enabled, with a Save dialog fallback for unsaved designs.
- Embedded HTML exports can open automatically in the desktop browser, with element picking, editable import and screenshots through the existing isolated browser.
- The desktop brand popup uses native platform menu presentation, with working links, theme and UI actions and keyboard focus return; browser commands remain in the web menu.

- Converting a Script now replaces it with a new editable frame at the same sibling position, preserving Context and geometry, restoring the original Script on Undo and the same converted IDs on Redo. Fixed component-instance structure is protected; slot ownership changes share the conversion history step.

- Reusable Scripts retain linked instances with independent source and input overrides; detaching or converting the main preserves standalone instance Scripts, including Undo/Redo and uploaded-source regeneration.

- Pick Script component references from keyboard-accessible thumbnails, regenerate bounded linked output when dependencies change, and preserve links through conversion and save/reopen. Keep sandbox validation strict while accepting absent optional internal paint fields after reopen.
- Preserve the icon picker when a closing workspace menu returns focus, and omit unrelated Figma component controls from Script inspectors.

- Bind Script number/color inputs to variables, regenerate with inherited themes and aliases, preserve input variable identities through rename, interchange and instance sync, and keep independent input claims separate from geometry bindings.
- Desktop HTML exports reference original relative or absolute image paths and retain each paint's source through reordering.
- Standalone HTML uses a selected frame's first visible opaque solid fill as the page background.
- Open Folder selects the authorized HTML preview file in the native file manager, and Open in System Browser opens it in the default browser.
- Reload local HTML and its resources from the browser cache action without clearing website data or showing its confirmation.
- Keep exported HTML in browsing history, revalidate files when recalled in another document and let unavailable entries be removed without erasing web visits.
- Compact multi-selection headers use the measured count typography, overlapping-square icon and collapse control, with additional actions retained in Advanced properties.
- Edit multi-selection Hug sizing with mixed states, preserve authored sizing on freeform layers through Pen files, and keep both axes fixed after a ratio-locked numeric edit.
- Edit selected frames' alignment, gap and paired or individual padding together, with variable-aware cancellation and history; distributed canvas spacing retains the numeric gap without adding it between children. Compact alignment uses square selection and direction-aware distribution marks with matching label and row spacing.

- Wrap sibling selections with inferred flow, retained average spacing, numbered frames and matching cross-axis Fill sizing through inspector, menu and keyboard actions.
- Primitives starts keyboard focus on Rectangle while retaining the checked tool, and compact named icons place their controls below Fill without frame-only Flow, clipping or Stroke controls; Advanced retains those controls.
- Use Open Pen product labels across supported translations, setup, notifications, startup guidance, document-format labels, CLI help and export errors while preserving third-party service names.

- Software Update links to Open Pen’s change history and shows translated availability guidance with readable release-note placeholders.
- Startup support notices link to Open Pen’s system requirements and issue form with matching diagnostic platform details.
- CLI subcommand help shows the full command path instead of the local entry script path.
