import { expect, test } from 'bun:test'

import { expectDefined } from '../helpers/assert'

import { SceneGraph } from '@open-pencil/scene-graph'
import { recordInstanceOverride } from '@open-pencil/scene-graph/instances'
import {
  createShaderPaint,
  fragmentShaderPreset,
  shaderOfPaint,
  withShaderPaints
} from '@open-pencil/scene-graph/shaders'

const preset = (speed: number) =>
  fragmentShaderPreset({
    url: 'time.glsl',
    source: 'void main(){gl_FragColor=vec4(1.);}',
    uniforms: { speed }
  })

for (const location of ['root', 'child'] as const)
  test(`component ${location} shader metadata follows preset edits and preserves an override`, () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const component = graph.createNode('COMPONENT', page, { width: 40, height: 20 })
    const source =
      location === 'root'
        ? component
        : graph.createNode('RECTANGLE', component.id, { width: 40, height: 20 })
    const entry = createShaderPaint(preset(1))
    graph.updateNode(source.id, {
      fills: [entry.paint],
      pluginData: withShaderPaints(source, [entry.paint], [entry.shader])
    })
    const instance = expectDefined(graph.createInstance(component.id, page))
    const target = location === 'root' ? instance : expectDefined(graph.getChildren(instance.id)[0])
    expect(shaderOfPaint(target, target.fills[0])?.preset).toEqual(preset(1))
    graph.updateNode(source.id, {
      pluginData: withShaderPaints(source, source.fills, [{ ...entry.shader, preset: preset(2) }])
    })
    graph.syncInstances(component.id)
    expect(shaderOfPaint(target, target.fills[0])?.preset).toEqual(preset(2))

    const own = createShaderPaint(preset(9))
    graph.updateNode(target.id, {
      fills: [own.paint],
      pluginData: withShaderPaints(target, [own.paint], [own.shader])
    })
    recordInstanceOverride(graph, target.id, ['fills'])
    graph.updateNode(source.id, {
      pluginData: withShaderPaints(source, source.fills, [{ ...entry.shader, preset: preset(3) }])
    })
    graph.syncInstances(component.id)
    expect(shaderOfPaint(target, target.fills[0])?.preset).toEqual(preset(9))
  })
