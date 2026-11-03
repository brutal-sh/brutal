import { describe, expect, test } from 'bun:test'

import { computed, ref } from 'vue'

import { createEditor } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'
import { MIXED, type MixedValue } from '@open-pencil/vue/controls/node-props'

import { createAppearanceActions, createAppearanceState } from '#vue/controls/appearance/helpers'

import { createRect, firstPageId, makeSceneGraph } from '#tests/helpers/scene'

function appearanceState(node: SceneNode, multi = false) {
  const selected = ref<SceneNode | null>(node)
  const nodes = ref<SceneNode[]>([node])
  const isMulti = ref(multi)

  function merged<K extends keyof SceneNode>(key: K): MixedValue<SceneNode[K]> {
    const current = selected.value
    if (!current) throw new Error('Expected selected node')
    return current[key]
  }

  return createAppearanceState({
    node: computed(() => selected.value),
    nodes: computed(() => nodes.value),
    isMulti: computed(() => isMulti.value),
    merged
  })
}

function rectangle() {
  const graph = makeSceneGraph()
  return createRect(graph, firstPageId(graph))
}

describe('appearance control state', () => {
  test('manual disclosure presents mixed per-corner values without changing multi-selection data or history', () => {
    const editor = createEditor()
    try {
      const first = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
        cornerRadius: 3.5
      })
      const second = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
        independentCorners: true,
        topLeftRadius: 3.5,
        topRightRadius: 5.5,
        bottomLeftRadius: 6.5,
        bottomRightRadius: 7.5
      })
      const original = structuredClone([first, second])
      const options = {
        editor,
        node: computed(() => null),
        nodes: computed(() => [first, second]),
        isMulti: computed(() => true),
        merged: <K extends keyof SceneNode>(): MixedValue<SceneNode[K]> => MIXED,
        cornerFieldsExpanded: ref(false),
        manualCornerExpansion: computed(() => true)
      }
      const state = createAppearanceState(options)
      const actions = createAppearanceActions(options)
      expect(state.showIndependentCorners.value).toBe(false)
      actions.toggleIndependentCorners()
      expect(state.showIndependentCorners.value).toBe(true)
      expect(state.cornerRadiusValue.value).toBe(MIXED)
      expect(state.cornerRadiusValues.value).toEqual({
        topLeftRadius: 3.5,
        topRightRadius: MIXED,
        bottomLeftRadius: MIXED,
        bottomRightRadius: MIXED
      })
      actions.toggleIndependentCorners()
      expect(state.showIndependentCorners.value).toBe(false)
      expect([first, second]).toEqual(original)
      expect(editor.undo.canUndo).toBe(false)
    } finally {
      editor.dispose()
    }
  })

  test('a corner literal preserves other bindings and scales through cancel, commit and Undo', () => {
    const editor = createEditor()
    try {
      const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
        cornerRadius: 8,
        topLeftRadius: 12,
        topRightRadius: 8,
        bottomLeftRadius: 8,
        bottomRightRadius: 8,
        boundVariables: {
          cornerRadius: 'global',
          topLeftRadius: 'local',
          'fills/0/color': 'color'
        },
        variableBindingScales: { cornerRadius: 2, topLeftRadius: 3 }
      })
      const original = structuredClone(node)
      const actions = createAppearanceActions({
        editor,
        node: computed(() => node),
        nodes: computed(() => [node]),
        isMulti: computed(() => false),
        merged: (key) => node[key]
      })
      actions.updateCornerProp('topLeftRadius', 7.25)
      expect(node.boundVariables).toEqual({
        topRightRadius: 'global',
        bottomLeftRadius: 'global',
        bottomRightRadius: 'global',
        'fills/0/color': 'color'
      })
      expect(node.variableBindingScales).toEqual({
        topRightRadius: 2,
        bottomLeftRadius: 2,
        bottomRightRadius: 2
      })
      actions.cancelRadiusPreview()
      expect(node).toEqual(original)
      expect(editor.undo.canUndo).toBe(false)
      actions.updateCornerProp('topLeftRadius', 7.25)
      actions.commitCornerProp('topLeftRadius', 7.25, 12)
      expect([node.topLeftRadius, node.topRightRadius]).toEqual([7.25, 8])
      editor.undoAction()
      expect(node.boundVariables).toEqual(original.boundVariables)
      expect(node.variableBindingScales).toEqual(original.variableBindingScales)
      expect([node.cornerRadius, node.independentCorners, node.topLeftRadius]).toEqual([
        8,
        false,
        12
      ])
      expect(editor.undo.canUndo).toBe(false)
      editor.redoAction()
      expect(node.topLeftRadius).toBe(7.25)
      expect(node.boundVariables.topLeftRadius).toBeUndefined()
    } finally {
      editor.dispose()
    }
  })

  test('uniform literals clear only corner bindings and restore all metadata on cancel and Undo', () => {
    const editor = createEditor()
    try {
      const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
        independentCorners: true,
        cornerRadius: 8,
        topLeftRadius: 12,
        topRightRadius: 8,
        bottomLeftRadius: 8,
        bottomRightRadius: 8,
        boundVariables: {
          cornerRadius: 'global',
          topLeftRadius: 'local',
          'fills/0/color': 'color'
        },
        variableBindingScales: { cornerRadius: 2, topLeftRadius: 3, opacity: 0.5 }
      })
      const original = structuredClone(node)
      const actions = createAppearanceActions({
        editor,
        node: computed(() => node),
        nodes: computed(() => [node]),
        isMulti: computed(() => false),
        merged: (key) => node[key]
      })
      actions.updateUniformRadius(4.25)
      expect(node.boundVariables).toEqual({ 'fills/0/color': 'color' })
      expect(node.variableBindingScales).toEqual({ opacity: 0.5 })
      actions.cancelRadiusPreview()
      expect(node).toEqual(original)
      actions.updateUniformRadius(4.25)
      actions.commitUniformRadius()
      expect(node.independentCorners).toBe(false)
      expect([
        node.cornerRadius,
        node.topLeftRadius,
        node.topRightRadius,
        node.bottomRightRadius,
        node.bottomLeftRadius
      ]).toEqual([4.25, 4.25, 4.25, 4.25, 4.25])
      editor.undoAction()
      expect(node.boundVariables).toEqual(original.boundVariables)
      expect(node.variableBindingScales).toEqual(original.variableBindingScales)
      expect(node.independentCorners).toBe(true)
      expect(node.topLeftRadius).toBe(12)
    } finally {
      editor.dispose()
    }
  })

  test('keeps equal uniform corners collapsed', () => {
    const state = appearanceState(rectangle())
    expect(state.showIndependentCorners.value).toBe(false)
  })

  test('expands corners when the explicit independent flag is set', () => {
    const node = rectangle()
    node.independentCorners = true
    const state = appearanceState(node)
    expect(state.showIndependentCorners.value).toBe(true)
  })

  test('collapses equal independent corners when they share one binding', () => {
    const node = rectangle()
    node.independentCorners = true
    node.boundVariables = {
      topLeftRadius: 'radius',
      topRightRadius: 'radius',
      bottomRightRadius: 'radius',
      bottomLeftRadius: 'radius'
    }
    expect(appearanceState(node).showIndependentCorners.value).toBe(false)
  })

  test('collapsed bound corners display their actual shared radius', () => {
    const node = rectangle()
    node.independentCorners = true
    node.cornerRadius = 0
    node.topLeftRadius = node.topRightRadius = node.bottomLeftRadius = node.bottomRightRadius = 12
    node.boundVariables = {
      topLeftRadius: 'radius',
      topRightRadius: 'radius',
      bottomLeftRadius: 'radius',
      bottomRightRadius: 'radius'
    }
    const state = appearanceState(node)
    expect(state.cornerRadiusValue.value).toBe(12)
    expect(state.cornerRadiusBindingPaths.value).toEqual([
      'topLeftRadius',
      'topRightRadius',
      'bottomRightRadius',
      'bottomLeftRadius'
    ])
  })

  test('collapsed bound corners can be expanded without detaching their bindings', () => {
    const graph = makeSceneGraph()
    const rect = graph.createNode('RECTANGLE', firstPageId(graph), {
      independentCorners: true,
      boundVariables: {
        topLeftRadius: 'radius',
        topRightRadius: 'radius',
        bottomLeftRadius: 'radius',
        bottomRightRadius: 'radius'
      }
    })
    const editor = createEditor({ graph })
    const options = {
      expandedCornerNodeId: ref<string | null>(null),
      editor,
      node: computed(() => graph.getNode(rect.id) ?? null),
      nodes: computed(() => []),
      isMulti: computed(() => false),
      merged: <K extends keyof SceneNode>(): MixedValue<SceneNode[K]> => MIXED
    }
    const actions = createAppearanceActions(options)
    actions.toggleIndependentCorners()
    expect(createAppearanceState(options).showIndependentCorners.value).toBe(true)
    expect(graph.getNode(rect.id)?.boundVariables.topLeftRadius).toBe('radius')
    expect(editor.undo.canUndo).toBe(false)
    actions.toggleIndependentCorners()
    expect(createAppearanceState(options).showIndependentCorners.value).toBe(false)
  })

  test('splitting a radius bound as a whole binds each corner, undoably', () => {
    const graph = makeSceneGraph()
    const rect = graph.createNode('RECTANGLE', firstPageId(graph), {
      cornerRadius: 8,
      boundVariables: { cornerRadius: 'radius' }
    })
    const editor = createEditor({ graph })
    const actions = createAppearanceActions({
      expandedCornerNodeId: ref<string | null>(null),
      editor,
      node: computed(() => graph.getNode(rect.id) ?? null),
      nodes: computed(() => []),
      isMulti: computed(() => false),
      merged: <K extends keyof SceneNode>(): MixedValue<SceneNode[K]> => MIXED
    })
    actions.toggleIndependentCorners()
    expect(graph.getNode(rect.id)?.boundVariables).toEqual({
      topLeftRadius: 'radius',
      topRightRadius: 'radius',
      bottomLeftRadius: 'radius',
      bottomRightRadius: 'radius'
    })
    editor.undo.undo()
    expect(graph.getNode(rect.id)?.boundVariables).toEqual({ cornerRadius: 'radius' })
  })

  test('keeps equal independent corners expanded for distinct bindings', () => {
    const node = rectangle()
    node.independentCorners = true
    node.boundVariables = {
      topLeftRadius: 'radius-a',
      topRightRadius: 'radius-b',
      bottomRightRadius: 'radius-a',
      bottomLeftRadius: 'radius-a'
    }
    expect(appearanceState(node).showIndependentCorners.value).toBe(true)
  })

  test('expands imported unequal corners when the explicit flag is stale', () => {
    const node = rectangle()
    node.independentCorners = false
    node.topLeftRadius = 4
    node.topRightRadius = 12
    const state = appearanceState(node)
    expect(state.showIndependentCorners.value).toBe(true)
  })

  test('leaves the per-corner editor collapsed for multi-selection', () => {
    const node = rectangle()
    node.independentCorners = true
    const state = appearanceState(node, true)
    expect(state.showIndependentCorners.value).toBe(false)
  })

  test('presents normalized corner smoothing as a percentage', () => {
    const node = rectangle()
    node.cornerSmoothing = 0.735
    const state = appearanceState(node)
    expect(state.cornerSmoothingPercent.value).toBe(74)
  })

  test('keeps independent corner preview and undo behavior', () => {
    const graph = makeSceneGraph()
    const pageId = firstPageId(graph)
    const rect = graph.createNode('RECTANGLE', pageId, {
      independentCorners: true,
      topLeftRadius: 8
    })
    const editor = createEditor({ graph })
    const actions = createAppearanceActions({
      editor,
      node: computed(() => graph.getNode(rect.id) ?? null),
      nodes: computed(() => []),
      isMulti: computed(() => false),
      merged: (key) => graph.getNode(rect.id)?.[key] ?? MIXED
    })

    actions.updateCornerProp('topLeftRadius', 20)
    actions.commitCornerProp('topLeftRadius', 20, 8)
    expect(graph.getNode(rect.id)?.topLeftRadius).toBe(20)
    editor.undo.undo()
    expect(graph.getNode(rect.id)?.topLeftRadius).toBe(8)
  })

  test('restores each mixed smoothing value in one undo step', () => {
    const graph = makeSceneGraph()
    const pageId = firstPageId(graph)
    const first = graph.createNode('RECTANGLE', pageId, { cornerSmoothing: 0.2 })
    const second = graph.createNode('RECTANGLE', pageId, { cornerSmoothing: 0.8 })
    const editor = createEditor({ graph })
    const nodes = computed(() => {
      const selected = [graph.getNode(first.id), graph.getNode(second.id)]
      return selected.filter((value): value is SceneNode => value !== undefined)
    })
    const actions = createAppearanceActions({
      editor,
      node: computed(() => null),
      nodes,
      isMulti: computed(() => true),
      merged: <K extends keyof SceneNode>(): MixedValue<SceneNode[K]> => MIXED
    })

    actions.updateCornerProp('cornerSmoothing', 1.4)
    expect(graph.getNode(first.id)?.cornerSmoothing).toBe(1)
    expect(graph.getNode(second.id)?.cornerSmoothing).toBe(1)
    actions.commitCornerProp('cornerSmoothing', 1, 0)

    editor.undo.undo()
    expect(graph.getNode(first.id)?.cornerSmoothing).toBe(0.2)
    expect(graph.getNode(second.id)?.cornerSmoothing).toBe(0.8)
  })
})
