---
title: useAppearance
description: Control visibility, opacity, corner radius, and smoothing for the current selection.
---

# useAppearance

`useAppearance()` is the appearance-focused control composable for property panels.

It exposes selection-derived UI state for:

- visibility
- opacity
- corner radius
- corner smoothing as a normalized percentage
- independent corner radii, including imported unequal-corner state
- blend mode

## Usage

```ts
import { useAppearance } from '@open-pencil/vue/controls/appearance'

const appearance = useAppearance()
```

For disclosure-only corner controls, use `useAppearance({ cornerExpansion: 'manual' })`.
The composable owns expansion state in both modes; consumers render `showIndependentCorners`
rather than keeping a second expansion ref. Manual mode exposes effective per-corner values
for all supported selected nodes through `cornerRadiusValues`, and a mixed uniform radius when
their corners differ. Opening or closing the controls does not edit the document.

## Basic example

```ts
const {
  visibilityState,
  opacityPercent,
  cornerRadiusValue,
  cornerSmoothingPercent,
  showIndependentCorners,
  toggleVisibility,
  toggleIndependentCorners,
} = useAppearance()
```

## Practical examples

### Toggle selection visibility

```ts
appearance.toggleVisibility()
```

### Edit per-corner radii

```ts
appearance.updateCornerProp('topLeftRadius', 12)
appearance.commitCornerProp('topLeftRadius', 12, 8)
```

Cancel an unfinished corner or smoothing edit with `appearance.cancelRadiusPreview()`.
For a binding-aware numeric field, call `appearance.rollbackRadiusPreview()` from the enclosing
`BindableValueRoot`'s `before-cancel` event, then `cancelRadiusPreview()` from the numeric field's
terminal `cancel`. This order preserves both value and binding metadata on Escape, invalid input,
deactivation and unmount.

### Edit corner smoothing

```ts
appearance.updateCornerProp('cornerSmoothing', 0.75)
appearance.commitCornerProp('cornerSmoothing', 0.75, 0)
```

Render the per-corner editor from `showIndependentCorners`. It accounts for both the explicit
scene-node flag and imported nodes whose corner values differ. Multi-selection toggles and commits
are grouped into one undo entry.

## Related APIs

- [SDK API Overview](../)
- [useLayout](./use-layout)
- [useTypography](./use-typography)
