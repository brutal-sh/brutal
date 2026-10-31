import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { parsePenFile, writePenDocument } from '@open-pencil/pen'
import { SceneGraph } from '@open-pencil/scene-graph'
import { recordInstanceOverride } from '@open-pencil/scene-graph/instances'
import { setInstanceOverride } from '@open-pencil/scene-graph/instances/overrides'

import { createEditor } from '#core/editor/create'
import { scriptReferenceDocument } from '#core/scripts/references'

function fixture() {
  const editor = createEditor()
  const page = editor.state.currentPageId
  const main = editor.graph.createNode('COMPONENT', page, {
    name: 'Reference target',
    width: 60,
    height: 40
  })
  const child = editor.graph.createNode('RECTANGLE', main.id, {
    name: 'Original child',
    width: 30,
    height: 20
  })
  const owner = editor.createScript(200, 0)
  return { editor, main, child, owner }
}

test('Script reference materializes only its dependencies and converts to a linked editable instance', () => {
  const { editor, main, child, owner } = fixture()
  const parent = main.parentId
  const context = scriptReferenceDocument(editor.graph, owner, [
    {
      type: 'ref',
      id: 'script-1',
      ref: main.id,
      x: 12,
      y: 20,
      width: 120,
      height: 80,
      descendants: { [child.id]: { name: 'Changed child', width: 42 } }
    }
  ])
  expect(main.parentId).toBe(parent)
  expect(context.dependencies.has(main.id)).toBe(true)
  expect(context.dependencies.has(editor.state.currentPageId)).toBe(false)
  const output = parsePenFile(JSON.stringify(context.penDocument))
  output.deleteNode(expectDefined(context.dependencyId))
  editor.setScriptDefinition(owner, { uri: 'reference.js', inputs: {} })
  const script = expectDefined(editor.graph.getNode(owner))
  expect(
    editor.replaceScriptOutput(owner, { uri: 'reference.js', inputs: {} }, script, output)
  ).toBe(true)
  const instance = expectDefined(editor.graph.getChildren(owner)[0])
  const generatedChild = expectDefined(editor.graph.getChildren(instance.id)[0])
  expect(instance).toMatchObject({
    type: 'INSTANCE',
    componentId: main.id,
    x: 12,
    y: 20,
    width: 120,
    height: 80
  })
  expect(generatedChild).toMatchObject({ name: 'Changed child', width: 42 })
  expect(instance.instanceOverrides.descendants.has(generatedChild.id)).toBe(true)
  const converted = expectDefined(editor.convertScriptToLayers(owner))
  const convertedInstance = expectDefined(editor.graph.getChildren(converted)[0])
  const convertedChild = expectDefined(editor.graph.getChildren(convertedInstance.id)[0])
  expect(convertedInstance).toMatchObject({
    type: 'INSTANCE',
    componentId: main.id,
    width: 120,
    height: 80
  })
  expect(convertedInstance.instanceOverrides.descendants.has(convertedChild.id)).toBe(true)
  editor.graph.updateNode(child.id, { width: 70 })
  editor.graph.syncInstances(main.id)
  expect(convertedChild.width).toBe(42)
  editor.dispose()
})

test('tree copying remaps instance descendant overrides, including copies from another graph', () => {
  const source = new SceneGraph()
  const page = source.getPages()[0].id
  const main = source.createNode('COMPONENT', page)
  source.createNode('RECTANGLE', main.id, { width: 30 })
  const instance = expectDefined(source.createInstance(main.id, page))
  const child = expectDefined(source.getChildren(instance.id)[0])
  source.updateNode(child.id, { width: 42 })
  recordInstanceOverride(source, child.id, ['width'])
  const clone = expectDefined(source.cloneTree(instance.id, page))
  const clonedChild = expectDefined(source.getChildren(clone.id)[0])
  expect(clone.instanceOverrides.descendants.has(child.id)).toBe(false)
  expect(clone.instanceOverrides.descendants.has(clonedChild.id)).toBe(true)
  source.updateNode(source.getChildren(main.id)[0].id, { width: 70 })
  source.syncInstances(main.id)
  expect(clonedChild.width).toBe(42)
  const target = new SceneGraph()
  const imported = expectDefined(target.cloneTree(instance.id, target.getPages()[0].id, {}, source))
  expect(imported.instanceOverrides.descendants.has(target.getChildren(imported.id)[0].id)).toBe(
    true
  )
})

test('reference context refuses missing/cyclic refs and expanded output limits', () => {
  const { editor, main, owner } = fixture()
  expect(() =>
    scriptReferenceDocument(editor.graph, owner, [{ type: 'ref', id: 'bad', ref: 'missing' }])
  ).toThrow('missing')
  const inside = editor.createScript(0, 0, main.id)
  expect(() =>
    scriptReferenceDocument(editor.graph, inside, [{ type: 'ref', id: 'cycle', ref: main.id }])
  ).toThrow('cyclic')
  editor.graph.deleteNode(inside)
  expect(() =>
    scriptReferenceDocument(
      editor.graph,
      owner,
      Array.from({ length: 501 }, (_, i) => ({ type: 'ref', id: `ref-${i}`, ref: main.id }))
    )
  ).toThrow('1,000 expanded')
  editor.dispose()
})

test('cloning a definition beside its instance retains original nested definition references', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const external = graph.createNode('COMPONENT', page, { name: 'External' })
  graph.createNode('RECTANGLE', external.id, { width: 20, height: 20 })
  const group = graph.createNode('GROUP', page, { name: 'Definition and use' })
  const main = graph.createNode('COMPONENT', group.id, { name: 'Main' })
  const nested = expectDefined(graph.createInstance(external.id, main.id))
  const instance = expectDefined(graph.createInstance(main.id, group.id))
  const copiedNested = expectDefined(graph.getChildren(instance.id)[0])
  setInstanceOverride(
    instance.instanceOverrides,
    instance.id,
    copiedNested.id,
    'sourceComponentId',
    nested.id
  )
  expect(
    instance.instanceOverrides.descendants.get(copiedNested.id)?.get('sourceComponentId')
  ).toBe(nested.id)
  const clonedGroup = expectDefined(graph.cloneTree(group.id, page))
  const clonedInstance = expectDefined(
    graph.getChildren(clonedGroup.id).find((node) => node.type === 'INSTANCE')
  )
  const clonedNested = expectDefined(graph.getChildren(clonedInstance.id)[0])
  expect(() => writePenDocument(graph)).not.toThrow()
  expect(clonedInstance.componentId).toBe(main.id)
  expect(
    clonedInstance.instanceOverrides.descendants.get(clonedNested.id)?.get('sourceComponentId')
  ).toBe(nested.id)
})

test('references apply the same text and asset bounds as direct Script output', () => {
  const { editor, main, child, owner } = fixture()
  const text = editor.graph.createNode('TEXT', main.id, { text: 'x'.repeat(100_001) })
  const output = [{ type: 'ref', id: 'ref', ref: main.id }]
  expect(() => scriptReferenceDocument(editor.graph, owner, output)).toThrow('too long')
  editor.graph.deleteNode(text.id)
  editor.graph.images.set('oversize', new Uint8Array(100_000))
  editor.graph.updateNode(child.id, {
    fills: [
      {
        type: 'IMAGE',
        imageHash: 'oversize',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true
      }
    ]
  })
  expect(() => scriptReferenceDocument(editor.graph, owner, output)).toThrow('image is too large')
  editor.dispose()
})

test('references accept restored component paint after saving and reopening a document', () => {
  const { editor, main, owner } = fixture()
  editor.graph.updateNode(main.id, {
    fills: [
      { type: 'SOLID', color: { r: 0.18, g: 0.44, b: 0.95, a: 1 }, opacity: 1, visible: true }
    ]
  })
  const restored = parsePenFile(JSON.stringify(writePenDocument(editor.graph)))
  expect(() =>
    scriptReferenceDocument(restored, owner, [{ type: 'ref', id: 'output', ref: main.id }])
  ).not.toThrow()
  editor.dispose()
})
