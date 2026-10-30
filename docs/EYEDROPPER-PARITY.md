# Screen color sampling acceptance

Target: actual Pen.app1.2.21,2026-10-30. Full native screen-sampling acceptance is OPEN.

Pen exposes the eyedropper beside the format chooser. In the inspected native session, keyboard activation reported “Eyedropper failed”; no color was sampled and the reference paint stayed #CC9933/Linear Dodge. Static observation confirms the optional browser EyeDropper API and AbortError cancellation handling; it does not explain the native failure.

Open Pen now has a compact sampler button, supported-browser detection, validated six-digit sRGB results, cancellation preservation, pending disablement and translated persistent failure feedback. A dismissed picker ignores a late result. macOS uses the existing AppKit dependency's NSColorSampler, converts to sRGB, copies finite/clamped channels during the completion and returns no image. Both native command branches require the main editor webview; other desktops use a feature-detected browser API when available. Unsupported platforms do not advertise a working sampler.

Executed: six browser workflows exercise the real editor with controlled platform responses: sample→render→one Undo, AbortError cancellation, operational failure, invalid output, late result after dismissal/new selection, and absent browser API. Rust checks, source/Vue/test types, architecture, locales and scoped lint passed. Vite/native builds and installed signature verified. Independent review found and closed unsupported-desktop availability and missing main-window guard defects. This establishes editor integration and compilation, not the operating-system pick.

Native gap: the installed button becomes pending, but pointer, Escape and Return automation did not deliver a sample. A pointer click reached the editor and dismissed the popup instead. No paint mutation or saved-file overwrite occurred. Three equivalent input attempts were stopped. A manual check was requested with the final guarded build left on native-linear-blend-acceptance.pen and its Color popup open. A real sample, real cancellation and native Save/reopen still need execution. Do not mark this feature or product parity accepted based on the browser stubs.

Reference API documentation: [Apple NSColorSampler](https://developer.apple.com/documentation/appkit/nscolorsampler), [objc2-app-kit0.3.2](https://docs.rs/objc2-app-kit/0.3.2/objc2_app_kit/struct.NSColorSampler.html). Private logs: eyedropper-final-browser.log, eyedropper-final-cargo-check.log and eyedropper-final-native-build.log.
