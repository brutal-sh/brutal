# Menu and panel parity observations

Target: installed `/Applications/Pen.app` 1.2.21. The user explicitly rejected menus that only approximate Pen. These observations were made through the running app's accessibility tree and screenshots on 2026-10-30. No document contents were edited. Browser Coding Mode and Agent selection were restored after panel inspection.

## Observed application menus

The top-left brand popup is **not** a File/Edit menubar. It contains, in order:

1. Follow @pendev on X
2. Get support on Discord
3. Our Youtube Channel
4. Open pen.dev website
5. Separator
6. Toggle Light/Dark mode
7. Show/Hide UI — displayed shortcut `⌘\\`
8. Separator
9. 'pen' CLI docs

It is a vertical rounded popup below the brand, approximately216 CSS pixels wide with24-pixel rows in the observed Retina window. Open Pen's identity and support destinations must remain truthful; this is a visual/action placement reference, not authorization to impersonate the vendor.

The native File menu has this observed order:

- New File
- Open…
- Open Recent → recent document entries, Clear Recent Files
- Home
- Import Image/SVG/Figma…
- Export Selection to… → PDF, PNG, JPEG, WebP
- Export Snapshot…
- Guide: How to Export Design to Code…
- Guide: How to Import from Figma…
- Install 'pen' CLI…
- Save
- Save As…
- Close Tab

Native menu screenshots were unavailable from the app-target capture. Exact separators and shortcut text need further observation; accessibility exposed item order but not those details. The document tab's New tooltip separately reports `⌘⇧N`.

The native Edit menu has Undo, Redo, Cut, Copy, Paste, Delete, Select All, then macOS AutoFill (Contact…, Passwords…, Credit Card…), Start Dictation…, Emoji & Symbols. The native View menu has Show/Hide UI, Agent Chat Text Size → Small/Medium/Large, Toggle Full Screen.

## Observed panel behavior

- Layers shows the layer tree directly beneath its mode tabs. It has no Pages pane or duplicate Layers heading in the observed single-page document.
- The separate bottom composer remains visible when switching from Agent to Layers.
- Find layers opens a floating panel at the canvas upper right, below the action pill, approximately280 CSS pixels wide. It autofocuses a field labeled Find layers and has Close. Its empty prompt says it searches names, text, and IDs.
- The Browser toolbar has element picker, Back, Forward, Reload, address/history/viewport group, Import, Screenshot menu, Coding Mode, More options and Close Browser View. Coding Mode expands the browser over the canvas while retaining the left sidebar.

## Open acceptance

Current Open Pen menus are not accepted as1:1. Native menu order/labels/actions, brand popup, tool flyouts, selection context menus, browser menus, inspector menus, focus/dismissal and exact typography all require independent executed comparison. Missing actions remain gaps; disabled or decorative substitutes do not count as implementation.

## User close-ups, 2026-10-30

The supplied toolbar and Move menu close-ups are retained privately in ignored `local-evidence/pen-toolbar-reference.png` and `local-evidence/pen-move-menu-reference.png`. They supersede approximate toolbar styling:36 CSS-pixel capsule rail, circular selected Move control with a subtle outline, circular sidebar and ellipsis controls, compact caret beneath Move and Rectangle only, and a right-opening Move/Scale flyout. The flyout shows Move (V), Scale (K), a selected check, icons, and approximately28-pixel rows/14-pixel text. Scale needs real content scaling; merely adding a menu item is insufficient.

## Live panel audit, 2026-10-30

Layers, Slides, Components and Libraries were opened in the installed Pen application. Private captures: `pen-layers-audit.png`, `pen-slides-audit.png`, `pen-components-audit.png` under ignored local-evidence. Slides shows numbered large previews with a Present footer and Export PDF menu: all slides / selected slides (disabled at zero). Components has search, full-width Create Component, selection hint and two-column previews. Libraries is an inline tab with imported libraries, bundled library cards and a footer to turn the current file into a library. Open Pen’s modal-only Libraries and existing Components layout remain mismatches. Slides implementation is under active correction; no full-parity claim.

## Continued live inspection and implementation

The current default inspector has no Design/Code/Lint tab row in Pen. Open Pen's code/check tools now use Commands and a return action; Status, presets, constraints and guides remain available through Advanced properties. Native Context/name Save→Recents→reopen was executed. Compact layout and native delivered state comparison remain open.

The reference Script item selects a tool; creating it makes a default200×200 Script node, with Context/position/dimensions, script file path picker, Convert to layers, effects and exports. Script Gallery opens Goodies→Scripts, listing Candlestick, Chart, Circle Text, Circular Visualizer, Clock, Digital Spectrum, Digital Time, Flow Field, Gauge, Lines and Radar. These behaviors require an independent implementation; adding an inert Script entry does not satisfy them. Inspection used a separate audit document; original user designs were not edited.

Primitives Icon and separate Image/SVG/Figma chooser entries now execute existing insertion pipelines in Open Pen; browser import and one-step Undo passed. Exact remaining order, extra tools and native delivery remain open. The reference File/Edit/View menu inventory was re-observed; missing Snapshot/guides/CLI and Agent Chat Text Size remain gaps.

2026-10-30 installed continuation: compact inspector and Primitives Icon action are delivered in the normal debug app. Real Lucide search/insertion and Undo executed. Focused Clip checkbox supports both native Cmd+Z and native Edit→Undo. Native HTML settings output with names/IDs/centering was saved and inspected. Reference root Fill Width writes `fill_container(350)` while geometry stays350×225; Open Pen still disables this deferred intent and requires a persistence/layout correction. Reference Script, snapshot dependencies and native guides remain open; menu presence is not functional acceptance.

## Native View text-size continuation — 2026-10-31

The installed Pen View menu was re-opened: Show/Hide UI, Agent Chat Text Size→Small/Medium/Large, separator, Toggle Full Screen. Keyboard navigation exposed the submenu. Its screenshot is unavailable through the native menu surface; no option was activated and the user’s preference was not changed. The1.2.21 bundle’s declarative menu/settings metadata defines Small as the default and three exclusive choices. Design-style extraction gives transcript-only scales1,1.075 and1.15 for its9/10/11/12/14/16px type levels. These are extracted design facts, not runtime font-size acceptance. No proprietary implementation is included in Open Pen.

Active unit: add the three menu choices, one stored preference shared with Settings, mutually exclusive native check synchronization and transcript-only type scaling. Preserve composer/icon/canvas geometry, existing reasoning/preview preferences and drafts. Done evidence requires actual menu→rendered text changes, persistence after reload and native menu delivery; implementation alone does not close the gap. Snapshot/guides/CLI commands and other menu states remain to inspect and implement.

Executed Open Pen evidence:18 browser workflows cover View choices, actual assistant paragraphs/table cells, unchanged composer font size, same-choice selection, retained preference after reload, Markdown themes/security and existing menu actions.27 preference/menu/import/export model tests passed. The isolated native Tauri test configures a synthetic model with a local transport, renders real user/assistant text, changes Medium/Large through Settings, checks all three native menu values and reloads→Home→new document→fresh transcript at the retained size. No provider request or real credential is used. A separate bundled incognito test accepted two actual macOS View→Agent Chat Text Size→Large selections, including reselecting the active choice; both delivered native menu events and retained Large=true, Small/Medium=false with expected rendered paragraph font size. Private logs: `chat-text-size-final-browser.log`, `chat-text-size-final-model.log`, `chat-text-size-native-accepted.log`, `chat-text-size-physical-native-menu.log`.

The review found and corrected two defects before acceptance: native check-item auto-toggling on a same-value choice, and fixed font sizes inside nested Markdown. This establishes the stated text-size workflows only; exact Pen/Open Pen screenshot typography, every transcript/portal surface, full settings design and overall menu parity remain open. The normal candidate is built separately; the installed main profile remains on its earlier build while the pending file-open question is unresolved.

## Snapshot export observed — 2026-10-31

Actual Pen File→Export Snapshot opens a modal explaining that the result is a self-contained ZIP of the design and referenced dependencies. On the synthetic shader reference it shows a Dependencies group with an expandable “3 shaders” row. Expanding lists each filename and source folder; Cancel, Export Snapshot and Close are available. Export Snapshot opens the native Save panel with a default `<document>-snapshot.zip` filename.

The local export was executed into ignored evidence storage. ZIP directory inspection found `pen-shader-reference.pen` at the archive root and three dependencies under `shaders/`: `shader-uniform-reference.glsl`, `shader-alpha-reference.glsl`, `shader-time-reference.glsl`. No archive document content was parsed by terminal tools. This confirms the dialog→native save→archive-content path for this synthetic fixture only. Dependency rewriting, unavailable files, duplicate basenames, other dependency types, reopening after relocation, cancellation and Open Pen’s independent implementation remain open. Archive and proprietary reference material remain private and untracked.

Open Pen now implements a supported-content snapshot workflow with native/browser File actions, measured modal geometry, original-reference dependency preview, safe generated archive paths, image/GLSL packaging and existing save delivery. Final19 browser workflows,82 Pen-format/menu model checks and five native regressions passed. Actual native File→Save-panel Cancel→retry Save→extract elsewhere→original source unavailable→native Open→expected GLSL pixels→edit→Undo/clean state was executed twice, including the final candidate. This closes that one native GLSL archive journey, not all dependencies or exact typography. See SNAPSHOT-PARITY.md for limits and retained failures. Guides/CLI remain the next native File actions to inspect and implement.

Next File audit: the design-to-code guide opens a large in-app modal, not a website. It shows a CLI/MCP status badge group, terminal steps, three example prompts and an illustration. The actual reference displays seven green client badges; this is a reference UI observation, not evidence that Open Pen has those integrations. The Figma-guide command was activated but produced no visible guide in the current reference window; its intended in-app dispatch is present in the extracted native menu metadata. The Install 'pen' CLI item is a link to the official CLI documentation according to that metadata; no vendor CLI installer was executed. Private design-to-code capture: `pen-export-code-guide-reference.png`. Independent guide content and actual bridge status must be truthful.

Guide continuation2026-10-31: the Figma action was rechecked visually and is a nonmodal informational toast; accessibility-only observation had missed it. Open Pen now has independent native/browser/palette guide actions and its own CLI documentation link in the measured File order. Actual macOS File actions were delivered from Home in the separate test app. The code dialog shows local-server health, not invented client integrations. The native display revealed and corrected a stale port0 endpoint after route resolution. F9 keyboard access avoids collision with main notifications. See GUIDES-PARITY.md for executed journeys, failed fixture probes and remaining visual/client/CLI gaps. The main installed profile remains untouched.

Window/Help audit2026-10-31: actual Window contains Minimize, Zoom, Toggle Light/Dark Mode, Show Previous Tab, Show Next Tab, Move Tab Left, Move Tab Right, Bring All to Front and a system Window entry. Declarative shortcut facts: macOS previous/next use Cmd+Shift+[ / ], move left/right use Ctrl+Shift+PageUp / PageDown. Native previous→next and last→next→previous were executed without editing: last wraps to the first document, excluding Home, then returns to pen-shader-reference.pen. Home is a separate toggle. Existing Open Pen Ctrl+Tab navigation includes its pinned Home; a Window document-navigation action must not silently reuse that behavior.

Actual Help exposes the macOS search field and feedback-to-Apple item, then Pen Documentation, Prompt Gallery & Tips, pen.dev Website, Cursor Extension, VSCode Extension and Join Our Discord. Open Pen’s Help menu remains open. System window commands should use native predefined roles; independent documentation/support destinations and real IDE integration must remain truthful. No reference document was edited by these observations.

Window continuation: reference Home→Next selects the first document and Home→Previous selects the last. Last-document Move Right is a no-op; Move Left then Right changes and restores the synthetic shader reference’s tab position without editing it. Open Pen now has source/model coverage for document-only wrap and Home/boundary-safe reordering, with active-store preservation and active-tab scrolling. The first isolated physical Window run passed document navigation/reorder, Home exit, light/dark restore, native Zoom/restore and Minimize in139.2s. Bring All to Front was activated while the test window was already in front; hidden/multiple-window behavior is not established.

The first native layout check also rejected extra OS resize/tiling/alternate items inserted by registering NSApp’s standard Window menu. Pen’s observed menu instead ends with an explicit Window item. The candidate removes that registration and uses the existing native main-window reveal helper for the explicit item. The final native accessibility inventory has the same nine labels in order, without extra system resize/tiling items. A separate physical Minimize→Window test restored the unminimized state with document name, dirty state and selection preserved (`window-final-native-restore.log`,35.3s). Screenshot typography, hidden/multiple-window behavior and every OS state remain open. Full workspace cargo-fmt checking reports unrelated pre-existing formatting differences; only owned menu Rust files are formatted in this unit.

Actual Pen Cmd+1 selects its first document and Cmd+9 its last, excluding Home. The independent desktop adapter reserves Cmd/Ctrl+1…8 for those document indices and9 for the last; unavailable indices do nothing. Existing browser zoom aliases are unchanged, while Shift+1/2 remain desktop fit/selection zoom.26 model checks/73 assertions passed. The final isolated native workflow covers numbered navigation, absent index, Home exit, focused inspector input, retained selection/name/zoom and both Shift zoom actions (`window-shortcuts-native-final.log`). Physical Cmd+Shift+[ / ], Ctrl+Shift+PageUp / PageDown delivered previous/next and tab movement with assertions after each (`window-keyboard-physical.log`,30s). Source review found no concrete defect; it is not runtime proof beyond those named paths. Source/Vue/test/native types and architecture passed. Help remains the next menu unit.

## Native Help continuation — 2026-10-31

The independent six-position Help catalog now reaches this fork’s README, prompt gallery, repository, Cursor setup, VS Code setup and support. The IDE labels deliberately say Setup: visual `.pen` extensions remain unimplemented. Prompt examples and authenticated local MCP setup instructions are new documentation, with official Cursor/VS Code references and explicit client-runtime limits. The repository’s actual default branch resolves to `feat/open-pen`, so the HEAD links target the maintained fork.

Executed: all five browser guide/Help workflows passed, including six outbound destinations with preserved selection. The isolated native guide/event/Home tests and numbered-tab regression passed together (three tests across two specs). The first combined run exposed inherited test documents; the numbered fixture now reloads with the established `performance.timeOrigin` guard before creating its own sequence. No product workaround or timeout increase was added.

Physical macOS Help→each of six actions→native URL recording→Home retained→return to document→original selection/dirty state passed (`help-physical-native-final.log`,58.8s). The initial physical run reached all six URLs but failed its final test locator: document tabs have text names, not an `aria-label`; the ignored fixture was corrected. First native observation also caught stripped literal ampersands. The shared native menu boundaries now escape them once, including recent filenames; final Prompt Gallery & Tips and Support & Feedback labels retain the ampersands. Source review found no concrete defect.

Search remains OPEN: default Help naming exposed no search field; explicit AppKit Help registration added the system feedback item but still exposed no search field. A minimal separate Swift/AppKit app reproduced this with a registered Help menu, explicit NSHelpManager initialization, and an explicit public NSUserInterfaceItemSearching provider. No speculative custom search implementation was added to the product. Private observations: `help-final-native-menu.txt`, `help-appkit-probe.txt`, `help-appkit-search-provider-probe.txt`. Official contract: [Tauri Help registration](https://tauri.app/reference/javascript/api/namespacemenu/), [Apple helpMenu](https://developer.apple.com/documentation/appkit/nsapplication/helpmenu). These diagnostics narrow the layer; they do not establish the cause or full native Help parity.

Remaining Help acceptance: actual search field/results/keyboard behavior, exact typography, real Cursor/VS Code authenticated tool journeys and visual IDE extension equivalents. No external client configuration, account state, main installed app or recovery data was modified.
