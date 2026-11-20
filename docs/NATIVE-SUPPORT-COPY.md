# Native-engine support notice presentation

Updated: 2026-11-09. Scope: BRAND-SUPPORT-NATIVE, the existing unsupported desktop
advice rendered with test-owned environments. Production copy and thresholds are unchanged.
This record does not accept physical native delivery or actual Pen design parity.
Source fixture and initial evidence are published at `368f67444eb6c2199f96f02804c336e5f357cf0d`.

## Executed matrix

The canonical Playwright configuration runs six typed desktop fixtures through the actual
`unsupportedNotice` and `renderSupportNotice` owners. A missing browser sentinel stops app
boot first, so no document or canvas loads. The fixtures inject `SupportEnvironment` directly;
they bypass OS detection and do not claim trusted native environment input.

| Fixture | Preserved fields and advice |
| --- | --- |
| macOS below minimum | macOS 12.6.4, Safari 16.2, WebView 615.1; macOS 13 upgrade advice. |
| macOS supported version, older WebKit | macOS 13.7.8, Safari 16.2, WebView 615.1; Software Update advice. |
| macOS version unavailable | Safari 16.2 retained; absent OS/WebView version omitted; Software Update advice. |
| Linux | OS 6.1.0, WebKitGTK 2.38.6, `webkit2gtk-4.1` package and 2.40 guidance. |
| Windows | OS 10.0.19045, Edge 100, WebView2 100.0.1185; Microsoft runtime/download identity. |
| Unknown engine | Unknown OS and WebView 0.1; existing operating-system update advice. |

Six fixtures × two requested color schemes × Chromium/WebKit produce 24 passing cases
in 27.639 seconds, with zero retries, skipped, unexpected or flaky results. Every case opens
and closes the Details disclosure by keyboard, retains present version/user-agent fields,
loads the own app artwork and activates all rendered links by Enter. Browser popups reach
test-owned intercepted destinations; the app notice stays present. All cases report no page
errors and no canvas. This is browser link intent, not Tauri's OS opener.

The parent inspects all 24 final captures across six contact sheets. Captured text names
Brutal, preserves third-party engine/package names and contains no inherited app label.
The own requirements URL and report query fields (template, platform, browser and diagnostic
details) are checked independently in the captured records. Only Windows includes the
existing Microsoft WebView2 URL. Existing native OS/version detection is covered separately
by owner tests, not by the rendered fixture's injected values.

Both requested color schemes render the existing `rgb(30, 30, 30)` notice. This verifies
retained behavior in both media conditions, not separate light styling. Focus rings differ
between the browser engines and remain visible in the inspected captures; no screen-reader
or complete accessibility-conformance claim follows.

## Reproduction and limits

The retained smoke run passes two cases; an initial complete matrix passes 24. Its list-only
reporter omits attachment metadata, so an unchanged final run records JSON attachments.
Complete results are moved to ignored evidence before every following browser run.
The final record is `local-evidence/support-native-final24-2026-11-09/`, including the
JSON report, 24 decoded notice records, all screenshots, six sheets and the inspection record.
All ten frozen source/config/artwork/fixture hashes still match. A temporary process-only
sleep assertion surrounds the browser runs and is absent after they finish.

All 65 support-owner tests pass with 177 assertions in four files. Test types, focused lint/
format, documentation and architecture checks pass. Independent review repeats the metadata,
matrix and hash checks and inspects all 24 captures, finding no concrete defect in this scope.
The earlier fixture lint error (inline type imports) is corrected before the browser runs.
No additional production build is needed for this tests/docs-only unit.

No production source, threshold, style, snapshot baseline, timeout, skip or global error
filter changes. No OS upgrade, installer, issue submission, permission grant, app installation
or relaunch occurs. Physical unsupported engines, native opener delivery, real detection
integration and comparison with actual Pen remain separate acceptance work.
