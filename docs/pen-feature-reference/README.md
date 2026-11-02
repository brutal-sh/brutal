# Pen feature catalog

Reference: official documentation retrieved 2026-10-30; installed acceptance target `/Applications/Pen.app` 1.2.21. OpenPencil is the implementation base, never the product reference.

This catalogs every current documentation chapter. Requirements are paraphrased; acceptance checks are our own executable criteria. A documented claim is not an observed result. **No row is fully accepted.** `Open` means acceptance is missing, not necessarily implementation. `Partial` means linked evidence covers only part of the row. The installed app can differ from the live documentation; record both rather than silently choosing one.

The native [Goodies inventory](../GOODIES-PARITY.md) records its five sections, style preview/composer behavior, document cards and shader actions in addition to the documentation chapters below.

Subscriptions, vendor activation and vendor account gates are excluded. Independent equivalents must still protect documents, credentials and published data. External AI/service costs and provider authentication remain separate. Vendor source/assets stay in ignored private evidence.

Machine-readable requirements: [features.json](features.json). Source/heading inventory and cached-page hashes: [sources.json](sources.json). [Shortcut matrix](shortcuts.md), [serialized fields](format-fields.md), [native paint controls](paint-controls.md), [CLI/MCP contracts](command-contract.md), [native screen coverage](../PARITY-STATE-MATRIX.md), [execution evidence](../ACCEPTANCE.md), [reference provenance](../PEN-REFERENCE.md).

## Acceptance rules

A row closes only after the actual Open Pen user path runs, its saved/exported output is inspected, and the same state is compared with real Pen. Visual acceptance includes size, position, spacing, borders, radii, glyphs, typography, menus, focus, hover/selected/disabled/mixed/loading/error states and dismissal. Functional acceptance includes Undo/Redo, persistence, errors, cancellation and resource handling where applicable. Automated regressions alone do not establish Pen parity.

Every chapter below owns its documented subheadings in sources.json. Those mappings establish documentation coverage, not executed coverage. Undocumented native menus remain in the separate screen/menu ledger.

## Installation

Source: [Installation](https://docs.pen.dev/getting-started/installation).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| ENV-01 Desktop distribution | macOS, Windows and Linux builds; version and update commands. | Install each supported package; launch, inspect version and update outcomes. | Open |
| ENV-02 IDE extension | VS Code and Cursor can open .pen visually. | Open existing/new files and toggle between source and design. | Open |
| ENV-03 CLI installation | Standalone CLI; documented runtime minimum is Node 22.19. | Install independently; run version/help outside the repository. | Open |
| ENV-04 External client setup | Claude Code, Codex, Gemini, Antigravity, OpenCode, Kiro and Claude Desktop integrations. | Enable/disable each supported client; reconnect and inspect live tool list. | Open |
| ENV-05 Shared Codex configuration | ChatGPT desktop and Codex IDE use Codex CLI MCP configuration. | Confirm the intended independent server in each client without replacing Pen's entry. | Open |

## Authentication

Source: [Authentication](https://docs.pen.dev/getting-started/authentication).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| AUTH-01 Editor identity | Vendor email/password/code, account, workspace and plan screens are reference surfaces. | Provide independent account/workspace equivalents where needed; local editing must require no vendor account. | Open |
| AUTH-02 Existing CLI login | OpenAI Codex and Claude Code settings are supported provider choices. | Use Jason's existing CLI login to create and modify a real design; no credential copying. | Partial — [evidence](../LOCAL-RUNTIME.md); Existing CLI integration evidence is narrower than every provider/model workflow. |
| AUTH-03 Provider catalog | OpenAI, Claude, Gemini, Cursor, Copilot, Meta, xAI, Kimi, OpenRouter, Moonshot, Deepseek, Together, Fireworks, Z.AI and OpenCode providers. | Compare every provider row, setup route and available-model result against installed Pen. | Open |
| AUTH-04 Claude external configuration | Bedrock, Vertex, Foundry and custom Claude configuration have separate setup/status. | Check configuration validation and external-config labeling with isolated test configuration. | Open |
| AUTH-05 Custom endpoints | OpenAI Completions/Responses and Anthropic Messages; optional API key. | Use a local test endpoint; verify protocol, errors and secret redaction. | Open |
| AUTH-06 Connection lifecycle | Status, refresh/re-check, missing models and clearing saved keys. | Exercise disconnected, configured, successful, expired and cleared states without touching existing credentials. | Open |

## AI Integration

Source: [AI Integration](https://docs.pen.dev/getting-started/ai-integration).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| MCP-01 Integrated agent | Desktop composer edits the active design through a chosen provider. | Create a node, modify the selected node, inspect the actual resulting document. | Partial — [evidence](../LOCAL-RUNTIME.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| MCP-02 External MCP lifecycle | Client uses stdio; Pen host connection uses Unix socket or Windows named pipe. | Connect, restart host/client, fail cleanly and reconnect to the intended document. | Partial — [evidence](../LOCAL-RUNTIME.md); Independent local bridge evidence does not establish Pen public-tool or transport parity. |
| MCP-03 Public tools | Standard get_style, read_skill, get_app_state and execute contracts. | Compare live schemas/results with Pen; exercise read, mutation, screenshot, export and errors. | Open |
| MCP-04 Conditional tools | browser requires desktop; spawn_agents requires explicit server enablement. | Confirm availability gates and disabled-state errors; no unsolicited agent spawning. | Open |
| MCP-05 Document targeting | State/path confirmation precedes external editing. | Open two documents; target one by path and prove the other remains untouched. | Open |

## Create your first design

Source: [Create your first design](https://docs.pen.dev/getting-started/create-your-first-design).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| FIRST-01 First AI workflow | Create, select, request a revision and inspect properties. | Run through the actual provider-backed composer; save and reopen the result. | Open |
| FIRST-02 Focus-aware history | Canvas Undo/Redo differs from text-field history. | Edit a numeric field and text, then canvas; verify the correct undo target in each focus state. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| FIRST-03 Draft to project file | Dashboard draft autosaving and explicit Save/Save As have distinct roles. | Create draft, restart, Save As, edit, Save and reopen the project file. | Open |

## .pen Files

Source: [.pen Files](https://docs.pen.dev/core-concepts/pen-files).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| FILE-01 Portable document | JSON .pen files with relative external resources and Git workflows. | Move a fixture folder; reopen its images, libraries and fonts without absolute-path leakage. | Open |
| FILE-02 Dashboard categories | Recent files, Drafts and Design Systems. | Compare empty/populated/search/category states with Pen; open the chosen item. | Open |
| FILE-03 Grid and list views | Previews; list sorting by name, last use and creation; multiselection. | Change view/order, select several entries and verify each action's targets. | Open |
| FILE-04 Open and focus | Open/drop .pen; an already-open document receives focus. | Open the same canonical path twice and check one document/tab. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| FILE-05 Recent removal | Removing a recent entry leaves the source file intact. | Remove a disposable recent entry; prove its file still opens. | Open |
| FILE-06 Draft deletion | Deleting a draft removes its stored design. | Use a synthetic draft; verify confirmation, cancel and deletion states. | Open |
| FILE-07 Recovery backup | Existing-file edits use a separate recovery copy until explicit Save. | Edit, interrupt a disposable run, recover, compare original bytes and recovered design. | Open |
| FILE-08 Recovery decisions | Save/Save As persist recovery; discard removes the backup. | Exercise each decision with separate synthetic copies; prove no unrelated work loss. | Open |
| FILE-09 External changes | IDE conflict handling offers reload or keeping work through Save As. | Change a fixture externally; compare conflict prompts and retained versions. | Open |
| FILE-10 Git conflicts | Preserve both versions and reapply changes through editor/tools. | Resolve a synthetic conflict without broken IDs, dependencies or lost content. | Open |

## Design as Code

Source: [Design as Code](https://docs.pen.dev/core-concepts/design-as-code).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| GIT-01 Text version control | Designs can be committed, diffed, branched and merged with code. | Commit two synthetic revisions; inspect meaningful text changes and reopen each version. | Open |

## pen.dev Interface

Source: [pen.dev Interface](https://docs.pen.dev/core-concepts/pencil-interface).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| UI-01 Pan and zoom | Space/middle drag, horizontal wheel, modified scroll and pinch. | Compare pointer/trackpad navigation and zoom anchoring against Pen. | Open |
| UI-02 Fit controls | 100%, fit all and fit selection have distinct commands. | Run each with far-apart nodes and multiple selections; compare viewport bounds. | Open |
| UI-03 Hierarchy selection | Deep click/marquee, multiselect, select all, parent/child navigation. | Use nested frames and overlapping nodes; compare selected IDs and highlight colors. | Open |
| UI-04 Frames and groups | Wrapping/grouping, ungrouping and clipping preserve hierarchy. | Wrap a nested selection, clip overflowing children, Undo/Redo and save/reopen. | Open |
| UI-05 Flex layout | Axis, alignment, gap, Space Between/Around and padding. | Compare child geometry after resize, edits, Undo/Redo and .pen reopen. | Partial — [evidence](../ACCEPTANCE.md); Space Around and four-sided padding native paths executed; full layout states remain open. |
| UI-06 Sizing modes | Fixed, Hug and Fill; absolute children escape flow. | Check empty containers, unsupported-parent fallback, variable bindings and resizing. | Partial — [evidence](../ACCEPTANCE.md); Deferred Fill and empty Hug paths executed; complete sizing coverage remains open. |
| UI-07 Layers | Rename, visibility, reordering, reparenting and instance restrictions. | Run mouse/keyboard/context-menu paths with nested and mixed selections. | Open |
| UI-08 Inspector states | Selection-specific properties, minimized panel and export controls. | Compare no/single/mixed/instance selections, all tabs, disabled controls and dimensions. | Open |
| UI-09 Canvas settings | Pixel grid, object/pixel snapping, wheel zoom/inversion and nudge amounts. | Persist settings; test movement and snapping against fixed reference geometry. | Open |
| UI-10 App preferences | Theme, animation and GPU settings. | Compare settings screens, restart persistence, visual changes and unsupported hardware handling. | Open |
| UI-11 Agent panel | Selection context, new conversation and focus-sensitive shortcuts. | Toggle panel while editing; ensure context and canvas history stay correct. | Open |

## Drawing and editing

Source: [Drawing and editing](https://docs.pen.dev/core-concepts/drawing-and-editing).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| DRAW-01 Shapes | Rectangle, ellipse and polygon creation; dimensions and corners. | Create/resize each type; compare inspector, rendered geometry and reopened values. | Open |
| DRAW-02 Scale | Anchor, factor/percentage, dimensions and proportional drag scale contents. | Scale nested text/strokes/corners/spacing/effects; verify anchor, variables, Fill conversion and instance overrides. | Open |
| DRAW-03 Path construction | Open/closed paths, curves, cut and smooth/corner points. | Draw and edit a path through UI; Undo/Redo and compare exported geometry. | Open |
| DRAW-04 Text geometry | Auto width, auto height and fixed boxes. | Use multiline text; compare wrapping, overflow, resizing and saved text metrics. | Open |
| DRAW-05 Typography | Font family/weight/size, line/letter spacing and alignment. | Compare picker and numeric controls using the same installed font and text. | Open |
| DRAW-06 Custom fonts | Document-scoped TTF/OTF/WOFF/WOFF2 import and missing-font recovery. | Import each format, reopen, move resources and recover a missing-font fixture. | Open |
| DRAW-07 Icons | Library/search picker, fill and size. | Create and reopen symbols from every advertised family; compare glyphs and picker states. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| DRAW-08 Paint rows | Multiple fills, visibility, removal and object opacity. | Reorder/edit/hide paints; compare compositing, Undo and serialization. | Partial |
| DRAW-09 Gradients | Linear, radial, angular and mesh editing. | Move stops/handles/mesh points, change grid/colors and compare render after reopen. | Partial — [evidence](../PAINT-PARITY.md); nested stop editing and one-stop rendering checked; Mesh and full menu/layout parity remain open. |
| DRAW-10 Image fills | Imported/path/URL images; Fill, Fit and Stretch. | Use contrasting aspect ratios; compare crops, missing images and network errors. | Open |
| DRAW-11 Strokes and blends | Width, Inside/Center/Outside and paint blend modes. | Compare edges and overlapping colors at several zoom levels and export sizes. | Partial |
| DRAW-12 Shaders | File/URL fills, editable inputs, gallery and shader effects. | Load an independent shader; edit inputs, resize, handle errors and reopen. | Open |
| DRAW-13 Effects | Drop/inner shadow, layer/background blur and ordered effects. | Compare every control, compositing, clipping and exported appearance. | Partial |
| DRAW-14 Background removal | Image operation produces a transparent cutout. | Use an independently authorized provider; inspect alpha, Undo and failure preservation. | Open |
| DRAW-15 Vectorization | Separate editable-vector frame retains the original image. | Run real conversion; edit resulting points and verify original, Undo and errors. | Open |

## AI agents and Skills

Source: [AI agents and Skills](https://docs.pen.dev/core-concepts/ai-agents).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| AI-01 Conversation history | New, previous and removable sessions; tool activity. | Switch sessions after real edits; verify history, canvas targeting and persisted state. | Open |
| AI-02 Model and effort | Provider model/effort selection; context-loss warning. | Change models/providers; verify warning, selected runtime and conversation behavior. | Open |
| AI-03 Interruptions | Stopping retains completed changes; background completion alerts. | Interrupt a real multi-step request; inspect retained edits and notification setting. | Open |
| AI-04 Context attachments | Canvas selection, image/text/source-file picker and drops. | Send each context type; verify displayed attachments and provider receipt. | Open |
| AI-05 Permissions | Allow/Deny; supported Claude Auto mode with persistent preference. | Use harmless permission requests; verify denial, allowed scope and unsupported-model error. | Open |
| AI-06 Usage | Context/token breakdown and API-rate cost estimates. | Compare displayed usage with provider results; label estimates and expand response details. | Open |
| AI-07 Skills | Slash selection; import/reload/remove SKILL.md without deleting files. | Use an independent temporary skill; verify request instructions and disk preservation. | Open |
| AI-08 Parallel agents | One to six; Split Work/Side by Side; per-agent model/reset. | Run explicitly authorized synthetic tasks; inspect separate conversations and resulting frames. | Open |
| AI-09 Iterations | Layout/Style alternatives; two to six variants or one design. | Verify variant count, preserved constraints, current/all stop and partial failures. | Open |
| AI-10 Tool failures | Details and retry retain the current canvas. | Inject a harmless failing tool; inspect error, retry and duplicate-edit prevention. | Open |

## Variables

Source: [Variables](https://docs.pen.dev/core-concepts/variables).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| VAR-01 Variable lifecycle | Color/Number/String/Boolean; create, rename, duplicate and delete. | Bind each type; rename/duplicate/delete and compare dependent nodes and history. | Open |
| VAR-02 Typed bindings | Compatible property selection and live propagation. | Bind geometry, colors, text and flags; edit values and reopen. | Open |
| VAR-03 Themes | Axes/modes, default first value, frame inheritance and overrides. | Use two axes and nested frames; switch/remove overrides and compare resolved values. | Open |
| VAR-04 Aliases | Same-type variable references and diagnostics. | Resolve chains, missing aliases and cycles without silent wrong values. | Open |
| VAR-05 Imported tokens | CSS/manual/Figma reference import; AI-mediated CSS synchronization. | Review actual token values and resulting CSS/design changes, including rename conflicts. | Open |
| VAR-06 Library variables | Saved source changes load when dependents reopen. | Update a synthetic library; reopen consumer and verify overrides still win. | Open |

## Components

Source: [Components](https://docs.pen.dev/core-concepts/components).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| COMP-01 Origins | Create components from ordinary nodes; nested origins. | Compare shortcut/button paths, magenta selection and serialization. | Open |
| COMP-02 Insertion | Copy origin or click/drag searched component to create instance. | Verify violet selection and stable origin identity after save/reopen. | Open |
| COMP-03 Overrides | Instance properties override selected origin properties. | Override text; change origin text and font size; only non-overridden property propagates. | Open |
| COMP-04 Navigation | Local Go to component; imported source through Libraries. | Navigate both origins and preserve the consumer document. | Open |
| COMP-05 Detach | Detach outer instance preserves nested links and variables. | Detach, edit, Undo/Redo and reopen; inspect all remaining references. | Open |
| COMP-06 Inherited structure | Instance descendants restrict arbitrary reparenting. | Attempt invalid move; then insert content through an allowed slot. | Open |

## Slots

Source: [Slots](https://docs.pen.dev/core-concepts/slots).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| SLOT-01 Slot creation | Only an empty frame inside an origin qualifies; diagonal canvas marker. | Compare eligible/ineligible selections and resulting appearance. | Open |
| SLOT-02 Suggestions | Choose same-document reusable components as suggestions. | Add/remove suggestions; save/reopen and inspect suggested picker. | Open |
| SLOT-03 Instance content | Drop/paste/one-click suggestion inserts instance-owned content. | Use suggested and arbitrary content in two instances; verify independent content and Undo. | Open |

## Code on Canvas

Source: [Code on Canvas](https://docs.pen.dev/core-concepts/code-on-canvas).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| SCRIPT-01 Creation and linkage | Script primitive starts at 200×200; relative JS path. | Create, save, link an independent file; compare placeholder and missing-path states. | Partial — [Script evidence](../SCRIPT-PARITY.md). |
| SCRIPT-02 Input controls | Header schema plus number/string/boolean/color/enum/ref controls. | Change each input; verify clamp/options/component selection and refreshed output. | Partial — [Script evidence](../SCRIPT-PARITY.md). |
| SCRIPT-03 Live updates | Resize, input edits and watched source saves rerun output. | Edit an independent file externally; inspect live children without reopening. | Partial — [Script evidence](../SCRIPT-PARITY.md). |
| SCRIPT-04 Variable inputs | Inputs can follow variables and theme changes. | Bind color/number inputs; change theme and reopen with source file present. | Open |
| SCRIPT-05 Conversion | Convert replaces Script with a frame snapshot of editable layers. | Convert, manually edit children, Undo/Redo, save/reopen. | Partial — [Script evidence](../SCRIPT-PARITY.md). |
| SCRIPT-06 Derived state | Generated children do not create individual history entries. | Change inputs repeatedly; compare Undo granularity and regenerated children. | Partial — [Script evidence](../SCRIPT-PARITY.md). |
| SCRIPT-07 Sandbox contract | Synchronous; no DOM/network/filesystem; deterministic random sequence. | Run isolated denied-API, random and asynchronous fixtures without host access. | Partial — [Script evidence](../SCRIPT-PARITY.md). |
| SCRIPT-08 Limits and diagnostics | At most 1,000 generated nodes, two-second execution; no reusable output. | Exceed each limit; verify safe termination, node error/excerpt and intact document. | Partial — [Script evidence](../SCRIPT-PARITY.md). |
| SCRIPT-09 Gallery workflow | Reference examples can seed a local linked script. | Use an original example; compare browsing, saving, linking and error states. | Partial — [evidence](../SCRIPT-PARITY.md); Eleven examples and the named Snapshot transfer are executed; other Goodies categories, exact artwork and native Snapshot acceptance remain open. |

## Design Libraries

Source: [Design Libraries](https://docs.pen.dev/core-concepts/design-libraries).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| LIB-01 Library conversion | Saved component document becomes .lib.pen; conversion is irreversible in Pen. | Use a synthetic copy; compare warning, suffix and cancel/success behavior. | Open |
| LIB-02 Library import | Local chooser plus default catalog; browse and search components. | Import two independent libraries; compare empty/loading/missing/populated states. | Open |
| LIB-03 Update propagation | Reopen consumers to load saved source edits; instance overrides win. | Change source and reopen consumer; verify all linked assets and overrides. | Open |
| LIB-04 Cross-document origin paste | Unimported library offers linked import or independent copies. | Exercise both decisions on synthetic destinations; verify resulting references. | Open |
| LIB-05 Variable conflicts | Use existing or add renamed on paste. | Paste conflicting typed/theme values; verify chosen resolution and Undo. | Open |
| LIB-06 Resource handling | Fonts need separate installation; image paths must remain resolvable. | Copy mixed content; compare missing-resource guidance and repaired rendering. | Open |

## Build a small design system

Source: [Build a small design system](https://docs.pen.dev/core-concepts/build-a-design-system).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| DS-01 Library acceptance journey | Themed components, variable typography/spacing, slot and consumer overrides. | Build an original button/card pair; insert into another document with two themes. | Open |
| DS-02 Source revision journey | Source color/font changes update consumers without losing labels. | Save library, reopen consumer; inspect both themes and unchanged instance text. | Open |
| DS-03 Relocation recovery | Missing library Locate reconnects the consumer. | Move synthetic source; locate it, save consumer and reopen successfully. | Open |

## Import & Export

Source: [Import & Export](https://docs.pen.dev/core-concepts/import-and-export).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| IO-01 Figma file import | Toolbar, desktop File menu and drop import complete .fig files. | Import a licensed synthetic fixture with images/components; compare editable result. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| IO-02 Figma clipboard | Individual copied layers; embedded image paste has a documented limitation. | Paste text/vectors/images separately; compare supported output and failure guidance. | Open |
| IO-03 Image/SVG input | PNG/JPEG become images; SVG becomes editable layers; picker/drop/clipboard. | Exercise every entry point with valid, malformed and missing-resource inputs. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| IO-04 Web import | Browser URL, device/zoom and element/page capture to editable layers. | Import a local fixture; compare fonts/layout/effects, with no promised JS interaction. | Partial — [native browser evidence](../BROWSER.md); bounded editable import, navigation, viewports, modes, closing/restoration and landing controls execute; history/zoom/picker/menu/responsive-layout and exact remaining states stay open. |
| IO-05 Screenshots | Selected element, visible area or full page. | Capture a scrolling local page; inspect dimensions, bounds and saved image. | Partial — [visible-area native capture/Undo](../BROWSER.md); selected-element/full-page capture and menu/delivery variants remain open. |
| IO-06 Icon families | Material Symbols Outlined/Rounded/Sharp, Lucide, Feather and Phosphor. | Search/insert one symbol per family and reopen without substituted glyphs. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| IO-07 HTML output | HTML+Tailwind or HTML+CSS; copy/export and asset/scaffold settings. | Open generated output locally; inspect assets, scaffold and visual agreement. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| IO-08 Raster output | PNG/JPEG/WEBP at 1×/2×/3×; multiple selections produce ZIP. | Inspect real files, dimensions, alpha, format signatures, filenames and ZIP contents. | Open |
| IO-09 PDF output | Selected layers become pages in selection order. | Export unequal frames; inspect order, page dimensions and rendering. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| IO-10 Clipboard PNG | Selection context-menu image copy. | Paste into an independent image consumer and compare bounds/transparency. | Open |

## Share a design

Source: [Share a design](https://docs.pen.dev/core-concepts/sharing).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| SHARE-01 Snapshot publication | Upload design plus images and imported libraries; viewers can download. | Use an independent service with explicit publication; verify dependency inventory and browser view. | Open |
| SHARE-02 Missing dependencies | Cancel or continue with incomplete snapshot. | Share a synthetic missing-image fixture; compare warnings and repair/retry. | Open |
| SHARE-03 Background upload | Dialog may close while upload continues in running app. | Close/reopen dialog during controlled upload; verify progress and completion. | Open |
| SHARE-04 Snapshot updates | Same link receives edited snapshot; copied-file location warning. | Update a disposable share and verify browser reload and wrong-copy warning. | Open |
| SHARE-05 Failure retry | Upload/download failures offer retry and incomplete-state guidance. | Interrupt a controlled transfer; retry without publishing an unexpected document. | Open |
| SHARE-06 Revocation and download | Confirmed link deletion; ZIP download is an independent copy. | Revoke disposable link; verify inaccessible link and intact prior download. | Open |

## Slides and presentations

Source: [Slides and presentations](https://docs.pen.dev/core-concepts/presentations).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| SLIDE-01 Slide enumeration/order | Visible top-level frames; draggable thumbnail ordering. | Compare hidden/nested frames, selection and persisted order. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| SLIDE-02 Presenter | Start from selected slide; arrows/Space/Enter advance; Escape returns. | Run native presentation, compare active slide and focus when returning. | Open |
| SLIDE-03 Slide PDF | All/selected slides; slide order and individual frame dimensions. | Open actual PDF; inspect pages, order, sizes and selected-only errors. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |

## Keyboard Shortcuts

Source: [Keyboard Shortcuts](https://docs.pen.dev/core-concepts/keyboard-shortcuts).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| KEY-01 Chat and tool keys | Chat toggles/tabs/history and drawing-tool shortcuts. | Compare every binding in shortcuts.md with canvas and composer focus. | Open |
| KEY-02 Edit/arrange/select keys | Clipboard, duplicate, grouping, alignment, stacking and hierarchy. | Execute each binding on an original nested fixture; compare result and Undo. | Open |
| KEY-03 Component/navigation keys | Component/detach/replace; pan, fit and pointer zoom. | Compare origin/instance and all navigation modes with installed Pen. | Open |
| KEY-04 Path keys | Point/segment/handle selection, connection, cuts and curve manipulation. | Exercise every path binding on a small open/closed path fixture. | Open |
| KEY-05 Settings/file keys | Pixel grid/snapping and dashboard/new/open/Save/Save As. | Verify native menu equivalents, focus handling and persisted output. | Open |

## Design ↔ Code

Source: [Design ↔ Code](https://docs.pen.dev/design-and-code/design-to-code).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| CODE-01 Design to application code | Agent generates components/pages using the requested stack and library. | Generate from an original design; run resulting app and compare structure/style. | Open |
| CODE-02 Code to design | Agent reads workspace source and recreates editable layers. | Use a local original component; verify hierarchy, geometry and appearance. | Open |
| CODE-03 Requested synchronization | Agent applies requested changes; no automatic bidirectional-sync promise. | Change each side in turn, request update and inspect both files and diffs. | Open |
| CODE-04 Token exchange | Agent copies variables between CSS and design. | Round-trip typed tokens/themes; inspect names, values and unrelated file preservation. | Open |
| CODE-05 Workspace and stack context | Design and source share accessible workspace; framework/icon preferences guide output. | Generate two distinct requested stacks and confirm actual dependencies and runnable output. | Open |

## The .pen Format

Source: [The .pen Format](https://docs.pen.dev/for-developers/the-pen-format).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| FMT-01 Version and parsing | Published schema says 2.21; JSON comments and supported-version conversion. | Open versioned/commented fixtures; reject unsupported content before destructive save. | Open |
| FMT-02 Entity tree | Unique IDs without slash; nested coordinates, transforms and enabled/context metadata. | Round-trip every entity kind and common property; compare data and rendered placement. | Open |
| FMT-03 Layout serialization | Flex, padding forms, distributed alignment, dynamic sizes/fallbacks and absolute position. | Round-trip variable-bound layout; compare resolved geometry and authored sizing. | Partial — [evidence](../ACCEPTANCE.md); Earlier executed paths are narrower than this entire requirement; see acceptance log. |
| FMT-04 Graphics serialization | Ordered paints/effects, gradients/mesh/images/shaders and stroke geometry. | Round-trip every paint/effect variant; compare values, order and rendered output. | Open |
| FMT-05 Text and primitive fields | Typography/growth, ellipse arc/ring, polygon, path/viewBox and icon fields. | Build one fixture per schema variant; compare inspector, save and reopened result. | Open |
| FMT-06 Reference semantics | Reusable/ref, nested ID-path overrides, full-node and children replacement. | Exercise nested overrides/replacements without duplicate IDs or broken origin propagation. | Open |
| FMT-07 Variables/themes/imports | Typed values/aliases, last matching theme value, default first axis value, relative library aliases. | Resolve multi-axis aliases across imports; save/reopen and compare fallback behavior. | Open |
| FMT-08 Special node kinds | Note, Prompt, Context, Script and live Browser nodes. | Round-trip each type and all fields; compare editing/rendering and resource errors. | Partial — [evidence](../ACCEPTANCE.md); Context round trip executed; other special nodes remain open. |

## pen.dev CLI

Source: [pen.dev CLI](https://docs.pen.dev/for-developers/pen-cli).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| CLI-01 Command surface | Version/status/help, provider login commands, interactive and model listing. | Compare help/schema against command-contract.md; run supported independent equivalents. | Open |
| CLI-02 Agent documents | Input/output, prompt, repeatable attachments, agent/model/effort and working directory. | Run real CLI provider on a synthetic design; inspect saved output and selected runtime. | Open |
| CLI-03 Diagnostics and usage | Usage JSON, preview, verbose/MCP errors and failed-call limit. | Trigger success/failure; inspect outputs, redaction and termination. | Open |
| CLI-04 Export | PNG/JPEG/WEBP/PDF with explicit type and scale. | Check exit status plus actual file signature/dimensions/pages; never trust status alone. | Open |
| CLI-05 Interactive headless | Tool calls on a local editor; explicit save before exit. | Create/modify/export/save, exit and reopen output through desktop. | Open |
| CLI-06 Interactive app connection | Connect to running app and confirm document state before mutations. | Use two open synthetic documents; prove only the intended file changes. | Open |
| CLI-07 Tool parity | execute, get_app_state, read_skill, get_style; desktop browser and opt-in agents. | Compare names, arguments, results, errors and availability to real Pen. | Open |
| CLI-08 Batch behavior | Docs warn tasks exits after first successful task. | Record intentional behavior; run each required independent task without silent omission. | Open |
| CLI-09 Environment/account boundary | Vendor keys/workspaces differ from independent local/provider configuration. | Document supported variables and precedence; local operations must have no vendor entitlement gate. | Open |

## Troubleshooting

Source: [Troubleshooting](https://docs.pen.dev/troubleshooting).

| ID / feature | Required behavior | Observable acceptance | State |
| --- | --- | --- | --- |
| ERR-01 Setup diagnostics | Missing IDE visual mode/icon/command and CLI PATH/runtime failures. | Reproduce isolated setup errors; confirm actionable recovery and version reporting. | Open |
| ERR-02 Provider diagnostics | Missing model/login/config refresh and safe retry. | Test disconnected/expired/mock provider failures; retain document and avoid credential disclosure. | Open |
| ERR-03 MCP diagnostics | Missing tools, connection errors and client config enable/disable. | Inspect live tool list, minimal failing call and restored independent configuration. | Open |
| ERR-04 Save/recovery diagnostics | Unsaved original versus backup; recovered-change review. | Compare disk bytes before/after Save and recovery; preserve unrelated recovery snapshots. | Open |
| ERR-05 Import/font diagnostics | Figma image clipboard limit and missing resources/fonts. | Provide accurate recovery route while keeping existing design intact. | Open |
| ERR-06 CLI output diagnostics | Export may report failure despite successful exit in reference. | Verify expected file content, errors and safe retry; independent CLI should fail clearly. | Open |
| ERR-07 Support evidence | Exact version, repro, sanitized logs and minimal fixtures. | Produce a redacted diagnostic report without private designs or credentials. | Open |

## Coverage limits

The inventory contains 152 requirements across 23 chapter pages plus the documentation landing page. It covers documented features; it cannot prove discovery of undocumented or account/OS-specific behavior. Every native surface still requires direct comparison. The private HTML cache is research evidence, not shipped documentation or production code.

Re-entry: compare the remaining paint/inspector states, then the first open inspector/menu state in the native ledger. Keep this catalog and its JSON in the same change when requirements or acceptance evidence change.
