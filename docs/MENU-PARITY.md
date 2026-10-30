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
