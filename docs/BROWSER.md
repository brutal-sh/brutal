# Browser preview and capture

The native editor has an embedded browser dock on the right. Its toolbar opens an HTTP(S) address, goes back or forward, reloads, chooses Desktop or Phone width, captures the visible page into the selected design, and closes the dock. Desktop uses the available dock width; Phone caps it at 390 CSS pixels and centers it. Both use the available dock height. The reported dimensions are the actual viewport, not a claimed hardware emulation.

On macOS, capture uses the live `WKWebView` snapshot API, encodes PNG, and inserts through the existing image-placement action. Undo removes the inserted layer. A delayed capture cannot insert after its chosen document/page changes. Capture is raster output; the separate Import action now creates editable layers within the bounded contract below. Other native platforms report capture as unavailable.

## Isolation and lifecycle

The `browser-preview` child webview is attached to the main window. It uses incognito storage and permits only HTTP(S) navigation. Editor origins, local files, embedded URL credentials, popups, downloads and permission requests are denied. Every application command rejects the preview label. The main capability names `webviews: ["main"]`, rather than granting every child of the main window; no remote capability is configured.

The app validates native surface bounds against the main content rectangle. ResizeObserver updates the surface as its Vue dock changes. Open editor overlays hide the native surface so it cannot cover HTML dialogs/menus; closing/unmounting destroys it. Native changes are serialized across document workspaces so a late close cannot destroy the next document's preview. Main-window lifecycle, launch focusing and developer tools use APIs that remain valid with multiple webviews.

Child webviews require Tauri's `unstable` feature. The dependency is pinned to the tested 2.12.1 API. Capture uses pinned Objective-C bindings already present in Tauri's dependency graph; no capture service or credential transport is added.

Native test runs have a separate bundle identifier, incognito storage and process-memory credentials. The runner allocates a temporary directory and ephemeral MCP port. A test-only command validates the route; it is applied before MCP probing/spawning, and a missing route fails instead of falling back to production paths. Test capabilities permit only the run's discovery file. Native-test builds preserve the explicitly supplied executable PATH; production still restores the GUI login-shell path.

## Verification

For the embedded implementation, four compiled Rust policy tests and eleven focused Bun tests passed. The Bun coverage includes dock bounds, editor-only capability targeting, delayed capture guards and closing a pending preview before a new document opens. Vue and native-test TypeScript checking passed, and focused lint had no errors. Two embedded native end-to-end tests then passed in 2.2 seconds (three seconds for the spec). The controlled fixture verified:

- The preview belongs to the main window, with native position and size matching the right dock: `x=967`, `y=176`, `303×559` logical pixels in this test window.
- The ResizeObserver changed its width to 280 and back to 303; Phone remained bounded by the actual available dock width.
- Back, forward and reload operated on the fixture's real history. Native snapshot decoded to `606×1118` pixels at the test display's scale, with expected center RGBA `[34,170,85,255]`.
- The capture control inserted a layer with the matching dimensions and a stored 20,284-byte PNG; the editor's actual Meta-Z shortcut removed it.
- Remote application-status, OS-platform and filesystem-existence invocations were rejected. Privileged URLs and bounds outside the editor were also rejected. Closing the dock removed the child.

The first embedded run exposed a test race: URL changes can precede document commit, so navigating again immediately can replace the first load without creating history. The fixture now waits for the first page's script to execute before navigating. The final run had no async-script timeout or retry. Native overlay hide/show calls were exercised, but visual occlusion under every dialog/menu has not been qualified. These tests do not establish screenshot-level parity with Pen.app.

The embedded native test uses a local HTTP fixture. It runs one bounded WebDriver async script while the child exists, because the current test driver's standalone-window lookup otherwise loses its main executor. The script exercises the actual Vue controls and native snapshot, then closes the child before returning. No driver capability or production evaluation bridge is added for the test.

Local logs use the `.git/open-pen-browser-embedded-*` prefix; the final runtime evidence is `.git/open-pen-browser-embedded-e2e-final.log`. They are local evidence, not versioned artifacts.

## Editable DOM import — executed 2026-10-30

The Import action extracts the current viewport through a fixed native script, validates its bounded payload, and builds editable frames, text and readable image assets. Extraction excludes scripts, handlers and form values. The native callback is bound to its URL, generation, nonce, timeout and payload limits. Images are read inside the page under browser origin/CORS rules; there is no privileged host fetch.

Conversion preflights assets, fonts, target page and read-only state before a synchronous insertion. A closed dock or changed document cannot receive a late import. The action inserts one undoable tree. Same-origin/CORS-readable images are stored in the document; unavailable assets and unsupported content produce explicit diagnostics without changing it.

Executed:18 unit tests/72 assertions, Vue/native type checks and scoped lint passed. A native run passed three checks covering10 editable descendants, a4,155-byte image, refusal without mutation, text editing, Undo/Redo, and real `.fig` disk save/reopen. A second native run passed after correcting text-width conversion: source and imported text wrapping were visually inspected, and edited text/image assets survived save/reopen. Local evidence: `native-browser-import-source.png`, `native-browser-import-layers.png`, and browser-import logs in ignored `local-evidence/`.

This is a bounded importer, not full browser import parity. Gradients/background images, SVG, canvas/video, iframe interiors, shadow/custom elements, pseudo content and special paints/clipping remain unsupported. Responsive constraints become measured fixed geometry. Only macOS has been exercised. A whole-window screenshot with the browser child open remains outstanding because the test driver loses its ordinary window route while that child exists.
