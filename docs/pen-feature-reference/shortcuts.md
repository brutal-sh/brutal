# Keyboard acceptance matrix

Source: [Pen keyboard shortcuts](https://docs.pen.dev/core-concepts/keyboard-shortcuts), retrieved 2026-10-30. These are Pen requirements, not a claim that Open Pen matches them. Use Command/Option on macOS and Control/Alt on Windows/Linux. Test canvas, text, inspector and chat focus separately. All rows await complete native comparison.

## Current documentation additions

Rechecked 2026-11-06: Cmd/Ctrl + P opens command search; Cmd/Ctrl + F opens layer search.
The current guide labels Cmd/Ctrl + T as a new chat tab. These are documented deltas awaiting
pinned Pen 1.2.21 comparison; the original matrix below is preserved. See UI-12/13 and KEY-01.

## AI Chat

| Binding | Action | Native comparison |
| --- | --- | --- |
| Cmd/Ctrl + K | Toggle AI chat | Open |
| Cmd/Ctrl + T | New Agent tab | Open |
| Ctrl + Tab | Move to next chat tab | Open |
| Ctrl + Shift + Tab | Move to previous chat tab | Open |
| ↑ / ↓ | Prompt history | Open |

## Tools

| Binding | Action | Native comparison |
| --- | --- | --- |
| V | Move tool | Open |
| K | Scale tool | Open |
| H | Hand tool | Open |
| R | Rectangle tool | Open |
| O | Ellipse tool | Open |
| A / F | Frame tool | Open |
| T | Text tool | Open |
| N | Sticky note tool | Open |
| P | Pen tool | Open |
| Hold Z | Zoom tool | Open |

## Editing

| Binding | Action | Native comparison |
| --- | --- | --- |
| Cmd/Ctrl + C | Copy selection to clipboard | Open |
| Cmd/Ctrl + V | Paste clipboard content | Open |
| Cmd/Ctrl + Shift + R | Paste to replace the selection | Open |
| Cmd/Ctrl + Shift + C | Copy selection as PNG | Open |
| Cmd/Ctrl + Option/Alt + C | Copy selection as HTML | Open |
| Cmd/Ctrl + D | Duplicate selection | Open |
| Cmd/Ctrl + X | Cut selection | Open |
| Delete/Backspace | Delete selection | Open |
| Arrow keys / Shift + Arrow keys | Move selection by 1px / 10px by default | Open |
| Arrow keys | Swap elements order in flex layout | Open |
| Cmd/Ctrl + G | Group selected elements | Open |
| Cmd/Ctrl + Shift + G | Ungroup | Open |
| Cmd/Ctrl + Option/Alt + G | Wrap selection in a frame | Open |
| Shift + A | Add flex layout to a selection | Open |
| Shift + Option/Alt + A | Remove flex layout from a selection | Open |
| Shift + H | Flip horizontal | Open |
| Shift + V | Flip vertical | Open |
| Cmd/Ctrl + Z | Undo | Open |
| Cmd/Ctrl + Shift + Z | Redo | Open |

## Arrange

| Binding | Action | Native comparison |
| --- | --- | --- |
| Option/Alt + W | Align selection to the top | Open |
| Option/Alt + A | Align selection to the left | Open |
| Option/Alt + S | Align selection to the bottom | Open |
| Option/Alt + D | Align selection to the right | Open |
| Option/Alt + H | Align selection to the horizontal center | Open |
| Option/Alt + V | Align selection to the vertical middle | Open |
| Cmd/Ctrl + [ | Send backward | Open |
| Cmd/Ctrl + ] | Bring forward | Open |
| [ | Send to back | Open |
| ] | Bring to front | Open |

## Selection

| Binding | Action | Native comparison |
| --- | --- | --- |
| Cmd/Ctrl + A | Select all | Open |
| Cmd/Ctrl + Click | Direct select (deepest element under cursor) | Open |
| Cmd/Ctrl + Drag | Box-select nested elements | Open |
| Shift + Click | Add to selection | Open |
| Shift + Enter | Select parent of currently selected child element | Open |
| Enter | Select children of currently selected parent element | Open |
| Esc | Clear selection | Open |

## Components

| Binding | Action | Native comparison |
| --- | --- | --- |
| Cmd/Ctrl + Option/Alt + K | Convert element to a Component or Convert a Component back to a standard element | Open |
| Cmd/Ctrl + Option/Alt + X | Detach component instance | Open |
| Option/Alt + Shift + R | Replace inside instance | Open |

## Canvas Navigation

| Binding | Action | Native comparison |
| --- | --- | --- |
| Cmd/Ctrl + Scroll | Zoom | Open |
| Spacebar + Drag / Middle mouse button | Pan canvas | Open |
| Shift + Scroll | Horizontal pan | Open |
| Cmd/Ctrl + + | Zoom in | Open |
| Cmd/Ctrl + - | Zoom out | Open |
| Cmd/Ctrl + 0 | Zoom to 100% | Open |
| Shift + 1 | Zoom to fit | Open |
| Shift + 2 | Zoom to selection | Open |
| Hold Z + Click | Zoom in at pointer | Open |
| Hold Z + Option/Alt + Click | Zoom out at pointer | Open |
| Hold Z + Drag | Zoom to region | Open |

## Path editing

| Binding | Action | Native comparison |
| --- | --- | --- |
| Enter on a selected shape | Edit points | Open |
| Enter | Finish editing | Open |
| P | Activate Pen tool | Open |
| V | Activate Select points tool | Open |
| X | Activate Cut tool | Open |
| Cmd/Ctrl + A | Select all points | Open |
| Cmd/Ctrl + D | Duplicate selection | Open |
| Option/Alt + Drag | Drag off a duplicate | Open |
| Cmd/Ctrl + J | Connect selected points | Open |
| Arrow keys / Shift + Arrow keys | Move selected points by 1px / 10px by default | Open |
| Delete/Backspace | Delete selected points, segments, or handles | Open |
| Double-click a point | Toggle smooth and corner | Open |
| Cmd/Ctrl + Drag a point | Pull symmetric handles | Open |
| Option/Alt + Drag a handle | Break handle symmetry | Open |
| Cmd/Ctrl + Drag a segment | Bend into a curve | Open |
| Cmd/Ctrl + Option/Alt + Drag a segment | Bend without moving neighbors | Open |
| Cmd/Ctrl + Double-click a segment | Straighten segment | Open |

## Canvas Settings

| Binding | Action | Native comparison |
| --- | --- | --- |
| Cmd/Ctrl + ' | Toggle pixel grid | Open |
| Cmd/Ctrl + Shift + ' | Toggle snap to pixel grid | Open |

## File Operations

| Binding | Action | Native comparison |
| --- | --- | --- |
| Cmd/Ctrl + S | Save file | Open |
| Cmd/Ctrl + Shift + S | Save As | Open |
| Cmd/Ctrl + N | Open Dashboard | Open |
| Cmd/Ctrl + Shift + N | Create new file | Open |
| Cmd/Ctrl + O | Open file | Open |

Path modifiers outside table: Pen-tool click adds a point; Option/Alt-click a segment inserts one; Option/Alt-drag a point moves it without drawing. Open the in-app shortcut reference with `?` or its toolbar control. Compare that reference with this inventory and installed native menus.
