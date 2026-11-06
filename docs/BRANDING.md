# Open Pen identity acceptance

Updated: 2026-11-06. Own-brand assets have executed output and browser checks.
Owned diagnostics/log names also have bounded executed checks below. Product copy, native
identity, links and full cross-platform branding remain separate open tasks.

The original `assets/brand/open-pen-app.png` is the source for shipped artwork.
Historical teal SVG masters retain provenance but are no longer generator inputs.
Native generation retains its existing source and Tauri path; app geometry is unchanged.

| Surface | Executed evidence | Limit |
| --- | --- | --- |
| Main/micro marks and light/dark variants | Generator source-fidelity checks; inspected browser captures at 16/24/32px and larger sizes. | Chromium browser evidence; WebKit and full product branding remain open. |
| Monochrome | Neutral-channel and retained light/dark feature checks; rendered output inspected. | Browser filter rendering is not separately qualified. |
| Favicon and declarations | Real browser loads, both themes, 1x/2x captures; ICO sizes and no duplicate manifest checked. | No installed PWA acceptance is inferred. |
| Profile and any-purpose PWA | Output pixels match canonical Open Pen PNG; generated images inspected. | Platform installation and cache migration remain open. |
| Apple Touch / maskable | Opaque output, expected dimensions and safe-circle validation; output inspected. | Actual mobile OS launcher delivery remains open. |
| Native PNG/ICO/ICNS | Fresh generation, dimensions/RGBA/container and reproducibility checks; 32px/128px images inspected. | This does not qualify a newly packaged or installed native build. |

All 16 generator/cache tests pass. Eight browser workflows pass without snapshot update
after inspecting the eight intentionally changed artwork captures. Existing Open Pen header
captures are unchanged. Web, docs and desktop output checks reproduce byte-for-byte.
Tool types, focused lint, architecture, documentation and changelog checks pass.
Independent review finds no concrete source defect and repeats six focused generator checks.

SVG image compositing can round a visible premultiplied edge channel by one; source-fidelity
checks use the rendered image after scaling and compositing. Canonical PNG/PWA output remains
pixel-equal to the canonical Open Pen PNG at the required size.

Required upstream licenses and engine attribution remain. Compatibility package/protocol IDs
and truthful external-provider names are not own-product branding. Localized visible labels,
native permission/process labels, app-owned diagnostics/log prefixes and help destinations have
their own task cards. None is accepted by the artwork checks.

See the [PRD](PRD.md), [task index](TASKS.md), [source/generator guide](../assets/brand/README.md)
and [branding milestone](https://trello.com/c/2cCz31Kz).

## Owned diagnostics and log names

App-owned error prefixes, MCP startup/connection/unavailable messages, JSX diagnostics,
unsupported-input errors and profiler labels use Open Pen or neutral descriptions.
The support report downloads as `Open Pen diagnostics.json`; the profiler diagnostic
downloads as `open-pen-frame-<timestamp>.speedscope.json`.

Executed: 184 focused app/MCP/Core/sandbox/profiler/privacy tests pass across 23 files.
Six Settings/diagnostics browser workflows pass, including actual downloads of both named
JSON files, correlated events, privacy filtering and retention. A separate code-editor browser
workflow displays both new property and unknown-element warning messages. Source timing APIs
emit the new mark/group names while retaining callback event names. Source/Vue/test types,
focused lint and architecture pass. Independent review identifies three missed labels; all
three are corrected and its subsequent 33 focused checks pass.

Limits: the profiler file contains no node samples; file delivery/naming is accepted, profiling
accuracy is not. The editor fixture explicitly uses `/?test`; ordinary startup, the native
save panel and a newly packaged native build are not qualified by these browser receipts.
Earlier failures remain recorded: one removed Settings test target, a code-editor fixture
without test mode, and the incorrect assumption that the existing profiler records node samples.

Compatibility exceptions are intentional: clipboard warnings identify the OpenPencil data
format; reserved integration names, scripting/API names, package names, headers, readiness
tokens, discovery paths, storage keys, serialized internal names and font-family identities
retain their existing values. External OpenPencil Cloud remains named as that provider.
These are not own-product log prefixes. Localized UI labels, startup guidance, ACP setup copy,
provider presentation metadata and notification text remain on the product-copy task.

## Canonical product copy

Canonical own-app labels use Open Pen in English and the eight translated SDK catalogs,
translated app notifications, startup guidance, AI setup/ACP feedback, WebMCP descriptions,
OpenRouter's app-title metadata, document-format labels and CLI help. The welcome uses its
catalog directly; it no longer replaces an English name inside translated text at render time.

Privacy copy names the actual upstream OpenPencil project as the recipient when reporting is
available, and states that this build sends no pings or usage statistics. No feedback setting,
endpoint, consent behavior, provider login or credential is changed. Actual OpenPencil Cloud,
upstream hosting, format names, package/command/API names and storage keys remain explicit
compatibility or external-service exceptions.

Executed source evidence: all 96 modified JSON catalogs retain their keys, types and
interpolation tokens across 464 edited values. Locale validation passes. All 94 focused tests
across eight files pass, including support guidance, WebMCP, ACP and reporting/consent behavior.
Four actual CLI help commands and the format list show the new presentation names while
retaining command and format IDs. Workspace packages and the production browser build pass.

The nine-locale browser journey exercises ordinary first-run welcome, privacy preferences and
reload, diagnostics and the rendering section. It checks explicit translated headings, inspects
Open Pen labels, captures each affected section and intercepts the reporting endpoint; no report
request occurs even after changing sharing preferences. Separate existing first-run,
diagnostics and General settings journeys pass. This is bounded browser copy acceptance,
not native input or full design parity.

The canonical-source child is executed at `f021d071f`; the parent
[BRAND-COPY](https://trello.com/c/zU0zBEql) stays open. Six smaller cards separate
canonical sources from remaining AI, editor notifications/menus, recovery/update, cloud-client
pages and support journeys. Unexercised states do not inherit acceptance from source checks.
Native delivery, help destinations and final shipped-brand qualification remain separate.
Translations have technical and visual review, not independent native-speaker review.
The full lint gate retains an existing graphics-resource test error outside this copy change;
owned-file lint, source/Vue/test types, architecture and documentation checks pass.
