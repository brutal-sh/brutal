# Browser preview and capture

The native editor has an embedded browser dock on the right. Its toolbar opens an HTTP(S) address, goes back or forward, reloads, chooses Desktop or Phone width, captures the visible page into the selected design, and closes the dock. Desktop uses the available dock width; Phone caps it at 390 CSS pixels and centers it. Both use the available dock height. The reported dimensions are the actual viewport, not a claimed hardware emulation.

On macOS, capture uses the live `WKWebView` snapshot API, encodes PNG, and inserts through the existing image-placement action. Undo removes the inserted layer. A delayed capture cannot insert after its chosen document/page changes. Capture is raster output; editable DOM import remains a separate task. Other native platforms report capture as unavailable.

## Isolation and lifecycle

The `browser-preview` child webview is attached to the main window. It uses incognito storage and permits only HTTP(S) navigation. Editor origins, local files, embedded URL credentials, popups, downloads and permission requests are denied. Every application command rejects the preview label. The main capability names `webviews: ["main"]`, rather than granting every child of the main window; no remote capability is configured.

The app validates native surface bounds against the main content rectangle. ResizeObserver updates the surface as its Vue dock changes. Open editor overlays hide the native surface so it cannot cover HTML dialogs/menus; closing/unmounting destroys it. Native changes are serialized across document workspaces so a late close cannot destroy the next document's preview. Main-window lifecycle, launch focusing and developer tools use APIs that remain valid with multiple webviews.

Child webviews require Tauri's `unstable` feature. The dependency is pinned to the tested 2.12.1 API. Capture uses pinned Objective-C bindings already present in Tauri's dependency graph; no capture service or credential transport is added.

Native test runs have a separate bundle identifier, incognito storage and process-memory credentials. The runner allocates a temporary directory and ephemeral MCP port. A test-only command validates the route; it is applied before MCP probing/spawning, and a missing route fails instead of falling back to production paths. Test capabilities permit only the run's discovery file. Native-test builds preserve the explicitly supplied executable PATH; production still restores the GUI login-shell path.

## Verification

The previous separate-window implementation passed two native end-to-end tests for navigation, responsive viewport pixels, capture insertion, undo, and remote IPC denial. Those results do not establish the newer embedded presentation.

For the embedded implementation, four compiled Rust policy tests and eleven focused Bun tests passed. The Bun coverage includes dock bounds, editor-only capability targeting, delayed capture guards and closing a pending preview before a new document opens. Vue and native-test TypeScript checking passed, and focused lint had no errors. Embedded native runtime acceptance is being executed separately; do not treat compilation as that evidence.

The embedded native test uses a local HTTP fixture. It runs one bounded WebDriver async script while the child exists, because the current test driver's standalone-window lookup otherwise loses its main executor. The script exercises the actual Vue controls and native snapshot, then closes the child before returning. No driver capability or production evaluation bridge is added for the test.

Local logs use the `.git/open-pen-browser-embedded-*` prefix. They are local evidence, not versioned artifacts.

## Next slice: editable DOM import

Reuse the existing DOM/CSS-to-design conversion rather than adding another renderer:

1. Add a fixed, bounded native extraction script for the currently previewed page. Collect rendered element/text hierarchy, computed style, geometry and resolved asset addresses; exclude script bodies and event-handler attributes. Do not accept arbitrary JavaScript from the UI.
2. Validate the returned payload at the app boundary, then adapt it to `DesignDocument` and the existing `designDocumentToSceneGraph` / `sceneGraphFromStyledHTML` conversion. The current HTML helper evaluates supplied HTML in its own sandbox; it does not itself extract an arbitrary live page.
3. Present import diagnostics and insert into the chosen document as an undoable group/frame. Reuse image/font loading and insertion machinery; preserve the current document on extraction or conversion failure.
4. Test a controlled responsive page with text, flex layout, images and a cross-origin frame. Assert editable layers/text, unsupported-content diagnostics, assets, undo and save/reopen. A screenshot is not evidence for this path.

Cross-origin iframe interiors, canvas/WebGL/video contents, shadow trees and website-specific behavior need explicit compatibility handling and diagnostics.
