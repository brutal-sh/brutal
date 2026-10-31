---
title: useNodeProps
description: Low-level selection and mixed-value helper for property panels.
---

# useNodeProps

`useNodeProps()` is the low-level property-panel helper behind higher-level composables like `useAppearance`, `useLayout`, and `useTypography`.

Use it when you need mixed-value detection, multi-selection updates, array-item editing, or undo-aware property commits.

## Related APIs

- [useAppearance](../composables/use-appearance)
- [useLayout](../composables/use-layout)
- [useTypography](../composables/use-typography)
- [PropertyListRoot](../components/property-list-root)

## Custom property gestures

`useNodePreview(editor)` is also exported from `@open-pencil/vue/controls/node-props`. For a custom live control, call `update(ids, changes, label)` during the gesture, then `commit()` or `cancel()`. The first update retains its original target IDs. It records one history step on commit, and cancels on scope disposal or component deactivation. A retained inspector also cancels when its retained activity becomes false, before its DOM is parked.
