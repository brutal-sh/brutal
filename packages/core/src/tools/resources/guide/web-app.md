# Build an editable web layout

Start with the user's intended screen and its current content. Inspect the target
page and selection, then use existing components, variables and assets where
available. Choose a frame matching the intended viewport and a clear hierarchy
of editable layers.

Use auto layout for rows, columns, padding and repeated content. Reserve explicit
positions for intentional overlays and artwork. Allow text and content containers
to Hug where appropriate instead of guessing their heights; use Fill only inside
a parent that supplies the corresponding available space.

The `render` tool accepts the design JSX vocabulary exposed by this installation.
It creates design layers, not a running React or browser app. Read its current
schema and authoring help before supplying JSX; imported library APIs are not
automatically globals in an interactive command.

Build and inspect one useful part first. Check long text, narrow viewports,
selection, keyboard focus and relevant error/empty states. Preserve editable text
and component relationships; a screenshot alone does not establish functionality.

Verify actual canvas and export output, then save and reopen an owned copy.
Record any missing interaction, unsupported import or reference mismatch plainly.
Do not report whole-screen or whole-product parity from a single successful tool
call, generated image or isolated test.
