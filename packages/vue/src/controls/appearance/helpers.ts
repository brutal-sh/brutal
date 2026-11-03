import { compact } from 'es-toolkit'
import { omit } from 'es-toolkit/object'
import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { BlendMode, SceneNode } from '@open-pencil/scene-graph'
import { scriptOfNode } from '@open-pencil/scene-graph/scripts'
import { independentCornerChanges } from '@open-pencil/scene-graph/variables'

import type { CornerGeometryKey, CornerRadiusKey } from '#vue/controls/appearance/types'
import { useNodePreview } from '#vue/controls/node-preview/use'
import { MIXED, type MixedValue } from '#vue/controls/node-props/use'

const CORNER_RADIUS_TYPES = new Set([
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'FRAME',
  'COMPONENT',
  'INSTANCE',
  'POLYGON',
  'STAR',
  'SHAPE_WITH_TEXT'
])

/**
 * A polygon's, star's or shape with text's corners share one radius, so Figma offers no
 * per-corner radii for them.
 */
const SHARED_RADIUS_TYPES = new Set(['POLYGON', 'STAR', 'SHAPE_WITH_TEXT'])

const POINT_COUNT_TYPES = new Set(['POLYGON', 'STAR'])

const CORNER_PATHS: CornerRadiusKey[] = [
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius'
]

type AppearanceStateOptions = {
  expandedCornerNodeId?: Ref<string | null>
  cornerFieldsExpanded?: Ref<boolean>
  manualCornerExpansion?: ComputedRef<boolean>
  node: ComputedRef<SceneNode | null>
  nodes: ComputedRef<SceneNode[]>
  isMulti: ComputedRef<boolean>
  merged: <K extends keyof SceneNode>(key: K) => MixedValue<SceneNode[K]>
}

type AppearanceActionOptions = AppearanceStateOptions & {
  editor: Editor
}

function supportsCornerRadius(node: SceneNode) {
  return CORNER_RADIUS_TYPES.has(node.type)
}

/** The value shared by every node, MIXED when they differ, or `empty` when there are none. */
function sharedValue<T>(values: readonly T[], empty: T): MixedValue<T> {
  if (values.length === 0) return empty
  const [first] = values
  return values.every((value) => value === first) ? first : MIXED
}

function cornersHaveEquivalentBindings(node: SceneNode): boolean {
  const first = node.boundVariables.topLeftRadius
  if (!first) return false
  return [
    node.boundVariables.topRightRadius,
    node.boundVariables.bottomRightRadius,
    node.boundVariables.bottomLeftRadius
  ].every((id) => id === first)
}

function hasUnequalCorners(node: SceneNode) {
  return !(
    node.topLeftRadius === node.topRightRadius &&
    node.topLeftRadius === node.bottomRightRadius &&
    node.topLeftRadius === node.bottomLeftRadius
  )
}

export function createAppearanceState({
  node,
  nodes,
  isMulti,
  merged,
  expandedCornerNodeId,
  cornerFieldsExpanded,
  manualCornerExpansion
}: AppearanceStateOptions) {
  // Figma shows the radius for any multi-selection and edits only the layers that have one; with
  // none among them the field is disabled.
  const cornerNodes = computed(() =>
    nodes.value.filter((target) => supportsCornerRadius(target) && !scriptOfNode(target))
  )
  const cornerNodeIds = computed(() => cornerNodes.value.map((target) => target.id))
  function sharedCornerValue(key: CornerRadiusKey): MixedValue<number> {
    return sharedValue(
      cornerNodes.value.map((target) =>
        target.independentCorners || hasUnequalCorners(target) || target.boundVariables[key]
          ? target[key]
          : target.cornerRadius
      ),
      0
    )
  }
  const cornerRadiusValues = computed<Record<CornerRadiusKey, MixedValue<number>>>(() => ({
    topLeftRadius: sharedCornerValue('topLeftRadius'),
    topRightRadius: sharedCornerValue('topRightRadius'),
    bottomRightRadius: sharedCornerValue('bottomRightRadius'),
    bottomLeftRadius: sharedCornerValue('bottomLeftRadius')
  }))
  const hasCornerRadius = computed(() => {
    if (isMulti.value) return true
    return node.value ? supportsCornerRadius(node.value) : false
  })
  const cornerRadiusDisabled = computed(() =>
    isMulti.value ? cornerNodes.value.length === 0 : !!node.value && !!scriptOfNode(node.value)
  )
  const splitsCorners = computed(() => {
    const targets = isMulti.value ? cornerNodes.value : compact([node.value])
    return targets.every((target) => !scriptOfNode(target) && !SHARED_RADIUS_TYPES.has(target.type))
  })

  const independentCorners = computed(() => {
    if (isMulti.value)
      return sharedValue(
        cornerNodes.value.map((n) => n.independentCorners),
        false
      )
    return node.value?.independentCorners ?? false
  })

  const showIndependentCorners = computed(() => {
    if (manualCornerExpansion?.value) {
      return !!cornerFieldsExpanded?.value && splitsCorners.value && !cornerRadiusDisabled.value
    }
    if (isMulti.value || !splitsCorners.value) return false
    const selected = node.value
    return selected
      ? expandedCornerNodeId?.value === selected.id ||
          hasUnequalCorners(selected) ||
          (selected.independentCorners && !cornersHaveEquivalentBindings(selected))
      : false
  })

  const cornerRadiusValue = computed<MixedValue<number>>(() => {
    if (manualCornerExpansion?.value && splitsCorners.value) {
      return sharedValue(
        CORNER_PATHS.map((key) => cornerRadiusValues.value[key]),
        0
      )
    }
    if (isMulti.value)
      return sharedValue(
        cornerNodes.value.map((n) => n.cornerRadius),
        0
      )
    const selected = node.value
    return selected &&
      splitsCorners.value &&
      cornersHaveEquivalentBindings(selected) &&
      !hasUnequalCorners(selected)
      ? selected.topLeftRadius
      : (selected?.cornerRadius ?? 0)
  })

  const cornerRadiusBindingPaths = computed<Array<CornerRadiusKey | 'cornerRadius'>>(() => {
    if (manualCornerExpansion?.value && cornerRadiusValue.value === MIXED) return CORNER_PATHS
    const selected = node.value
    return selected &&
      splitsCorners.value &&
      cornersHaveEquivalentBindings(selected) &&
      !hasUnequalCorners(selected)
      ? CORNER_PATHS
      : ['cornerRadius']
  })

  // Figma shows a polygon's or star's point count, and a star's inner ratio, while every selected
  // layer has one.
  const selectedNodes = computed(() => (isMulti.value ? nodes.value : compact([node.value])))
  const hasPointCount = computed(
    () =>
      selectedNodes.value.length > 0 &&
      selectedNodes.value.every((target) => POINT_COUNT_TYPES.has(target.type))
  )
  const hasStarRatio = computed(
    () =>
      selectedNodes.value.length > 0 &&
      selectedNodes.value.every((target) => target.type === 'STAR')
  )
  const pointCount = computed(() =>
    sharedValue(
      selectedNodes.value.map((target) => target.pointCount),
      0
    )
  )
  const starRatioPercent = computed(() =>
    sharedValue(
      selectedNodes.value.map((target) => Math.round(target.starInnerRadius * 1000) / 10),
      0
    )
  )

  const cornerSmoothingPercent = computed(() => {
    const value = isMulti.value
      ? sharedValue(
          cornerNodes.value.map((n) => n.cornerSmoothing),
          0
        )
      : merged('cornerSmoothing')
    return value === MIXED ? MIXED : Math.round(Math.max(0, Math.min(value, 1)) * 100)
  })

  const opacityPercent = computed(() => {
    const v = merged('opacity')
    return v === MIXED ? MIXED : Math.round(v * 100)
  })

  const blendModeValue = computed(() => {
    const v = merged('blendMode')
    return v === MIXED ? MIXED : v
  })

  const visibilityState = computed<'visible' | 'hidden' | 'mixed'>(() => {
    const v = merged('visible')
    if (v === MIXED) return 'mixed'
    return v ? 'visible' : 'hidden'
  })

  return {
    cornerNodeIds,
    cornerRadiusValues,
    hasCornerRadius,
    cornerRadiusDisabled,
    splitsCorners,
    hasPointCount,
    hasStarRatio,
    pointCount,
    starRatioPercent,
    independentCorners,
    showIndependentCorners,
    cornerRadiusValue,
    cornerRadiusBindingPaths,
    cornerSmoothingPercent,
    opacityPercent,
    blendModeValue,
    visibilityState
  }
}

export function createAppearanceActions({
  editor,
  node,
  nodes,
  isMulti,
  expandedCornerNodeId,
  cornerFieldsExpanded,
  manualCornerExpansion
}: AppearanceActionOptions) {
  const radiusPreview = useNodePreview(editor)

  function setBlendMode(value: BlendMode) {
    const selected = node.value
    const targets = isMulti.value ? nodes.value : []
    if (!isMulti.value && selected) targets.push(selected)
    const changed = targets.filter((target) => target.blendMode !== value)
    if (changed.length === 0) return

    editor.undo.runBatch('Change blend mode', () => {
      for (const target of changed) {
        editor.updateNodeWithUndo(target.id, { blendMode: value }, 'Change blend mode')
      }
    })
  }

  function toggleVisibility() {
    if (isMulti.value) {
      const liveNodes = nodes.value
        .map((n) => editor.getNode(n.id))
        .filter((n): n is SceneNode => n != null)
      if (liveNodes.length === 0) return
      const allVisible = liveNodes.every((n) => n.visible)
      editor.undo.runBatch('Toggle visibility', () => {
        for (const n of liveNodes) editor.setNodeVisibility(n.id, !allVisible)
      })
      return
    }

    const selected = node.value
    if (!selected) return
    const liveNode = editor.getNode(selected.id)
    if (!liveNode) return
    editor.setNodeVisibility(liveNode.id, !liveNode.visible)
  }

  function toggleIndependentCorners() {
    if (manualCornerExpansion?.value && cornerFieldsExpanded) {
      if (cornerTargets().length) cornerFieldsExpanded.value = !cornerFieldsExpanded.value
      return
    }
    const selected = node.value
    if (
      !isMulti.value &&
      selected &&
      expandedCornerNodeId &&
      cornersHaveEquivalentBindings(selected) &&
      !hasUnequalCorners(selected)
    ) {
      expandedCornerNodeId.value = expandedCornerNodeId.value === selected.id ? null : selected.id
      return
    }
    const targets = cornerTargets()
    if (targets.length === 0) return
    const makeIndependent = !targets.every(
      (target) => target.independentCorners || hasUnequalCorners(target)
    )

    editor.undo.runBatch(
      makeIndependent ? 'Independent corner radii' : 'Uniform corner radius',
      () => {
        for (const target of targets) {
          if (makeIndependent) {
            if (target.independentCorners) continue
            editor.updateNodeWithUndo(
              target.id,
              independentCornerChanges(target),
              'Independent corner radii'
            )
          } else {
            const uniform = target.topLeftRadius
            editor.updateNodeWithUndo(
              target.id,
              {
                independentCorners: false,
                cornerRadius: uniform,
                topLeftRadius: uniform,
                topRightRadius: uniform,
                bottomRightRadius: uniform,
                bottomLeftRadius: uniform
              },
              'Uniform corner radius'
            )
          }
        }
      }
    )
  }

  function cornerTargets() {
    if (isMulti.value)
      return nodes.value.filter((target) => supportsCornerRadius(target) && !scriptOfNode(target))
    const selected = node.value
    return selected && !scriptOfNode(selected) ? [selected] : []
  }

  function updateCornerProp(key: CornerGeometryKey, value: number) {
    const normalized = key === 'cornerSmoothing' ? Math.max(0, Math.min(value, 1)) : value
    radiusPreview.update(
      cornerTargets().map((target) => target.id),
      (id) => {
        const target = editor.getNode(id)
        if (!target) return {}
        if (key === 'cornerSmoothing') return { cornerSmoothing: normalized }
        const changes = independentCornerChanges(target)
        // Stale uniform flags must not replace unequal authored corners during conversion.
        if (!target.independentCorners && hasUnequalCorners(target))
          for (const corner of CORNER_PATHS) changes[corner] = target[corner]
        const bindings = changes.boundVariables ?? target.boundVariables
        const scales = changes.variableBindingScales ?? target.variableBindingScales
        if (bindings[key]) changes.boundVariables = omit(bindings, [key])
        if (scales[key] !== undefined) changes.variableBindingScales = omit(scales, [key])
        return { ...changes, [key]: normalized }
      },
      `Change ${key}`
    )
  }

  function commitCornerProp(_key: CornerGeometryKey, _value: number, _previous: number) {
    radiusPreview.commit()
  }

  function updateUniformRadius(value: number) {
    radiusPreview.update(
      cornerTargets().map((target) => target.id),
      (id) => {
        const target = editor.getNode(id)
        if (!target) return {}
        const paths = [...CORNER_PATHS, 'cornerRadius'] as const
        const changes: Partial<SceneNode> = {
          cornerRadius: value,
          independentCorners: false,
          topLeftRadius: value,
          topRightRadius: value,
          bottomRightRadius: value,
          bottomLeftRadius: value
        }
        if (paths.some((key) => target.boundVariables[key]))
          changes.boundVariables = omit(target.boundVariables, paths)
        if (paths.some((key) => target.variableBindingScales[key] !== undefined))
          changes.variableBindingScales = omit(target.variableBindingScales, paths)
        return changes
      },
      'Change corner radius'
    )
  }

  function commitUniformRadius() {
    radiusPreview.commit()
  }

  return {
    cancelRadiusPreview: radiusPreview.cancel,
    rollbackRadiusPreview: radiusPreview.rollback,
    updateUniformRadius,
    commitUniformRadius,
    setBlendMode,
    toggleVisibility,
    toggleIndependentCorners,
    updateCornerProp,
    commitCornerProp
  }
}
