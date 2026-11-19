# Native macOS window controls

The November 13 position correction and the November 18 installed-window qualification verify the native controls in Open Pen’s header. Broader native-chrome and Pen parity criteria remain open.

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

## Pointer re-entry — 2026-11-17

The normal installed executable is now `db4e528c`, delivered under the separate Save task. Exact PID 680, launch identity and main window 87 are retained without replacement. Two earlier Computer Use drags leave 1280×800 at x116/y71 unchanged and report the app inactive, including after Jason brings it forward. This does not establish a product dragging defect. The user asks the agent to handle the test; no manual test is required from him.

A different control uses the native Window → Bring All to Front action, then a header double-click followed by a drag before measurement. This combined control changes the main window from 1320×838 at x116/y33 to 1512×949 at x0/y33; it does not isolate which input causes the change. A second double-click alone restores the exact prior bounds. A subsequent isolated drag from screenshot coordinates 475,88 to 635,168 leaves those restored bounds unchanged. The isolated double-click restores the prior geometry; pointer dragging remains unaccepted. The earlier combined zoom/drag measurement is retained separately and is not called successful movement by dragging.

Evidence is in `local-evidence/native-window-final-2026-11-17/`, including `isolated-drag-result.json`. These captures use the OS window-sharing indicator, so they do not remeasure the three native button centers. No CSS, capability, dependency, input-security setting or window configuration changes. The app remains at its pre-control 1320×838/x116/y33 bounds with Home selected. UI-MAC-WINDOW-CONTROLS remains Verify for its remaining pointer criterion.


## Installed window qualification — 2026-11-18

The optimized Open Pen executable `0cab0ec48c05` from runtime source `5d019e320` ran from `/Applications/Open Pen.app`. A physical drag below the header plus button moved the window 56 points right and 44 points down. Resizing by dragging the right edge changed its width from 1280 to 900 points. All 20 live resize samples retained native centers at (21, 28), (44, 28), and (67, 28). Three separate 880 × 600 accessibility resize cycles also retained those centers, and every cycle restored the starting frame.

The native controls minimized the window, entered fullscreen, and closed the app from Home. The window and buttons returned to their original geometry after restore, fullscreen exit, foreground changes, and a new-process launch. The new process still offered both pending recovery entries. Closing the recovery dialog left both entries alone. The installed executable rejected the reserved native-test profile argument before startup and created no profile.

Pen 1.2.23 and the installed Open Pen were captured in Light at the same active 1280 × 800 viewport and 2× display scale. Both showed 16-point native Graphite controls with 23-point spacing. Pen centers were (27, 29), (50, 29), and (73, 29). Open Pen centers align with its existing header and 72-point leading area. Both window frames and Open Pen’s original Dark setting were restored.

An extra diagnostic resized the window and immediately rewrote its existing position. One Accessibility sample returned temporary default control coordinates at 5.1 ms and the next sample showed the configured coordinates at 12.7 ms. The physical resize and size-only cycles never showed that displacement. The original off-center screenshot remains unattributed to a specific build. Private captures and retained failures are under `local-evidence/user-native-regressions-2026-11-17/full-run-mac-2026-11-18/window-parity/`.

## Leading spacing revision — 2026-11-18

The supplied crop shows an approximately 13-point inset from the pill to the first native button center and 23 points from the plus center to the other edge. The revised Open Pen header reserves 88 points for the native group. The raster reference and reviewed candidate measurements are catalogued in the private Pen reference workbook.

The isolated native build reports AppKit centers x29/52/75 at y28 with the original 23-point pitch. The built WebView reports a 42-point pill with its centerline and plus centered at y28. The measured edge-to-center distances are 21 points on the leading side and 23 points on the trailing side. All 205 samples across three native resize and restore cycles retain those centers. The 880 × 600 and 1280 × 800 frames are recorded.

The first bare test binary mounted the WebView. Its native accessibility focus guard refused measurement. Packaging the same test binary with an isolated bundle identity made native window measurement possible. The receipt is in `local-evidence/pen-reference-2026-11-18/open-pen-candidate-native.json`.

The release build from `7b72a75ba` now runs at `/Applications/Open Pen.app`, executable SHA-256 `f911038709287031c11e0d25d177a6315f6cec2d8e62951734f767a86b72ae73`. Read-only native inspection confirms the x29/52/75, y28 centers in its regular 1280 × 800 window after launch. Strict local signature verification succeeds. The four pre-existing recovery records and both blobs retain their exact hashes across replacement and startup. The Recovery dialog remains available. The previous app bundle is retained locally for rollback.

The same installed build moved 56 points right and 44 points down when dragged from the empty pill padding below the plus button. The inverse drag restored its original position. A physical edge drag reduced the width from 1280 to 900 points. All 20 live samples and the restored window retained the x29/52/75, y28 centers and 16-point control bounds.

The native yellow control minimized the window, and restore returned its exact frame. The green control entered fullscreen. The View menu's Toggle Full Screen action restored the original 1280 × 800 frame and control geometry. A separate Control-Command-F attempt left fullscreen active. AppKit exposed the menu's F command with AX modifier mask 24, which omits Control and Command. The first drag probe declined to send input when the window lost focus.

The disposable document closed with its source checksum intact and the previously open tab still available. Strict signature verification passed for the installed bundle. The native app process remained running. Close and relaunch on this executable, a matched visual comparison of this spacing revision, and distribution trust remain open. The private receipt is `local-evidence/pen-reference-2026-11-18/normal-installed-lifecycle/qualification.json`.

## Leading header drag — 2026-11-19

In the regular installed build from `7b72a75ba`, a pointer drag from the empty padding 7 points below the minimize button moved the foreground window from (116, 71) to (172, 115). The test restored the exact 1280 × 800 starting frame. AppKit reported all three centers at x29/52/75, y28, with 16-point bounds after restoration. The point was outside each native button and the probe confirmed the installed app owned the topmost window under the pointer before pressing.

The November 18 screenshot still has no exact build attribution. The installed build's matched reference capture and red-window-close/relaunch remain open. The private measurements are in `local-evidence/pen-reference-2026-11-18/left-header-drag-2026-11-19/`.

## Regular Mac close and relaunch — 2026-11-19

The regular app from `7b72a75ba` had one disposable document tab open. The
test closed that tab, verified its saved bytes, and confirmed Home was the
only remaining tab before pressing the physical red button. The click at
(29, 28) in the foreground window closed the last window and the process
exited. A normal launch from `/Applications/Open Pen.app` started a new
process. The 1280 × 800 frame at (116, 71) and all three AppKit control
centers and bounds matched before and after. Strict local signature
verification passed.

The launch offered both existing recovery entries. Closing the prompt
returned to Home. All four recovery records and both blobs retained their
exact digests across close, relaunch and dismissal.

The [foreground Light captures](NOTE-REFERENCE-CONTROL.md#matched-foreground-note-appearance--2026-11-19)
also show the new spacing in an editor window at the same 1496 × 933
viewport and 2× scale as Pen 1.2.23. The isolated capture uses the same tab
bar and traffic-light configuration as the installed revision. The
regular installed close/relaunch used its existing Dark appearance.
Current AppKit measurements reported (27, 29), (50, 29), and (73, 29)
in Pen and (29, 28), (52, 28), and (75, 28) in the regular Open Pen app.
Both sets of buttons have 16-point bounds and 23-point spacing.

The reported screenshot's executable remains unknown. The revised spacing
awaits visual sign-off on UI-MAC-WINDOW-CONTROLS. Distribution trust stays
with REL-MAC-TRUST. Private receipts are under
`local-evidence/pen-reference-2026-11-18/regular-red-close-2026-11-19/`.
