import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '#scene-graph/graph'
import { visibleSubtree } from '#scene-graph/graph/visible-subtree'
import { assertScriptOutputs, markScriptOutputCurrent, withScript } from '#scene-graph/scripts'
import {
  assertFragmentFrames,
  createShaderPaint,
  fragmentShaderPreset,
  withShaderPaints
} from '#scene-graph/shaders'

function script(graph: SceneGraph, parentId: string) {
  const node = graph.createNode('FRAME', parentId)
  graph.updateNode(node.id, { pluginData: withScript(node, { uri: 'output.js', inputs: {} }) })
  return node
}

function fragment(graph: SceneGraph, parentId: string) {
  const node = graph.createNode('RECTANGLE', parentId)
  const { paint, shader } = createShaderPaint(
    fragmentShaderPreset({ url: 'output.glsl', source: 'void main(){}', uniforms: {} })
  )
  graph.updateNode(node.id, {
    fills: [paint],
    pluginData: withShaderPaints(node, [paint], [shader])
  })
  return node
}

test('visible traversal preserves root order, breadth-first children and unique reads', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const first = graph.createNode('FRAME', page.id)
  const second = graph.createNode('FRAME', page.id)
  const firstChild = graph.createNode('RECTANGLE', first.id)
  const secondChild = graph.createNode('RECTANGLE', second.id)
  firstChild.childIds = [first.id, 'missing']
  const reads: string[] = []
  const nodes = visibleSubtree(
    {
      getNode: (id) => {
        reads.push(id)
        return graph.getNode(id)
      }
    },
    [first.id, second.id, first.id]
  )
  expect([...nodes].map((node) => node.id)).toEqual([
    first.id,
    second.id,
    firstChild.id,
    secondChild.id
  ])
  expect(reads).toEqual([first.id, second.id, firstChild.id, secondChild.id, 'missing'])
})

test('visible traversal reads children after the consumer and snapshots selected roots', () => {
  const graph = new SceneGraph()
  const parent = graph.createNode('FRAME', graph.getPages()[0].id)
  const roots = [parent.id]
  const nodes = visibleSubtree(graph, roots)
  expect(nodes.next().value).toBe(parent)
  const child = graph.createNode('RECTANGLE', parent.id)
  const unrelated = graph.createNode('RECTANGLE', graph.getPages()[0].id)
  roots.push(unrelated.id)
  expect(nodes.next().value).toBe(child)
  expect(nodes.next().done).toBe(true)
})

describe.each([
  { name: 'Script', prepare: script, validate: assertScriptOutputs },
  { name: 'GLSL', prepare: fragment, validate: assertFragmentFrames }
])('$name output validation', ({ prepare, validate }) => {
  test('refuses stale descendants, while absent roots and an empty selection are harmless', () => {
    const graph = new SceneGraph()
    const parent = graph.createNode('FRAME', graph.getPages()[0].id)
    prepare(graph, parent.id)
    expect(() => validate(graph, [])).not.toThrow()
    expect(() => validate(graph, ['missing'])).not.toThrow()
    expect(() => validate(graph, [parent.id])).toThrow()
  })

  test.each([{ visible: false }, { opacity: 0 }, { opacity: -1 }])(
    'skips a hidden subtree, but validates an explicitly selected child: %j',
    (changes) => {
      const graph = new SceneGraph()
      const parent = graph.createNode('FRAME', graph.getPages()[0].id, changes)
      const child = prepare(graph, parent.id)
      expect(() => validate(graph, [parent.id])).not.toThrow()
      expect(() => validate(graph, [parent.id, child.id])).toThrow()
    }
  )

  test('skips a hidden generated root itself', () => {
    const graph = new SceneGraph()
    const node = prepare(graph, graph.getPages()[0].id)
    graph.updateNode(node.id, { visible: false })
    expect(() => validate(graph, [node.id])).not.toThrow()
  })

  test('deduplicates overlapping roots and terminates child cycles without losing reachable output', () => {
    const graph = new SceneGraph()
    const parent = graph.createNode('FRAME', graph.getPages()[0].id)
    const child = graph.createNode('FRAME', parent.id)
    child.childIds = [parent.id, 'missing']
    expect(() => validate(graph, [parent.id, child.id, parent.id])).not.toThrow()
    prepare(graph, child.id)
    expect(() => validate(graph, [parent.id, child.id, parent.id])).toThrow()
  })

  test('does not silently discard non-finite positive-visibility content', () => {
    const graph = new SceneGraph()
    const parent = graph.createNode('FRAME', graph.getPages()[0].id, { opacity: Number.NaN })
    prepare(graph, parent.id)
    expect(() => validate(graph, [parent.id])).toThrow()
  })
})

test('Script descendant selection checks its closest owner and retains diagnostic export readiness', () => {
  const graph = new SceneGraph()
  const owner = script(graph, graph.getPages()[0].id)
  const child = graph.createNode('RECTANGLE', owner.id)
  expect(() => assertScriptOutputs(graph, [child.id])).toThrow()
  markScriptOutputCurrent(graph, owner.id, 'diagnostic')
  expect(() => assertScriptOutputs(graph, [child.id])).not.toThrow()
  graph.updateNode(owner.id, { width: owner.width + 1 })
  expect(() => assertScriptOutputs(graph, [child.id])).toThrow()
})

test('GLSL strokes are checked even when all fills are ordinary', () => {
  const graph = new SceneGraph()
  const node = fragment(graph, graph.getPages()[0].id)
  const paint = node.fills[0]
  graph.updateNode(node.id, {
    fills: [],
    strokes: [{ ...paint, weight: 1, align: 'CENTER' }]
  })
  expect(() => assertFragmentFrames(graph, [node.id])).toThrow()
  graph.updateNode(node.id, { strokes: [{ ...node.strokes[0], opacity: 0 }] })
  expect(() => assertFragmentFrames(graph, [node.id])).not.toThrow()
})
