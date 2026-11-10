# Open Pen native-test driver patch

This is the MIT-licensed `tauri-plugin-wdio-webdriver` 1.3.0 crate, retained for
Open Pen's optional `native-test` feature. It is not enabled in production.
Original crate SHA-256: `7ad665bda48567107b6a3d070fe6d58a98e21f3ebf52abe41308fa4d5919f61b`.
The original LICENSE and upstream source metadata are preserved.

The patch resolves each physical window and its same-label primary Webview
independently, rather than using Tauri's single-webview window classification.
Child preview webviews are excluded from top-level handles. Handle enumeration,
executor creation, switching and close share the same ownership predicate.
Executors use Webview for page operations and Window for geometry and alerts.
Tauri's existing unstable API feature is explicit; no wrapper cache is added.

All other Rust source files match the published crate. The change is confined
to nine Rust files and the Tauri feature declaration. Original/candidate controls
and remaining platform limits are recorded in docs/NATIVE-DRIVER-MULTIWEBVIEW.md
at the Open Pen repository root. Global Cargo/npm installations are unchanged.
