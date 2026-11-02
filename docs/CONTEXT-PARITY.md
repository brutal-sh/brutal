# Context inspector parity

Target: installed `/Applications/Pen.app`1.2.21. Reference observations use an owned disposable rectangle in the diagnostic fixture, native accessibility/screenshots and the private resource archive described in [reference provenance](PEN-REFERENCE.md). Proprietary source and reference images are not shipped. Full inspector and whole-product parity remain open.

## Reference and independent control

Actual Pen shows Context between Create Component and Alignment. It starts closed for an empty value, opens a multiline field, and retains the entered six-line text after Tab leaves the field. MCP readback confirms the authored `context` value. Its textarea returns to its first line on blur. The owned rectangle is then removed, the original runtime/missing-source nodes are verified, and native File→Save returns the fixture to a clean state.

The privately extracted styles specify16px/14px left/right insets,8px vertical closed padding, a22px trigger,6px content gap and15px open bottom padding. The textarea uses11px type/16px leading,3px/8px padding,4px corners,56px minimum/80px maximum height and30% input-background opacity. Dark panel text is#C8C8C8; the corresponding light token is#020202. Light rendered states are not accepted by reading that token. Content-based field sizing reuses [Tailwind's existing utility](https://tailwindcss.com/docs/field-sizing); no dependency or shared-textarea behavior is added.

Open Pen uses the existing collapsible and textarea with scoped overrides and one semantic panel-foreground token. Existing commit, ownership and Undo paths remain intact. A blur handler resets only the textarea viewport. Without that handler, the independent twenty-line regression reports scrollTop248 in both Chromium and WebKit; with it, the unchanged text returns to scrollTop0. The existing Context workflow suite now runs in both engines.

## Executed evidence

Sixteen browser workflows pass in1.1m: imported Context edit/history/save/reopen, the long-text blur regression, layer rename/cancel/history/component creation, inline HTML export, export settings and canvas/Context keyboard history. Private logs:context-scroll-before.log and context-insets-two-engine.log. This is workflow evidence, not exact full-inspector pixels.

The isolated native candidate opens the disclosure and measures a settled56px empty field, then accepts physical CUA typing of six lines and Tab. The field grows to80px and returns to scrollTop0. WebDriver closes/reopens Context; the harness saves the owned document, closes it, visits Home and reopens its Recents entry through WebView controls. The reopened Context is automatically visible and retains every line. The final hover-qualified run passes in24.9s including operator-controlled waiting; the preceding settled run passes in54.9s. These are not performance timings. Private evidence:context-insets-native-hover.log, native-context-empty.png and native-context-long.png. Setup and Save use test APIs; typing/Tab uses CUA, and disclosure/Home/Recents actions use WebDriver.

Native metrics retain16px/14px insets,22px trigger,11px/16px typography,3px/8px padding,4px corners and#C8C8C8 text. The unfocused border remains#3F3F46 while hovered. Settled screenshots show the empty placeholder, expanded upward chevron, resize handle and the long field's first line. The first native run also retains content through reopen, but its empty screenshot catches the opening animation and its long screenshot precedes the scroll reset; those images remain private under context-insets-first/ and are not accepted as final visuals. A computed transform of `none` is not evidence of an incorrect chevron: Tailwind uses the separate CSS `rotate` property, and the settled screenshot shows the expected upward glyph.

Manual resize dragging, exact full-panel width and all other inspector row metrics, adaptive/light/read-only/mixed/error states, and general typing/IME remain open. No drag-resize or whole-inspector pixel claim follows from the resize handle or the computed `resize: both` value. Main installed app/profile/recovery remain preserved.


Final packaging qualification: source/Vue/test types, lint(existing warnings), architecture, test placement and docs/changelog gates pass. The normal79.34MiB and isolated85.86MiB candidates rebuild; strict normal signature and test-hook exclusion pass. Source-only review reports no further concrete regression, without claiming visual/native execution. No new CSS snapshot baselines are added. The sole new behavior regression covers the blur viewport reset.


The following [container correction](INSPECTOR-PARITY.md) retains these local insets while restoring191px field width at the matched1496×932native viewport; its earlier187px width comes from the old container's layout borders. Other row/control widths remain unaccepted.
