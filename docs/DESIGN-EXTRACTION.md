# Pen.app design extraction

The installed `/Applications/Pen.app` 1.2.21 is the reference. This records design measurements for Brutal's independent implementation. Full visual and functional parity remains the acceptance condition.

The existing REA artifact inventory identified the packaged editor stylesheet. The selected stylesheet and literal component style declarations were read from that exact ASAR. Private reference material stays under ignored `local-evidence/pen-design-extraction/`; implementation consumes the measured values in [pen-design-tokens.json](pen-design-tokens.json).

## Observed packaged values

| Element | Measured specification |
| --- | --- |
| Tool control | 28 × 28px, 16px glyph, 16px corner radius |
| Tool rail | 4px inset and gap, 20px corner radius; resulting width 36px |
| Standalone toolbar controls | 28px control inside the 36px island |
| Tool flyout caret | 28 × 12px |
| Floating island edge | 1px inset rim, dark `#a0b2cc21`; no drop shadow |
| Active tool | Outline with dark `#3f3f46` border; input color at 30% opacity |
| Tool menu | Minimum 128px width, 4px padding, 6px corners, 12px/16px text, 11px shortcut |
| Workspace navigation | 29px minimum height/width, 6px corners, 13px medium text |
| Agent session controls | 32px high, 6px corners, 13px text; 12px horizontal/10px top/14px bottom surrounding padding |
| Document/action bar | 42px outside height; document pills 28px high |
| Canvas | Dark `#18181b` |
| Island/menu | Dark `#27272a` |
| Primary menu text | Dark `#f4f4f5` |
| Muted text | Dark `#a1a1aa` |
| Input/selected-control border | Dark `#3f3f46` |
| Menu border | Dark `#202020` |

The retained reference contains 2,561 literal component class sets, 51 root theme properties, 158 shared base theme properties and 43 dark-theme properties. This is a bounded static extraction: dynamic classes, inherited layout and platform-specific rendering still require live state comparison.

## Executed comparison

The running Pen app was inspected through its accessibility tree and screenshot while its Move/Scale menu was open. REA's separate passive native-window capture hit its 45-second provider deadline; it is not counted as live proof. The REA ASAR inventory also reports integrity contradictions, so extracted bytes are observations rather than publisher-integrity verification.

Brutal's immutable browser build 8 was rendered and inspected. Eight browser tests passed, including measured 28px tool controls, 36px rail, 1px selected-tool border, exact dark rim/panel colors, 12px menu labels, functional layer search, drawing, selection, menus, tabs and `.pen` save/reopen. The real Scale gesture separately passed scaling, one-step Undo and Escape cancellation. These establish the named states only, not whole-app parity.

## Still open

Exact glyph shapes, remaining menus/dialogs, sidebar spacing and content, native/browser differences, focus/hover/disabled/error states, responsive layouts and the complete feature inventory remain subject to comparison. The subscription/licensing exclusions do not waive any of these differences.

## Native window chrome

Selected static observations from `out/app-window.js` show macOS `frame: false`, `titleBarStyle: hiddenInset`, and window controls positioned inside the document-bar inset. The running Pen screenshot also has no separate title strip. Brutal now uses Tauri's macOS overlay title bar, hides the text title, reserves native control space in the document pill, and marks its background draggable. Native close/minimize/full-screen controls remain system controls. Exact hover/agent-badge behavior is still open. Placement and dragging require the new packaged build's runtime check.
