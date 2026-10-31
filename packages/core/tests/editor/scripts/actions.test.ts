import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SceneGraph } from '@open-pencil/scene-graph'
import { scriptOfNode } from '@open-pencil/scene-graph/scripts'
import { slotScope } from '@open-pencil/scene-graph/slots'

import { createEditor } from '#core/editor/create'

function output(width = 34) {
  const graph = new SceneGraph()
  graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    name: 'Generated probe',
    width,
    height: 170
  })
  return graph
}

test('Script creation, authored inputs and conversion are undoable while regeneration is derived', () => {
  const editor = createEditor()
  const id = editor.createScript(20, 30)
  const node = () => expectDefined(editor.graph.getNode(id))
  expect(node()).toMatchObject({
    name: 'Script',
    width: 200,
    height: 200,
    clipsContent: false,
    fills: []
  })
  editor.setScriptDefinition(id, { uri: 'grid.js', inputs: { count: 9 } })
  const definition = expectDefined(scriptOfNode(node()))
  editor.setScriptDefinition(id, { ...definition, inputs: { ...definition.inputs } })
  expect(editor.replaceScriptOutput(id, definition, node(), output())).toBe(true)
  const generated = node().childIds[0]
  expect(slotScope(editor.graph, id)).toMatchObject({ kind: 'locked' })
  editor.convertScriptToLayers(id)
  expect(scriptOfNode(node())).toBeUndefined()
  expect(node()).toMatchObject({ name: 'Frame', childIds: [generated] })
  expect(slotScope(editor.graph, id)).toEqual({ kind: 'free' })
  editor.updateNodeWithUndo(generated, { width: 80 })
  editor.undo.undo()
  expect(editor.graph.getNode(generated)?.width).toBe(34)
  editor.undo.undo()
  expect(scriptOfNode(node())).toEqual(definition)
  expect(node().childIds).toEqual([generated])
  editor.undo.redo()
  expect(scriptOfNode(node())).toBeUndefined()
  editor.undo.undo()
  editor.undo.undo()
  expect(scriptOfNode(node())).toEqual({ uri: '', inputs: {} })
  editor.undo.undo()
  expect(editor.graph.getNode(id)).toBeUndefined()
  editor.undo.redo()
  expect(scriptOfNode(node())).toEqual({ uri: '', inputs: {} })
  editor.dispose()
})

test('stale and converted output is refused; read-only rendering cannot change authored data', () => {
  const editor = createEditor()
  const id = editor.createScript(0, 0)
  const node = () => expectDefined(editor.graph.getNode(id))
  const initial = expectDefined(scriptOfNode(node()))
  editor.setScriptDefinition(id, { uri: 'next.js', inputs: {} })
  expect(editor.replaceScriptOutput(id, initial, node(), output())).toBe(false)
  const definition = expectDefined(scriptOfNode(node()))
  expect(editor.replaceScriptOutput(id, definition, { width: 201, height: 200 }, output())).toBe(
    false
  )
  editor.setReadOnly(true)
  expect(() => editor.setScriptDefinition(id, initial)).toThrow()
  expect(() => editor.convertScriptToLayers(id)).toThrow()
  expect(editor.replaceScriptOutput(id, definition, node(), output())).toBe(true)
  expect(scriptOfNode(node())).toEqual(definition)
  editor.setReadOnly(false)
  editor.undo.undo()
  expect(scriptOfNode(node())).toEqual(initial)
  editor.convertScriptToLayers(id)
  expect(editor.replaceScriptOutput(id, initial, node(), output())).toBe(false)
  editor.dispose()
})

test('failed or pending current source cannot convert an earlier generated snapshot', () => {
  const editor = createEditor()
  const id = editor.createScript(0, 0)
  const node = () => expectDefined(editor.graph.getNode(id))
  editor.setScriptDefinition(id, { uri: 'first.js', inputs: {} })
  const definition = expectDefined(scriptOfNode(node()))
  editor.replaceScriptOutput(id, definition, node(), output())
  editor.setScriptDefinition(id, { uri: 'invalid-next.js', inputs: {} })
  expect(() => editor.convertScriptToLayers(id)).toThrow()
  expect(scriptOfNode(node())?.uri).toBe('invalid-next.js')
  expect(node().childIds).toHaveLength(1)
  editor.dispose()
})
