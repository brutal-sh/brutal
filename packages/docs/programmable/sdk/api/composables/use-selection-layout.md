---
title: useSelectionLayout
description: Layout of a multi-selection as Figma shows it, with text resizing, flow, clip content, and spacing.
---

# useSelectionLayout

`useSelectionLayout()` reads and edits the layout of the selected layers the way Figma's panel does
for several layers. Each value is the one the relevant layers share, `MIXED` when they differ, or
`undefined` when no selected layer has it:

- `textResize` — resizing of the selected text layers
- `layoutMode` — flow, when every selected layer can hold an auto layout
- `clipsContent` — clip content of the layers that can clip
- `spacing` and `spacingAxis` — the gap between neighbours when the layers form one row or column
- `widthSizing` and `heightSizing` — shared authored sizing, including Fill intent outside auto layout
- `fillDisabled` — whether any selected layer refuses Fill in its current auto-layout position

Each action changes only the layers it applies to, in one undo step.

## Usage

```ts
import { useSelectionLayout } from '@open-pencil/vue/controls/selection-layout'

const layout = useSelectionLayout()

layout.setTextResize('AUTO_HEIGHT')
layout.setLayoutMode('VERTICAL')
layout.toggleClipsContent()
layout.setSpacing(16)
layout.setAxisSizing('width', 'FILL')
```

`setSpacing` keeps the first layer of the row in place and spaces the rest after it.

`setAxisSizing('width' | 'height', mode)` uses authored screen-axis sizing and retains each
layer's numeric fallback. Its owned preview includes layout changes in the same Undo step.
Render a shared sizing of `MIXED` as an indeterminate checkbox; turning it on sets Fill for every
selected layer. Bind numeric multi-selection fields to all selected node IDs so a literal edit,
binding detachment and cancellation share the provider's transaction.

## Related APIs

- [useLayout](./use-layout)
- [useSelectionColors](./use-selection-colors)
