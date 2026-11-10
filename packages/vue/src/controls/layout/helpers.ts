import { sizingAxis, type LayoutAxis } from './axis'
export { createLayoutActions } from './actions'
export { axisSizingPatchForNode } from './axis'
export type { LayoutAxis, SizeLimitProp } from './axis'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'

import type { Editor } from '@open-pencil/core'
import type {
  GridTrack,
  LayoutAlign,
  LayoutCounterAlign,
  LayoutSizing,
  SceneGraph,
  SceneNode
} from '@open-pencil/scene-graph'
import {
  aspectRatioLockEditable,
  layoutSizing,
  layoutJustification,
  layoutSizingOptions
} from '@open-pencil/scene-graph/layout'
import {
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'

import { useNodePreview } from '#vue/controls/node-preview/use'
import { useSelectedNodeState } from '#vue/editor/selection-state/nodes'
import type { useI18n } from '#vue/i18n'

export type AlignCell = { primary: LayoutAlign; counter: LayoutCounterAlign }

type GridTrackProp = 'gridTemplateColumns' | 'gridTemplateRows'

type LayoutPanelStrings = {
  sizingFixed: string
  sizingHug: string
  sizingFill: string
}

type ValueRef<T> = { readonly value: T }

export const ALIGN_HORIZONTAL: AlignCell[] = [
  { primary: 'MIN', counter: 'MIN' },
  { primary: 'CENTER', counter: 'MIN' },
  { primary: 'MAX', counter: 'MIN' },
  { primary: 'MIN', counter: 'CENTER' },
  { primary: 'CENTER', counter: 'CENTER' },
  { primary: 'MAX', counter: 'CENTER' },
  { primary: 'MIN', counter: 'MAX' },
  { primary: 'CENTER', counter: 'MAX' },
  { primary: 'MAX', counter: 'MAX' }
]

export const ALIGN_VERTICAL: AlignCell[] = [
  { primary: 'MIN', counter: 'MIN' },
  { primary: 'MIN', counter: 'CENTER' },
  { primary: 'MIN', counter: 'MAX' },
  { primary: 'CENTER', counter: 'MIN' },
  { primary: 'CENTER', counter: 'CENTER' },
  { primary: 'CENTER', counter: 'MAX' },
  { primary: 'MAX', counter: 'MIN' },
  { primary: 'MAX', counter: 'CENTER' },
  { primary: 'MAX', counter: 'MAX' }
]

export function createLayoutSelectionState(
  editor: Editor,
  panels: ReturnType<typeof useI18n>['panels']
) {
  const { node } = useSelectedNodeState(editor)
  const layoutDirection = computed<SceneNode['layoutDirection']>(
    () => node.value?.layoutDirection ?? 'AUTO'
  )
  const sizingState = createLayoutSizingState(editor, node, panels)
  const gapAuto = computed(() => node.value?.primaryAxisAlign === 'SPACE_BETWEEN')
  const gapDistribution = computed(() => {
    const n = node.value
    const alignment = n ? layoutJustification(n) : 'MIN'
    return alignment === 'SPACE_AROUND' || alignment === 'SPACE_BETWEEN' ? alignment : 'FIXED'
  })
  const alignGrid = computed(() =>
    node.value?.layoutMode === 'VERTICAL' ? ALIGN_VERTICAL : ALIGN_HORIZONTAL
  )

  return { node, layoutDirection, gapAuto, gapDistribution, alignGrid, ...sizingState }
}

export function createTrackSizingOptions(panels: ReturnType<typeof useI18n>['panels']['value']) {
  return [
    { value: 'FR' as const, label: panels.sizingFillFr },
    { value: 'FIXED' as const, label: panels.sizingFixedPx },
    { value: 'AUTO' as const, label: panels.auto }
  ]
}

export function trackLabel(track: GridTrack): string {
  if (track.sizing === 'FR') return `${track.value}fr`
  if (track.sizing === 'FIXED') return `${track.value}px`
  return 'Auto'
}

export function createGridTrackActions(editor: Editor, node: ComputedRef<SceneNode | null>) {
  function updateGridTrack(prop: GridTrackProp, index: number, updates: Partial<GridTrack>) {
    if (!node.value) return
    const tracks = [...node.value[prop]]
    tracks[index] = { ...tracks[index], ...updates }
    editor.updateNodeWithUndo(node.value.id, { [prop]: tracks }, 'Change grid track')
  }

  function addTrack(prop: GridTrackProp) {
    if (!node.value) return
    editor.updateNodeWithUndo(
      node.value.id,
      { [prop]: [...node.value[prop], { sizing: 'FR' as const, value: 1 }] },
      'Add grid track'
    )
  }

  function removeTrack(prop: GridTrackProp, index: number) {
    if (!node.value) return
    editor.updateNodeWithUndo(
      node.value.id,
      { [prop]: node.value[prop].filter((_: GridTrack, i: number) => i !== index) },
      'Remove grid track'
    )
  }

  return { updateGridTrack, addTrack, removeTrack }
}

export function paddingModeUpdates(n: SceneNode, collapsing: boolean): Partial<SceneNode> {
  const changes: Partial<SceneNode> = {
    pluginData: withPluginData(
      n.pluginData,
      OPEN_PENCIL_PLUGIN_DATA.paddingMode,
      collapsing ? undefined : 'INDIVIDUAL'
    )
  }
  if (collapsing) {
    changes.paddingBottom = n.paddingTop
    changes.paddingLeft = n.paddingRight
    const bindings = { ...n.boundVariables }
    const scales = { ...n.variableBindingScales }
    if (bindings.paddingTop) {
      bindings.paddingBottom = bindings.paddingTop
      if (scales.paddingTop !== undefined) scales.paddingBottom = scales.paddingTop
      else delete scales.paddingBottom
    } else {
      delete bindings.paddingBottom
      delete scales.paddingBottom
    }
    if (bindings.paddingRight) {
      bindings.paddingLeft = bindings.paddingRight
      if (scales.paddingRight !== undefined) scales.paddingLeft = scales.paddingRight
      else delete scales.paddingLeft
    } else {
      delete bindings.paddingLeft
      delete scales.paddingLeft
    }
    changes.boundVariables = bindings
    changes.variableBindingScales = scales
  }
  return changes
}

function paddingState(node: ComputedRef<SceneNode | null>) {
  const hasUniformPadding = computed(() => {
    const n = node.value
    if (!n) return true
    return (
      n.paddingTop === n.paddingRight &&
      n.paddingRight === n.paddingBottom &&
      n.paddingBottom === n.paddingLeft
    )
  })

  const hasSymmetricPadding = computed(() => {
    const n = node.value
    if (!n) return true
    return n.paddingLeft === n.paddingRight && n.paddingTop === n.paddingBottom
  })
  const showIndividualPadding = computed(
    () =>
      !hasSymmetricPadding.value ||
      readPluginData(node.value?.pluginData, OPEN_PENCIL_PLUGIN_DATA.paddingMode) === 'INDIVIDUAL'
  )
  return { hasUniformPadding, hasSymmetricPadding, showIndividualPadding }
}

export function createPaddingActions(editor: Editor, node: ComputedRef<SceneNode | null>) {
  const preview = useNodePreview(editor)
  const { hasUniformPadding, hasSymmetricPadding, showIndividualPadding } = paddingState(node)

  function setHorizontalPadding(v: number) {
    if (!node.value) return
    preview.update(
      [node.value.id],
      { paddingLeft: v, paddingRight: v },
      'Change horizontal padding'
    )
  }

  function commitHorizontalPadding(_value: number, _previous: number) {
    preview.commit()
  }

  function setVerticalPadding(v: number) {
    if (!node.value) return
    preview.update([node.value.id], { paddingTop: v, paddingBottom: v }, 'Change vertical padding')
  }

  function commitVerticalPadding(_value: number, _previous: number) {
    preview.commit()
  }

  function toggleIndividualPadding() {
    const n = node.value
    if (!n) return
    const collapsing = showIndividualPadding.value
    const changes = paddingModeUpdates(n, collapsing)
    preview.update([n.id], changes, 'Change padding mode')
    preview.commit()
  }

  return {
    cancelPaddingPreview: preview.cancel,
    showIndividualPadding,
    hasUniformPadding,
    hasSymmetricPadding,
    setHorizontalPadding,
    commitHorizontalPadding,
    setVerticalPadding,
    commitVerticalPadding,
    toggleIndividualPadding
  }
}

export function axisSizingForNode(
  graph: SceneGraph,
  node: SceneNode | null,
  axis: LayoutAxis
): LayoutSizing {
  return node ? layoutSizing(graph, node, sizingAxis(axis)) : 'FIXED'
}

export function sizingOptionsForNode(
  graph: SceneGraph,
  node: SceneNode | null,
  labels: Partial<Record<LayoutSizing, string>> = {}
): { value: LayoutSizing; label: string }[] {
  const allowed = node ? layoutSizingOptions(graph, node) : []
  // A node outside auto-layout still shows its fixed size.
  const values: LayoutSizing[] = allowed.length > 0 ? allowed : ['FIXED']
  const fallback: Record<LayoutSizing, string> = { FIXED: 'Fixed', HUG: 'Hug', FILL: 'Fill' }
  return values.map((value) => ({ value, label: labels[value] ?? fallback[value] }))
}

export function createLayoutSizingState(
  editor: Editor,
  node: ComputedRef<SceneNode | null>,
  panels: ValueRef<LayoutPanelStrings>
) {
  const isInAutoLayout = computed(() => {
    const n = node.value
    if (!n?.parentId) return false
    const parent = editor.getNode(n.parentId)
    return parent ? parent.layoutMode !== 'NONE' : false
  })

  const isGrid = computed(() => node.value?.layoutMode === 'GRID')
  const isFlex = computed(
    () => node.value?.layoutMode === 'HORIZONTAL' || node.value?.layoutMode === 'VERTICAL'
  )
  const widthSizing = computed(() => axisSizingForNode(editor.graph, node.value, 'width'))
  const heightSizing = computed(() => axisSizingForNode(editor.graph, node.value, 'height'))

  function sizingOptions() {
    return sizingOptionsForNode(editor.graph, node.value, {
      FIXED: panels.value.sizingFixed,
      HUG: panels.value.sizingHug,
      FILL: panels.value.sizingFill
    })
  }

  const widthSizingOptions = computed(sizingOptions)
  const heightSizingOptions = computed(sizingOptions)
  const aspectRatioLocked = computed(() => node.value?.targetAspectRatio != null)
  const aspectRatioLockable = computed(() => {
    const n = node.value
    return !!n && aspectRatioLockEditable(editor.graph, n)
  })

  return {
    isInAutoLayout,
    aspectRatioLocked,
    aspectRatioLockable,
    isGrid,
    isFlex,
    widthSizing,
    heightSizing,
    widthSizingOptions,
    heightSizingOptions
  }
}
