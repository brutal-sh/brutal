import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SceneGraph } from '@open-pencil/scene-graph'
import {
  OPEN_PENCIL_PLUGIN_DATA,
  withPluginData,
  readPluginData
} from '@open-pencil/scene-graph/plugin-data'
import { scriptOfNode } from '@open-pencil/scene-graph/scripts'
import { ownsSlotContent, slotPropertyId, slotScope } from '@open-pencil/scene-graph/slots'

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
  const convertedId = expectDefined(editor.convertScriptToLayers(id))
  const converted = () => expectDefined(editor.graph.getNode(convertedId))
  const generatedCopy = converted().childIds[0]
  expect(convertedId).not.toBe(id)
  expect(generatedCopy).not.toBe(generated)
  expect(editor.graph.getNode(id)).toBeUndefined()
  expect(scriptOfNode(converted())).toBeUndefined()
  expect(converted()).toMatchObject({ name: 'Frame', childIds: [generatedCopy] })
  expect(slotScope(editor.graph, convertedId)).toEqual({ kind: 'free' })
  editor.updateNodeWithUndo(generatedCopy, { width: 80 })
  editor.undo.undo()
  expect(editor.graph.getNode(generatedCopy)?.width).toBe(34)
  editor.undo.undo()
  expect(scriptOfNode(node())).toEqual(definition)
  expect(node().childIds).toEqual([generated])
  expect(editor.graph.getNode(convertedId)).toBeUndefined()
  editor.undo.redo()
  expect(editor.graph.getNode(id)).toBeUndefined()
  expect(scriptOfNode(converted())).toBeUndefined()
  expect(converted().childIds).toEqual([generatedCopy])
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
  const size = { width: node().width, height: node().height }
  editor.convertScriptToLayers(id)
  expect(editor.replaceScriptOutput(id, initial, size, output())).toBe(false)
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

test('conversion replaces a named Script in place and preserves geometry and Context through Undo/Redo', () => {
  const editor = createEditor()
  const page = editor.graph.getPages()[0]
  const parent = editor.graph.createNode('FRAME', page.id, { name: 'Container' })
  const before = editor.graph.createNode('RECTANGLE', parent.id)
  const id = editor.createScript(100, 0, parent.id)
  const after = editor.graph.createNode('RECTANGLE', parent.id)
  const script = expectDefined(editor.graph.getNode(id))
  editor.setScriptDefinition(id, { uri: 'probe.js', inputs: {} })
  editor.graph.updateNode(id, {
    name: 'Independent conversion probe',
    rotation: 15,
    opacity: 0.5,
    clipsContent: true,
    pluginData: withPluginData(
      script.pluginData,
      OPEN_PENCIL_PLUGIN_DATA.nodeContext,
      'Independent conversion context'
    )
  })
  expect(
    editor.replaceScriptOutput(id, expectDefined(scriptOfNode(script)), script, output())
  ).toBe(true)
  const convertedId = expectDefined(editor.convertScriptToLayers(id))
  const converted = expectDefined(editor.graph.getNode(convertedId))
  const children = [...converted.childIds]
  expect(parent.childIds).toEqual([before.id, convertedId, after.id])
  expect([...editor.state.selectedIds]).toEqual([convertedId])
  expect(converted).toMatchObject({
    name: 'Independent conversion probe',
    x: 100,
    y: 0,
    width: 200,
    height: 200,
    rotation: 15,
    opacity: 0.5,
    clipsContent: true
  })
  expect(readPluginData(converted.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext)).toBe(
    'Independent conversion context'
  )
  editor.undo.undo()
  expect(parent.childIds).toEqual([before.id, id, after.id])
  expect(scriptOfNode(expectDefined(editor.graph.getNode(id)))).toEqual({
    uri: 'probe.js',
    inputs: {}
  })
  expect(editor.graph.getNode(convertedId)).toBeUndefined()
  expect(editor.state.selectedIds.size).toBe(0)
  editor.undo.redo()
  expect(parent.childIds).toEqual([before.id, convertedId, after.id])
  expect(editor.graph.getNode(convertedId)?.childIds).toEqual(children)
  editor.dispose()
})

test('conversion refuses fixed instance children without modifying their structure or history', () => {
  const editor = createEditor()
  const page = editor.graph.getPages()[0]
  const component = editor.graph.createNode('COMPONENT', page.id)
  editor.createScript(0, 0, component.id)
  const instance = expectDefined(editor.graph.createInstance(component.id, page.id))
  const script = expectDefined(editor.graph.getChildren(instance.id)[0])
  const before = editor.graph.nodes.size
  editor.undo.clear()
  expect(editor.convertScriptToLayers(script.id)).toBeUndefined()
  expect(editor.graph.getNode(script.id)).toBe(script)
  expect(editor.graph.nodes.size).toBe(before)
  expect(editor.undo.canUndo).toBe(false)
  editor.dispose()
})

test('conversion claims an inherited slot and one Undo restores the original Script and ownership', () => {
  const editor = createEditor()
  const page = editor.graph.getPages()[0]
  const component = editor.graph.createNode('COMPONENT', page.id, {
    componentPropertyDefinitions: [
      { id: 'body-slot', name: 'Body', type: 'SLOT', defaultValue: '' }
    ]
  })
  const body = editor.graph.createNode('FRAME', component.id, {
    componentPropertyReferences: [{ propertyId: 'body-slot', field: 'SLOT_CONTENT' }]
  })
  editor.createScript(0, 0, body.id)
  const instance = expectDefined(editor.graph.createInstance(component.id, page.id))
  const slot = expectDefined(
    editor.graph.getChildren(instance.id).find((node) => slotPropertyId(node))
  )
  const script = expectDefined(editor.graph.getChildren(slot.id)[0])
  expect(ownsSlotContent(editor.graph, slot)).toBe(false)
  editor.undo.clear()
  const converted = expectDefined(editor.convertScriptToLayers(script.id))
  expect(ownsSlotContent(editor.graph, expectDefined(editor.graph.getNode(slot.id)))).toBe(true)
  expect(editor.graph.getNode(converted)?.componentId).toBeNull()
  editor.undo.undo()
  const restoredSlot = expectDefined(editor.graph.getNode(slot.id))
  expect(ownsSlotContent(editor.graph, restoredSlot)).toBe(false)
  expect(restoredSlot.childIds).toEqual([script.id])
  expect(scriptOfNode(expectDefined(editor.graph.getNode(script.id)))).toEqual({
    uri: '',
    inputs: {}
  })
  expect(editor.graph.getNode(converted)).toBeUndefined()
  expect(editor.undo.canUndo).toBe(false)
  editor.undo.redo()
  expect(editor.graph.getNode(slot.id)?.childIds).toEqual([converted])
  expect(ownsSlotContent(editor.graph, expectDefined(editor.graph.getNode(slot.id)))).toBe(true)
  editor.dispose()
})
