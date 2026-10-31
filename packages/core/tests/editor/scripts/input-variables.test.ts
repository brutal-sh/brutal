import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { parsePenFile, writePenDocument } from '@open-pencil/pen'
import {
  resolveScriptInputVariables,
  scriptOfNode,
  SCRIPT_INPUT_BINDING_PREFIX
} from '@open-pencil/scene-graph/scripts'

import { createEditor } from '#core/editor/create'
import { exportFigFile, parseFigFile } from '#core/io/formats/fig'

function fixture() {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.21',
      themes: { mode: ['light', 'dark'] },
      variables: {
        count: { type: 'number', value: 2 },
        ink: {
          type: 'color',
          value: [
            { value: '#2E6FF2', theme: { mode: 'light' } },
            { value: '#F97316', theme: { mode: 'dark' } }
          ]
        },
        alias: { type: 'number', value: '$count' }
      },
      children: [
        {
          type: 'frame',
          id: 'parent',
          name: 'Themed parent',
          theme: { mode: 'dark' },
          width: 400,
          height: 300,
          children: [
            {
              type: 'script',
              id: 'script',
              name: 'Variable Script',
              scriptUri: 'grid.js',
              width: 200,
              height: 200,
              inputs: { count: '$alias', ink: '$ink', caption: '\\$literal' }
            }
          ]
        }
      ]
    })
  )
  const editor = createEditor({ graph })
  const node = expectDefined(graph.getNode('script'))
  const variable = (name: string) =>
    expectDefined([...graph.variables.values()].find((v) => v.name === name))
  const resolved = () =>
    resolveScriptInputVariables(graph, node, expectDefined(scriptOfNode(node)).inputs)
  return { editor, graph, node, variable, resolved }
}

test('Script inputs resolve variable identities, aliases and inherited themes without changing authored data', () => {
  const { editor, graph, node, variable, resolved } = fixture()
  expect(resolved()).toEqual({ count: 2, ink: '#F97316', caption: '$literal' })
  const count = variable('count')
  editor.updateVariableValue(
    count.id,
    expectDefined(graph.variableCollections.get(count.collectionId)).modes[1].modeId,
    4
  )
  expect(resolved().count).toBe(4)
  const collection = expectDefined(graph.variableCollections.get(variable('ink').collectionId))
  graph.updateNode(node.id, { variableModes: { [collection.id]: collection.defaultModeId } })
  expect(resolved().ink).toBe('#2E6FF2')
  expect(scriptOfNode(node)?.inputs.ink).toBe('$ink')
  editor.dispose()
})

test('Script variable binding, literal edits and Undo retain graph identity through rename and .pen reopen', () => {
  const { editor, graph, node, variable, resolved } = fixture()
  const count = variable('count')
  editor.setScriptInputVariable(node.id, 'count', count.id)
  expect(node.boundVariables[`${SCRIPT_INPUT_BINDING_PREFIX}count`]).toBe(count.id)
  editor.renameVariable(count.id, 'Renamed count')
  expect(resolved().count).toBe(2)
  const saved = writePenDocument(graph)
  const script = expectDefined(saved.children[0].children)[0]
  expect(script.inputs?.count).toBe('$Renamed count')
  const reopened = parsePenFile(JSON.stringify(saved))
  const restored = expectDefined(reopened.getNode(node.id))
  expect(
    resolveScriptInputVariables(reopened, restored, expectDefined(scriptOfNode(restored)).inputs)
      .count
  ).toBe(2)
  editor.setScriptDefinition(node.id, { uri: 'grid.js', inputs: { count: 3 } })
  expect(node.boundVariables[`${SCRIPT_INPUT_BINDING_PREFIX}count`]).toBeUndefined()
  editor.undo.undo()
  expect(node.boundVariables[`${SCRIPT_INPUT_BINDING_PREFIX}count`]).toBe(count.id)
  expect(resolved().count).toBe(2)
  editor.dispose()
})

test('Script bindings distinguish duplicate variable names and refuse a removed variable', () => {
  const { editor, graph, node, variable, resolved } = fixture()
  const count = variable('count')
  const duplicate = {
    ...count,
    id: 'duplicate',
    valuesByMode: Object.fromEntries(Object.keys(count.valuesByMode).map((mode) => [mode, 5]))
  }
  graph.addVariable(duplicate)
  editor.setScriptInputVariable(node.id, 'count', duplicate.id)
  expect(resolved().count).toBe(5)
  const saved = writePenDocument(graph)
  expect(expectDefined(saved.children[0].children)[0].inputs?.count).toBe('$count_2')
  const reopened = parsePenFile(JSON.stringify(saved))
  const restored = expectDefined(reopened.getNode(node.id))
  expect(
    resolveScriptInputVariables(reopened, restored, expectDefined(scriptOfNode(restored)).inputs)
      .count
  ).toBe(5)
  graph.removeVariable(duplicate.id)
  expect(() => resolved()).toThrow('missing or ambiguous variable')
  editor.dispose()
})

test('a same-name variable switch is an independent Script instance input claim through sync and Undo', () => {
  const { editor, graph, node, variable } = fixture()
  const count = variable('count')
  const duplicate = {
    ...count,
    id: 'duplicate',
    valuesByMode: Object.fromEntries(Object.keys(count.valuesByMode).map((mode) => [mode, 5]))
  }
  graph.addVariable(duplicate)
  editor.setScriptInputVariable(node.id, 'count', count.id)
  editor.select([node.id])
  editor.createComponentFromSelection()
  const instance = expectDefined(
    graph.getNode(expectDefined(editor.createInstanceFromComponent(node.id)))
  )
  editor.setScriptInputVariable(instance.id, 'count', duplicate.id)
  expect(instance.instanceOverrides.self.has('script/inputs')).toBe(true)
  editor.setScriptDefinition(node.id, { uri: 'grid.js', inputs: { count: 4 } })
  graph.syncInstances(node.id)
  expect(
    resolveScriptInputVariables(graph, instance, expectDefined(scriptOfNode(instance)).inputs).count
  ).toBe(5)
  editor.undo.undo()
  graph.syncInstances(node.id)
  expect(
    resolveScriptInputVariables(graph, instance, expectDefined(scriptOfNode(instance)).inputs).count
  ).toBe(5)
  editor.undo.undo()
  graph.syncInstances(node.id)
  expect(
    resolveScriptInputVariables(graph, instance, expectDefined(scriptOfNode(instance)).inputs).count
  ).toBe(2)
  editor.dispose()
})

test('FIG round trips Script variable identities and per-node themes alongside source metadata', async () => {
  const { editor, graph, node, variable } = fixture()
  editor.renameVariable(variable('alias').id, 'Renamed alias')
  const bytes = await exportFigFile(graph)
  const reopened = await parseFigFile(new Uint8Array(bytes).buffer)
  const restored = expectDefined(
    [...reopened.getAllNodes()].find((layer) => layer.name === node.name)
  )
  expect(
    resolveScriptInputVariables(reopened, restored, expectDefined(scriptOfNode(restored)).inputs)
  ).toEqual({ count: 2, ink: '#F97316', caption: '$literal' })
  editor.dispose()
})

for (const restore of [false, true])
  test(`deleting an inherited Script variable preserves main repair after Undo=${restore}`, () => {
    const { editor, graph, node, variable } = fixture()
    const count = variable('count')
    const other = {
      ...count,
      id: 'replacement-count',
      name: 'Replacement count',
      valuesByMode: Object.fromEntries(Object.keys(count.valuesByMode).map((mode) => [mode, 5]))
    }
    graph.addVariable(other)
    editor.setScriptInputVariable(node.id, 'count', count.id)
    editor.select([node.id])
    editor.createComponentFromSelection()
    const instance = expectDefined(
      graph.getNode(expectDefined(editor.createInstanceFromComponent(node.id)))
    )
    editor.removeVariable(count.id)
    if (restore) editor.undo.undo()
    expect(instance.instanceOverrides.self.has('boundVariables')).toBe(false)
    expect(instance.instanceOverrides.self.has('script/inputs')).toBe(false)
    editor.setScriptInputVariable(node.id, 'count', other.id)
    graph.syncInstances(node.id)
    expect(
      resolveScriptInputVariables(graph, instance, expectDefined(scriptOfNode(instance)).inputs)
        .count
    ).toBe(5)
    editor.dispose()
  })

test('independent Script inputs retain their binding map while ordinary geometry bindings still inherit', () => {
  const { editor, graph, node, variable } = fixture()
  const count = variable('count')
  const ink = variable('ink')
  const own = {
    ...count,
    id: 'own-count',
    name: 'Own count',
    valuesByMode: Object.fromEntries(Object.keys(count.valuesByMode).map((mode) => [mode, 5]))
  }
  const width = {
    ...count,
    id: 'width-variable',
    name: 'Width variable',
    valuesByMode: Object.fromEntries(Object.keys(count.valuesByMode).map((mode) => [mode, 250]))
  }
  const newInk = { ...ink, id: 'new-ink', name: 'New ink' }
  graph.addVariable(own)
  graph.addVariable(width)
  graph.addVariable(newInk)
  editor.select([node.id])
  editor.createComponentFromSelection()
  const instance = expectDefined(
    graph.getNode(expectDefined(editor.createInstanceFromComponent(node.id)))
  )
  editor.setScriptInputVariable(instance.id, 'count', own.id)
  expect(instance.instanceOverrides.self.has('boundVariables')).toBe(false)
  editor.setScriptInputVariable(node.id, 'ink', newInk.id)
  graph.bindVariable(node.id, 'width', width.id)
  graph.syncInstances(node.id)
  expect(instance.boundVariables.width).toBe(width.id)
  expect(instance.boundVariables[`${SCRIPT_INPUT_BINDING_PREFIX}ink`]).toBe(ink.id)
  expect(
    resolveScriptInputVariables(graph, instance, expectDefined(scriptOfNode(instance)).inputs).count
  ).toBe(5)
  graph.unbindVariable(node.id, 'width')
  graph.syncInstances(node.id)
  const saved = writePenDocument(graph)
  expect(saved.children.find((layer) => layer.type === 'ref')?.inputs).toMatchObject({
    count: '$Own count',
    ink: '$ink'
  })
  editor.setScriptDefinition(instance.id, { uri: 'grid.js', inputs: { count: 3 } })
  editor.setScriptInputVariable(node.id, 'count', count.id)
  graph.syncInstances(node.id)
  expect(instance.boundVariables[`${SCRIPT_INPUT_BINDING_PREFIX}count`]).toBeUndefined()
  expect(writePenDocument(graph).children.find((layer) => layer.type === 'ref')?.inputs).toEqual({
    count: 3
  })
  editor.dispose()
})
