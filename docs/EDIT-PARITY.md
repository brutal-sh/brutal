# Native Edit parity

Target: installed `/Applications/Pen.app`1.2.21. Open Pen’s independent command and text-input implementation must reproduce the observed focus behavior without changing unrelated layers, clipboard contents or credentials.

## Actual reference

The native Edit inventory is Undo, Redo, Cut, Copy, Paste, Delete, Select All, then macOS AutoFill (Contact…, Passwords…, Credit Card…), Start Dictation… and Emoji & Symbols. Private inventory: `local-evidence/pen-edit-native-reference.txt`. Availability and platform-service activation remain separate checks.

A disposable native New File received one frame (`context: "abcdef"`) and one child text node (`Edit text sample`) through Pen’s supported MCP API. No prior user design was edited. On the Context field, selecting `bcd` and choosing native Edit → Delete left `aef` in the field. The serialized Context remained `abcdef` until the field lost focus, then became `aef`; native Edit → Undo restored `abcdef`.

Entering canvas text editing, selecting `text` and choosing native Delete left `Edit  sample` and retained the text node. Native Undo restored the original content. The fixture was saved as private ignored `pen-edit-focus-reference.pen`, verified through MCP, then closed; the prior `pen-shader-reference.pen` tab is active again. Private field observations: `pen-edit-delete-context.txt`, `pen-edit-delete-canvas-text.txt`.

## Independent implementation under verification

The initial browser regressions reproduced an ignored field deletion and canvas dispatch of a whole-layer deletion command. Routing ordinary fields through the browser’s native editing command preserves their own Undo history. The canvas uses an empty input buffer, so the browser deletion command alone does not update its text model. The focused menu action now routes a scoped input request to the existing canvas deletion routine, which preserves style-run/paragraph updates and text-edit history. The existing composition guard is retained.

Real Done criterion: actual Open Pen native Edit menu deletes the selected field/canvas text range, the node and unrelated state survive, leaving the field commits correctly, and Undo restores the original value/content. Browser tests, source tracing and native event emission alone do not close that criterion. Native Edit inventory, OS services, composition, disabled/read-only and all remaining focus states stay open until executed and compared.

Interim verification:12 Chromium/WebKit focused-command workflows pass, including native field Undo, composition-guard simulation, selected canvas text deletion, unchanged layer identity and browser Edit→Undo. The first canvas Delete correction exposed that Undo grouped the menu action with preceding typing; the existing text-step checkpoint now separates them. Browser keyboard Undo while the hidden canvas input has focus remains a separate observed gap; the native OS accelerator has not yet been checked.

Native Context Delete→blur→Undo passed. Native key simulation did not create the intended canvas range: an explicit precondition check found an empty selection. The permanent fixture now uses the existing text model’s `selectWord` action and asserts the word before sending the menu event. Both native event workflows pass, including real WebView typing before canvas Delete and native Undo/Redo. This is text-model fixture preparation, not evidence of native keyboard selection. Physical macOS menu clicks remain the next gate.

## Executed native journey

The final bundled native test passed four Edit/guide tests across two specs. A separate actual macOS Edit-menu run passed in81.3s (`edit-delete-physical-native.log`): Context selected range→Delete→field blur→Undo restored `abcdef` and kept the layer selected. Real Cmd+A, Left/Right and Shift+Right selected `text` in freshly typed `Edit text sample`; a model probe confirmed that precondition before the next action. Native Edit→Delete produced `Edit  sample`, Undo restored the full typed text, Redo reapplied only deletion, and physical Cmd+Z restored it again. The same text-node ID survived and the document still contained one text node. This qualifies that native keyboard/range/accelerator case; the failed WebDriver key simulation does not refute it.

Twelve Chromium/WebKit focused-command workflows and28 text/history/paragraph model tests (105 assertions) passed. Package metadata/exports/contents/Publint/ATTW passed. Source review found no concrete defect in event scoping, composition guard, read-only session cleanup or history checkpointing; this is source review, not runtime proof for every such state.

Retained failures: `edit-delete-before.log` and `edit-delete-canvas-before.log` reproduce the original routes. `edit-delete-browser.log` shows the ineffective canvas browser-command approach and initially missing Playwright WebKit runtime (subsequently installed). `edit-delete-browser-final.log` exposes combined typing/deletion Undo; `edit-delete-browser-accepted.log` also has a test locator error because the Undo menu’s accessible name includes its shortcut. Corrected final browser result: `edit-delete-browser-separated-undo.log`. `edit-delete-native-selection-probe.log` establishes the empty simulated key selection; `edit-delete-native-final.log` uses the explicit model fixture for its four passing tests.

Remaining: browser-only canvas keyboard Undo, all native Edit OS services and inventory differences, other native selection/caret/Unicode/IME/read-only/disabled states, exact menus and overall product parity. The installed main app and recovery data remain unchanged; this acceptance uses the separately identified incognito native-test bundle.

Source/Vue/test/native types, full lint (existing warnings), architecture, test placement/changelog, normal frontend/native bundle, deep strict signature and native-driver exclusion passed for this unit. The normal candidate was not installed over the stalled main profile.
