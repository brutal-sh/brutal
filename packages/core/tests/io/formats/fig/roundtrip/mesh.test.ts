import { beforeAll, expect, test } from 'bun:test'

import { exportFigFile, parseFigFile, populateFigPage } from '@open-pencil/core/io/formats/fig'
import { initCodec } from '@open-pencil/kiwi/fig/codec'
import { parsePenFile, writePenFile } from '@open-pencil/pen'
import { SceneGraph } from '@open-pencil/scene-graph'
import { createMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'
import { recordInstanceOverride } from '@open-pencil/scene-graph/instances'
import { rescaleNodeTree } from '@open-pencil/scene-graph/scaling'
import { resolvedPaintBindings } from '@open-pencil/scene-graph/variables'

beforeAll(async () => {
  await initCodec()
})

test('FIG scaled instance Mesh strokes retain their occurrence geometry', async () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id, { width: 100, height: 100 })
  graph.createNode('RECTANGLE', component.id, {
    name: 'Scaled Mesh stroke',
    width: 100,
    height: 100,
    strokeCap: 'ROUND',
    strokeJoin: 'BEVEL',
    dashPattern: [4, 2],
    strokes: [
      {
        type: 'GRADIENT_MESH',
        color: { r: 0, g: 0, b: 0, a: 0 },
        visible: true,
        opacity: 0.8,
        meshGradient: createMeshGradient(),
        weight: 8,
        align: 'OUTSIDE',
        cap: 'ROUND',
        join: 'BEVEL',
        dashPattern: [4, 2]
      }
    ]
  })
  const instance = graph.createInstance(component.id, page.id)
  if (!instance) throw new Error('Missing instance')
  rescaleNodeTree(graph, instance.id, 2)
  const child = graph.getChildren(instance.id)[0]
  const imported = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
  populateFigPage(imported, imported.getPages()[0].id)
  const restoredInstance = [...imported.getAllNodes()].find((node) => node.type === 'INSTANCE')
  if (!restoredInstance) throw new Error('Missing imported instance')
  const restored = imported.getChildren(restoredInstance.id)[0]
  expect(restored.width).toBe(child.width)
  expect(restored.componentScale).toBe(2)
  expect(restored.strokes[0]).toMatchObject(child.strokes[0])
})

test('FIG mesh previews retain a lossless paint payload for Pen interoperability', async () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const mesh = createMeshGradient(2, 2)
  mesh.points[0].rightHandle = { x: 0.2, y: 0.1 }
  const node = graph.createNode('RECTANGLE', page.id, {
    name: 'Mesh FIG acceptance',
    width: 256,
    height: 256,
    fills: [
      {
        type: 'GRADIENT_MESH',
        color: { r: 0, g: 0, b: 0, a: 0 },
        visible: true,
        opacity: 0.5,
        blendMode: 'LINEAR_DODGE',
        meshGradient: mesh
      }
    ],
    strokes: [
      {
        type: 'GRADIENT_MESH',
        color: { r: 0, g: 0, b: 0, a: 0 },
        visible: true,
        opacity: 1,
        meshGradient: structuredClone(mesh),
        weight: 8,
        align: 'INSIDE'
      }
    ]
  })
  const collection = graph.createCollection('Mesh tokens')
  const ink = graph.createVariable('Ink', 'COLOR', collection.id, {
    r: 0.75,
    g: 0.25,
    b: 0.5,
    a: 0.5
  })
  graph.bindVariable(node.id, 'fills/0/meshGradient/colors/0', ink.id)
  graph.bindVariable(node.id, 'strokes/0/meshGradient/colors/1', ink.id)
  const imported = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
  const importedPage = imported.getPages()[0]
  populateFigPage(imported, importedPage.id)
  const restored = imported.getChildren(importedPage.id)[0]
  expect(restored.fills).toEqual(resolvedPaintBindings(graph, node).fills ?? node.fills)
  expect(restored.boundVariables).toEqual(node.boundVariables)
  expect(restored.strokes).toMatchObject(resolvedPaintBindings(graph, node).strokes ?? node.strokes)
  const pen = parsePenFile(writePenFile(imported))
  const again = [...pen.getAllNodes()].find(
    (candidate) => candidate.type === node.type && candidate.name === node.name
  )
  expect(again?.fills[0].meshGradient?.points).toEqual(mesh.points)
  expect(again?.strokes[0].meshGradient?.points).toEqual(mesh.points)
  expect(Object.keys(again?.boundVariables ?? {}).toSorted()).toEqual(
    Object.keys(node.boundVariables).toSorted()
  )
})

for (const change of ['alias', 'geometry', 'solid'] as const) {
  test(`FIG instance Mesh ${change} override survives reopening and component sync`, async () => {
    const expectedAlias = { alias: 'Blue', geometry: 'Red', solid: undefined }[change]
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const collection = graph.createCollection('Instance colors')
    const red = graph.createVariable('Red', 'COLOR', collection.id, { r: 1, g: 0, b: 0, a: 1 })
    const blue = graph.createVariable('Blue', 'COLOR', collection.id, { r: 0, g: 0, b: 1, a: 1 })
    const component = graph.createNode('COMPONENT', page.id, {
      name: 'Mesh component',
      width: 200,
      height: 200
    })
    const source = graph.createNode('RECTANGLE', component.id, {
      name: 'Mesh child',
      width: 200,
      height: 200,
      fills: [
        {
          type: 'GRADIENT_MESH',
          color: { r: 0, g: 0, b: 0, a: 0 },
          visible: true,
          opacity: 1,
          meshGradient: createMeshGradient()
        }
      ]
    })
    graph.bindVariable(source.id, 'fills/0/meshGradient/colors/0', red.id)
    const instance = graph.createInstance(component.id, page.id, {
      name: `Mesh instance ${change}`,
      x: 300
    })
    if (!instance) throw new Error('Missing instance')
    const child = graph.getChildren(instance.id)[0]
    if (change === 'alias') graph.bindVariable(child.id, 'fills/0/meshGradient/colors/0', blue.id)
    else {
      const paint = structuredClone(child.fills[0])
      if (!paint.meshGradient) throw new Error('Missing mesh')
      paint.meshGradient.points[4].position = { x: 0.7, y: 0.6 }
      paint.meshGradient.points[4].rightHandle = { x: 0.2, y: 0.1 }
      paint.meshGradient.colors[4] = { r: 0.25, g: 0.5, b: 0.75, a: 1 }
      graph.updateNode(child.id, {
        fills:
          change === 'solid'
            ? [
                {
                  type: 'SOLID',
                  color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
                  opacity: 1,
                  visible: true
                }
              ]
            : [paint],
        ...(change === 'solid' && { boundVariables: {} })
      })
      recordInstanceOverride(graph, child.id, [
        'fills',
        ...(change === 'solid' ? ['boundVariables'] : [])
      ])
    }
    const imported = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
    populateFigPage(imported, imported.getPages()[0].id)
    const restoredInstance = [...imported.getAllNodes()].find(
      (candidate) => candidate.name === instance.name
    )
    if (!restoredInstance) throw new Error('Missing imported instance')
    const restored = imported.getChildren(restoredInstance.id)[0]
    expect(restored.fills[0].type).toBe(child.fills[0].type)
    const bound = restored.boundVariables['fills/0/meshGradient/colors/0']
    expect(bound ? imported.variables.get(bound)?.name : undefined).toBe(expectedAlias)
    if (change === 'geometry')
      expect(restored.fills[0].meshGradient?.points[4]).toEqual(
        child.fills[0].meshGradient?.points[4]
      )
    const restoredComponent =
      restoredInstance.componentId && imported.getNode(restoredInstance.componentId)
    if (!restoredComponent) throw new Error('Missing imported component')
    const settings = imported.createCollection('Inherited settings')
    const opacity = imported.createVariable('Opacity', 'FLOAT', settings.id, 0.5)
    imported.bindVariable(imported.getChildren(restoredComponent.id)[0].id, 'opacity', opacity.id)
    imported.updateNode(restoredComponent.id, { name: 'Renamed mesh component' })
    imported.syncInstances(restoredComponent.id)
    const after = imported.getNode(restored.id)
    expect(after?.boundVariables.opacity).toBe(opacity.id)
    expect(after?.fills[0].type).toBe(child.fills[0].type)
    const afterBound = after?.boundVariables['fills/0/meshGradient/colors/0']
    expect(afterBound ? imported.variables.get(afterBound)?.name : undefined).toBe(expectedAlias)
  })
}

test('ordinary paint overrides continue inheriting unrelated component bindings', async () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id, {
    name: 'Ordinary component',
    width: 100,
    height: 100
  })
  graph.createNode('RECTANGLE', component.id, { name: 'Ordinary child', width: 100, height: 100 })
  const instance = graph.createInstance(component.id, page.id, { name: 'Ordinary instance' })
  if (!instance) throw new Error('Missing instance')
  const child = graph.getChildren(instance.id)[0]
  graph.updateNode(child.id, {
    fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 1, a: 1 } }]
  })
  recordInstanceOverride(graph, child.id, ['fills'])
  const imported = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
  populateFigPage(imported, imported.getPages()[0].id)
  const restoredComponent = [...imported.getAllNodes()].find((node) => node.type === 'COMPONENT')
  const restoredInstance = [...imported.getAllNodes()].find((node) => node.type === 'INSTANCE')
  if (!restoredComponent || !restoredInstance)
    throw new Error('Missing imported component or instance')
  const collection = imported.createCollection('Opacity tokens')
  const opacity = imported.createVariable('Opacity', 'FLOAT', collection.id, 0.5)
  imported.bindVariable(imported.getChildren(restoredComponent.id)[0].id, 'opacity', opacity.id)
  imported.syncInstances(restoredComponent.id)
  expect(imported.getChildren(restoredInstance.id)[0].boundVariables.opacity).toBe(opacity.id)
  expect(imported.getChildren(restoredInstance.id)[0].fills[0].color).toEqual({
    r: 0,
    g: 0,
    b: 1,
    a: 1
  })
})
