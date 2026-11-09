# Open Pen identity acceptance

Updated: 2026-11-09. Own-brand assets have executed output and browser checks.
Owned diagnostics/log names also have bounded executed checks below. Product copy, native
identity, links and full cross-platform branding remain separate open tasks.
The [desktop-link record](DESKTOP-LINKS.md) tracks the own setup destination,
translated wrapping and shared native-link keyboard acceptance separately.

The original `assets/brand/open-pen-app.png` is the source for shipped artwork.
Historical teal SVG masters retain provenance but are no longer generator inputs.
Native generation retains its existing source and Tauri path; app geometry is unchanged.

| Surface | Executed evidence | Limit |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
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

## AI copy checks and command-copy readability

Guided setup has nine executed browser journeys for translated access/connection screens and
unsaved-draft cancellation. Reopening and selecting the server again shows empty URL, model
and key fields with Continue disabled. Three existing simulated provider/setup journeys also
pass; the complete moved domain then passes all 15 journeys, including first-run cases.
The tests live together under `tests/e2e/settings/ai-setup/`; the directory move preserves
the existing first-run and setup test bodies and updates the contributor-guide reference.

A fresh isolated native test bundle also executes nine translated Codex setup journeys. The
captured screens show Open Pen agent/MCP labels; detection may still be checking or show an
existing account/tools connection. These checks do not install, initiate sign-in or send a
message. Failure-safe cleanup closes the owned dialogs, restores the captured starting language
and leaves Settings on General. Locale fixture setup focuses an existing option before Enter;
this does not qualify physical mouse input. Native captures stay private and may contain the
existing CLI account identity. The dedicated native type gate still has 67 existing errors,
with none in the new tests/helper.

Thirty targeted Storybook cases pass: four existing AI interaction/accessibility stories in
both themes, Command/Plain copy fields in both themes, and seven failure/setup states in all
nine languages and both themes. All 126 translated-state captures and four copy-field captures
are preserved and visually reviewed. Stories reuse the actual component and valid synthetic
states; they do not prove that a real provider or installed adapter reaches every failure.
The shared story-result helper retains the original completion/error/accessibility contract.

That sweep first finds a contrast failure on the command-copy button. Command fields now use
the existing surface foreground for that button; plain fields, geometry and the copy handler
retain their behavior. The failing receipt is retained, and the affected AI and copy-field
checks pass in both themes without an accessibility exemption or pixel-baseline replacement.
Independent review confirms the theme merge and per-instance overrides. Production browser
build, source/Vue/shared-test types, owned lint and documentation/changelog checks pass.

A separate nine-language chat journey now executes a simulated network failure and the actual
Retry action. Each case observes translated composer/error/retry labels, exactly two transport
calls, a successful reply and one user message. No request reaches the intercepted inference
endpoint. All nine error captures are inspected; this does not qualify a real provider outage.

Nine native callback journeys use the isolated test app's intercepted external opener. A stale
state returns the translated 400 page while the setup remains waiting; a denied matching state
returns the translated cancellation page and restores the sign-in button. The native setup
shows its translated cancellation notice. All nine native captures and 18 actual-response HTML
renders are inspected. No provider browser is opened, code is exchanged or credential is saved.
The loopback port is released afterward. The original nine native setup journeys also pass
after their shared locale/dialog helper is extracted; all 18 native cases pass together.

Earlier test failures remain recorded: cleanup sent Escape before the setup closed; a substring
selector matched a Codex account description instead of ChatGPT; one run found a hidden native
window. The final run uses an exact ChatGPT card label and explicit dialog cleanup. A browser
rerun also records a setup timeout during an unexpected navigation; the final uninterrupted
nine-case run passes with the exact transport-call assertion and complete transport interface.

A11Y-COPY is executed at `bf1b43eb3`. The original AI-copy sweep leaves successful
callbacks and the toast reflow issue open; subsequent acceptance is recorded below.
Those initial native captures precede the command-copy contrast change; native clipboard,
full Pen visual matching and full branding acceptance remain open. The broader structure lint
and dedicated native typing retain the previously documented unrelated failures.

## Companion version warnings and observed reflow gap

Eighteen actual native journeys exercise old MCP and Harness versions across all nine languages.
The opt-in runner fixture writes rejecting executables only beneath its checked temporary
native-test directory and prepends that directory to its own PATH. The spec verifies the native
build, discovered paths and reported versions before configuring models or sending a message.
Non-version commands exit without forwarding to real agents; setup may probe the rejecting ACP
stub without arguments. No installed companion is replaced and no inference is performed.

Each case observes the translated version warning, retains the unsent draft, adds no user
message and opens translated guided setup through the warning action. The final moved spec
passes all 18 cases in 31.4 seconds. The existing setup/callback domain passes its 18 cases again
after the shared locale helper becomes idempotent and avoids toggling an already-open popup.
The three specs now share `tests/e2e/native/ai/`; default runs leave the version fixture disabled.
Fixture self-checks verify root rejection, all version outputs, rejecting exits and call logs.

Visual review withholds acceptance: long Polish, French and German action labels consume most
of the toast width and force a narrow message column. Captures wait for the toast animation to
finish; full Polish captures confirm the issue is in the actual layout, not only the review crop.
[UI-TOAST-REFLOW](https://trello.com/c/DjJkNW8V) owns the shared layout fix. AI copy moves to Verify
without being accepted. Full branding, successful callback presentation and Pen parity remain open.

## Executed toast reflow

The shared toast keeps a readable message measure and lets a long recovery action move to
another row. Action, copy and close controls stay together in a conditional group; short
controls can remain inline. Existing button order, handlers, labels, tone colors, root lifetime
policy and progress content remain. This addresses the observed translated-layout defect.

Executed: 54 component checks pass. They include both warning messages in all nine languages,
both themes and measured 320/384-pixel fixtures, plus default/error/progress examples. Automated
checks cover translated labels, no outer overflow, visible controls, Tab to Copy/Close, Enter
dismissal and render/accessibility completion. All 72 translated captures and six baseline
captures are manually reviewed. Readability acceptance is visual; these checks do not establish
an automated readable-column guard or clipboard delivery.

A rebuilt isolated native app passes strict ad-hoc signing and all 18 version-warning journeys
again. All 18 stable native captures are reviewed against the preserved originals; the warning
keeps its draft, adds no user row and opens guided setup. The existing setup/callback checks
then pass all 18 cases as well. The fixture selects its editor handle explicitly, preventing
the driver's title-based recovery loop from switching during input. Cleanup uses the visible
wizard Close control; this does not qualify Escape behavior or arbitrary multi-window handling.
No real provider browser, sign-in or inference is exercised. The main installed app is unchanged.

Source/Vue/shared-test types, owned lint/format, architecture, documentation/changelog and
frontend compilation pass. The worktree's full build also passes after a diagnostic stack-trace
probe receives a descriptive error label. That one-line probe edit stays with the unpublished
GPU work and changes no GPU behavior; its wider runtime failure remains open. Dedicated native
typing retains 67 existing errors outside the owned files. The native bundle includes the
retained worktree changes and is not a clean release qualification.

Earlier build, native fixture/model-save and cleanup failures remain recorded. The first
layout pass passed component checks but orphaned controls; manual review rejects it before
the final grouping. UI-TOAST-REFLOW is executed only for this bounded criterion. AI copy,
full branding/accessibility, physical input/clipboard and exact Pen parity remain open.

## Callback presentation with provider traffic rejected

Nine additional native journeys execute the code callback in the isolated test app and pass
in 11.2 seconds. The app supplies its current translated page to the real loopback listener;
a matching synthetic callback returns HTTP 200 with Open Pen branding. Each subsequent native
token connection is rejected by a test-owned localhost proxy before TLS or token data reaches
the provider. The actual setup then displays its translated failure and re-enables sign-in.
All nine native result captures and nine rendered actual response documents are inspected;
the response documents have no horizontal overflow. Raw French/Japanese/Polish captures also
confirm that review-sheet cropping is not actual dialog clipping.

The proxy forwards nothing. Before opening sign-in, an actual native HTTPS probe to an invalid
fixture domain must reach that proxy and fail. The final proxy log contains nine rejected
provider tunnels, one per locale; other background tunnels are also rejected. The native-test
opener records the authorization URL without opening a provider browser. No real login,
successful token exchange, credential save, inference or main-app installation is executed.
The callback's existing “signed in” wording precedes the exchange; its presentation is not
proof of authentication. The test app and callback listener are absent after the run.

The temporary acceptance spec and proxy configuration remain in ignored `scratch/`; no
production hook, dependency or persistent callback-success regression is added. Earlier driver
mock/immutable-invoke preflights stop before sign-in, and an initial proxy run records a local
socket-reset failure. The final proxy handles socket resets and exits successfully. These
failures and private captures remain in `local-evidence/brand-copy-ai-2026-11-06/callback-success/`.
The dedicated native type gate retains its 67 earlier errors. Physical input, real provider
sign-in, native clipboard and exact Pen screen matching remain separate acceptance gates.

Together with the earlier source, access/cancel, component failure, network Retry, stale/denied
callback and companion-version checks, this closes the bounded BRAND-COPY-AI copy task.
The parent copy gate, whole branding milestone and full product parity remain open.

## Editor copy and opaque warning surface

Mixed WebKit execution remains unaccepted under [STAB-WEBKIT-MIXED](https://trello.com/c/ech6H0Xm).
The attempted 117-case run records 90 passes, ten timeouts, one interrupted case and 16
unexecuted cases. Its first English font case exhausts the unchanged 15-second limit after
capture; later FIG cases can stay at decoding. A fresh command-nine/font-one prefix passes,
and fresh file runs pass, without establishing the cause of the mixed failure. The editor,
beta and terminal gates retain this dependency. Native queued-file delivery also remains open.

The following browser branches have bounded passing receipts. The counts identify those
branches; they do not turn the mixed run into an accepted suite.

| Branch | Observed path and preservation | Limit |
| --- | --- | --- |
| Command search, nine languages and two engines | Actual description, search focus and Escape dismissal. | The own-brand description is accessibility text; this does not qualify all menu commands or Pen geometry. |
| Unsupported font, nine languages and two engines | Real font-status branch from a synthetic host-loader failure; original family and text remain. | No native font-parser or all-format claim; the English mixed-run timeout remains open. |
| Unsupported variable, nine languages and two engines | Actual inspector tooltip; full expression and cached width remain. | This branch checks in-memory preservation. |
| Microphone denial, nine languages in Chromium | Browser permission refusal displays guidance and keeps the fixture out of a call. | Fake device; no real audio, OS permission panel or native delivery. |
| Unreachable room, nine languages and two engines | A real local WebSocket closes normally; the actual 21-second status deadline is advanced, then Leave executes without browser errors. | Simulated elapsed time; reconnection is unaccepted. |
| FIG import/save/reopen, nine languages, both themes and engines | File chooser triggers the real import warning; Close executes, height/background edits save through a real download, parsed bytes retain the expression and geometry, and the selected reopened tab retains the values. | Browser download fallback; no native file panel or associated-file delivery. |

Fixtures use the browser-language setting while preserving the canonical first-run storage
state. The app's existing plain theme setter selects the actual theme, which the test checks
on the root. Merely setting the browser color scheme leaves this app's default dark theme;
those earlier captures do not qualify light mode. Unknown HTTPS requests are blocked and
reported; known metadata/Cloud services have local stand-ins. This is not a universal network
firewall, provider login or real collaboration service acceptance.

The real FIG-import warning exposes a separate floating-surface defect: its 10% background
tint lets the file-support banner show through and yields 1.53:1 normal-text contrast over
the light canvas in dark mode. The candidate replaces only the floating warning's background
with the existing opaque panel token. Inline status tints, warning icon/border/text, geometry,
controls, progress and lifetime retain their owners and behavior.

Executed surface measurements: all 36 language/theme/engine variants report background alpha
and settled opacity of one. Normal text contrast measures 8.3056:1 in dark mode and 6.0565:1
in light mode, above the [normal-text minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
The four English before/after bounds remain 384×46 pixels at the same position. All 72 actual
first/reopened captures are inspected; canvas pixel samples confirm the light and saved dark
underlays. The warning remains readable without underlying text bleeding through it.

Screenshots finish finite CSS animations for inspection; this does not change the app's motion.
Earlier WebKit captures caught the entrance fade and are rejected as settled visual evidence.
Their raw files, the actual before captures and failed matrix/traces remain retained. Existing
toast component regression passes 24 cases: six baseline examples and 72 translated
recovery captures at 320/384 pixels. All 78 captures are inspected. Story accessibility,
control visibility, action-to-Copy-to-Close focus order and Enter dismissal execute. These
static error-tone stories do not activate recovery actions, copy the clipboard or test
lifetime; the actual warning-tone surface is qualified by the separate FIG journeys.
The five existing progress/lifetime tests also pass, including determinate/indeterminate
updates, paused expiry, resumed progress and dismissal after clearing progress. Their clock
is simulated. Action activation and clipboard contents remain outside this check.
[UI-TOAST-SURFACE](https://trello.com/c/FzA3qbsT) has executed this bounded surface criterion. Its bounded acceptance cannot close editor copy, native/Pen matching,
mixed stability, the branding milestone or beta.


## Recovery identity and failure feedback

The [recovery record](RECOVERY-COPY.md) qualifies actual dialog outcomes in all nine locales
and both browser engines: 76 cases pass, including four existing controls, and all 72 captures
are inspected. Close and failed Restore retain the disposable snapshot bytes; Restore recovers
the named geometry; explicit Discard stays removed after reload. Failed recovery uses its
existing translated message and retains parser details in the local warning. Eighteen owner
tests, normal build, source/Vue/test types and focused lint pass. Source and evidence are published at
[`a289fe255`](https://github.com/jpoindexter/open-pen/commit/a289fe25500786f12e5ce9fe68070192bb295b29).

One short Chinese error toast stacks its icon, message and controls; the separate
[reference task](https://trello.com/c/f3kDECKO) retains actual-Pen grouping adjudication.
This receipt does not qualify native recovery, multiple-snapshot preservation, exact Pen
geometry, every recovery workflow or full product identity. The failed-restore test proves
retention through Close, not rediscovery after another launch.


## Update prompt identity and guidance

The [update prompt record](UPDATER-COPY.md) qualifies thirteen actual component states in
nine locales and both themes: 36 runner cases pass with plays/axe, and all 234 captures
are inspected. Versions, progress, failure placeholders and mock event actions retain their
contracts. The notes link reaches the verified own changelog through an actual keyboard
activation into a test-owned page; real repository-path and routing evidence remain separate.
Unavailable guidance names Open Pen without publisher instructions. The empty-notes label
uses an existing readable semantic token, correcting the observed dark contrast failure.

Final normal build, source/Vue/test types, architecture/i18n and 23 owner tests pass.
The source and record are published at
[`9d399a4ab`](https://github.com/jpoindexter/open-pen/commit/9d399a4abaa9ba1c465b38fdaf00965535b82ed1). Typed mock emits and explicitly fictitious release data do not
qualify controller transitions, a real release/feed/download/install, native restart,
physical input, exact Pen geometry, human translation sign-off or full branding.


## Restart feedback and support decomposition

The [restart feedback record](RESTART-COPY.md) qualifies actual controller/component
interaction through typed test-owned backends: 36 passing nine-locale/two-theme cases,
54 inspected captures and thirty matching frozen hashes. Denial causes no relaunch;
Retry after rejection does not repeat check/download/install; Later releases the pending
handle and calls the test-owned close-window backend. Source and evidence are published at
[`4006503a6`](https://github.com/jpoindexter/open-pen/commit/4006503a6f051a7a76e7517bf7d0c7d0d648ed99).
Together with the published recovery and update-prompt children, this executes only the
parent recovery/update/restart copy gate. Native approval/relaunch, exact Pen geometry
and full branding remain unaccepted.

The remaining support-copy gate has five bounded children: browser guidance, native-engine
advice, ACP startup failure, WebMCP document metadata and CLI/format output. The pre-boot
notice is intentionally English before locale boot; platform fixtures do not prove native
delivery. Browser guidance, CLI/format output, WebMCP metadata and the Storybook manifest
error label have bounded Executed evidence. ACP startup failure presentation also has bounded
Executed evidence at `c65a7374f`; native-engine advice is Executed at `368f67444` and the
support-copy acceptance gate has bounded Executed reconciliation at `d30381b16`. Portal has
bounded Executed evidence at `5e68a7668`; editor/native identity, remaining links and broader
branding acceptance stay open. The editor-copy gate retains its mixed WebKit dependency.


The [browser support record](BROWSER-SUPPORT-COPY.md) publishes the own requirements/report
routing, matching issue-form platform option and preserved diagnostic details at
[`59e02516b`](https://github.com/jpoindexter/open-pen/commit/59e02516b70bd22032906a1e8f5683c8512197ce).
All 35 browser cases pass with inspected captures and matching frozen sources; fresh
authenticated remote contents match the new README and template exactly. Both requested
color schemes retain existing dark pre-boot styling. The support parent and full links
gate remain open for their other owners and uninspected destinations.


## CLI help and format presentation

The [CLI record](CLI-COPY.md) executes all forty-nine registered help paths through source
Bun and packaged Node entries: 98 passing invocations, complete nested usage paths and
seventy-four matching frozen source/compiled hashes. Format-list text and JSON remain
byte-identical across all fourteen entries. The public command registry, compatibility
executable/package IDs and format contracts remain unchanged. The CLI owner suite passes
46 tests; final build/lint and source/Vue/test types pass. The source and record are published at
[`f5eef8e84`](https://github.com/jpoindexter/open-pen/commit/f5eef8e84a2e438d53a112e199240f895f92f303).
The separate [Storybook manifest error-label record](STORYBOOK-ERROR-COPY.md) now has
bounded Executed evidence at `881d0b7e5`; compatibility filenames and namespaces are preserved. No full CLI, native or whole-brand acceptance is inferred.


## WebMCP metadata

The [WebMCP record](WEBMCP-COPY.md) executes the actual registration service with a test-owned
modelContext: 24 Inspect and 47 Edit payloads retain Core descriptions, schemas and access
hints while naming Open Pen. Mode revocation, stop, missing context and partial rejection
run without resolving a document. All eleven owner tests and source/Vue/test types pass.
The complete string scan retains only two real OPENPENCIL_MCP_ROOT references as compatibility
identifiers. Standalone format-list presentation remains the separately executed CLI path.
Source/evidence is published at `c85c15120`; real browser-vendor, agent/document, native and full-brand acceptance
are not inferred from these metadata controls.

## ACP startup errors

The [ACP record](ACP-FAILURE-COPY.md) exercises nine startup failure paths through the real
transport with isolated SDK streams. Own messages name Open Pen and preserve Codex, protocol
identifiers and agent-reported reasons; all nine cases reject before a prompt is delivered.
The run also reproduces and corrects structured JSON-RPC errors collapsing to `[object Object]`.
Only validated message/text details are displayed, auth codes retain sign-in guidance, and
a rejected tool-connection watcher stops the starting child before returning its error.
Ten isolated checks, 33 owner tests, the normal build/lint, source/Vue/test types and focused
format/docs/changelog checks pass. Real processes, provider accounts, native
chat rendering and full ACP/Pen parity are not accepted by these simulated startup paths.

## Native-engine support notices

The [native-support record](NATIVE-SUPPORT-COPY.md) exercises six named desktop environments
through the real notice owners in Chromium and WebKit. All 24 cases and inspected captures
retain Open Pen naming, technical fields, engine/package identities and keyboard disclosure/
link intent. Ten frozen inputs match. Both requested color schemes retain the existing dark
notice; this does not accept distinct light styling, actual OS detection, Tauri opener delivery
or physical unsupported engines. All 65 support-owner tests and test types, focused lint/format,
docs and architecture checks pass. Production source is unchanged.

The [support-copy gate record](SUPPORT-COPY-ACCEPTANCE.md) reconciles the original support,
ACP, WebMCP and CLI/format criteria against all five published owners. It preserves the
scope and delivery limits; portal and the broader copy/branding gates remain separate.

## Portal client labels

The [portal-copy record](PORTAL-COPY.md) renders all ten changed client/welcome/device/session
labels in nine locales through the real portal pages and local API fixtures. All 72 browser
cases and 360 canonical-label checks pass; all 324 captures are inspected across 54 sheets.
The real device controller handles test-owned rejection/retry/approval, denial and failed-lookup
expiry feedback, retaining email/code values. Real OpenPencil Cloud service names and hosts
remain; direct navigation and local responses do not accept real sign-in, verification,
backend/native/CLI/provider delivery or full branding/Pen parity. Portal production source is unchanged.
