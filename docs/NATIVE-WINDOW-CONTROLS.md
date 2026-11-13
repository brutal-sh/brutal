# Native macOS window controls

The installed Open Pen position correction executes on 2026-11-13. UI-MAC-WINDOW-CONTROLS remains Verify for pointer dragging and independent review; this is not full native-chrome or Pen-parity acceptance.

## Correction

The 42-point tab pill sits at x8/y7 inside the 56-point header. Its centerline is y28; the reserved 72-point leading area has center x44. Actual AppKit control centers were x27/50/73,y18: six points right and ten points above the intended center.

Only `trafficLightPosition` changes, from x20/y20 to x14/y30, in the production and native-test Tauri configurations. Native controls retain their appearance, 16-point accessibility bounds and 23-point spacing. No CSS, fake controls, window dimensions, capabilities or dependency patches change.

Pinned Tao0.37.1 sizes the native titlebar container using the configured vertical inset and retains native button origins. Fresh native measurements confirm centers x21/44/67,y28, matching the actual tab-bar geometry.

## Executed evidence

Evidence root: `local-evidence/native-traffic-controls-2026-11-12/` (private, retained under the original task date).

- `installed-before.json`, `user-before.png`, `measured-delta.json`: original installation, user screenshot and measured mismatch.
- `candidate.json`, `dom-00.json`, `native-recheck/`: signed isolated candidate, exact profile/PID and actual header/native geometry. Minimize/restore and fullscreen entry/return execute; guarded teardown closes owned processes.
- `production-build.log`, `production-candidate.json`, `production-test-hook-rejection.json`: normal package build succeeds with only the default Cargo feature. Its reserved native-test profile argument is rejected before application initialization without creating a profile.
- `installed.json`, `installed-after.json`, `normal-transitions/`: actual `/Applications/Open Pen.app` runs executable SHA-256 `9ec1498b73954a54dbb561097b476dabdc24e7756ec8a52ce9f2b4f1616527f0`. Native minimize/restore, 880×600 resizing, movement to x240/y130, green-button fullscreen entry/return and native close execute. Every measured windowed state retains x21/44/67,y28. Fullscreen system controls are outside the editor; their fullscreen coordinates are not compared with the windowed pill.
- The original app is retained in two recoverable bundles. The installation command asserts all 46 fingerprinted profile files match immediately before and after replacement; `installed.json` records success, but a separate post-replacement hash map is not retained. The saved workspace bytes remain unchanged, it reopens, and both existing recovery offers remain visible. No document is discarded, OS permission approved or credential copied. This does not accept the complete normal-profile lifecycle.

## Limits and retained unsuccessful attempts

Computer Use's sharing indicator replaces the visible native control cluster during captures; those captures report different hidden-control bounds. Initial geometry and the complete native-only transition sequence are recorded before capture activation. Screenshot-only position acceptance is not claimed.

One additional isolated launch times out before a visible ready canvas; it is not counted as a pass. An immediate reopen racing normal Quit returns LaunchServices -600; after the old PID exits, a subsequent open succeeds. Both failures remain recorded.

Pointer-drag attempts report no window displacement, including on the pill padding. Native accessibility movement succeeds, but it does not prove pointer dragging. This remains an explicit Verify criterion; no draggable-region repair is claimed by the two configuration changes.

No full macOS packaging/notarization, other-platform, complete native menu, matched Pen raster or public-beta acceptance follows. The installed local package remains ad-hoc signed. Save-dialog correction continues separately under FILE-NATIVE-SAVE-UI.
