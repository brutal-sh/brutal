import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { SceneGraph } from '@open-pencil/scene-graph'

import type { evaluateCanvasScript } from '@/app/document/scripts/evaluate'
import { createScriptRuntime } from '@/app/document/scripts/runtime'
import { createDeferred } from '@/app/runtime/deferred'

function holdFirstMaterialization(io: IORegistry, name: string) {
  const started = createDeferred<undefined>()
  const gate = createDeferred<undefined>()
  const read = io.readDocument.bind(io)
  const reads: Promise<unknown>[] = []
  let held = false
  io.readDocument = (input) => {
    const pending = read(input).then(async (document) => {
      if (input.name === name && !held) {
        held = true
        started.resolve(undefined)
        await gate.promise
      }
      return document
    })
    void pending.catch(started.reject)
    reads.push(pending)
    return pending
  }
  return { started: started.promise, reads, release: () => gate.resolve(undefined) }
}

const evaluate: typeof evaluateCanvasScript = async (source) => ({
  ok: true,
  definitions: [],
  input: {},
  nodes: [{ type: 'rectangle', id: 'output', name: source, width: 20, height: 30 }]
})

for (const kind of ['normal', 'empty'] as const) {
  test(`${kind} materialization cannot adopt output into a replacement graph with the same Script ID`, async () => {
    const editor = createEditor()
    const id = editor.createScript(0, 0)
    if (kind === 'normal') editor.setScriptDefinition(id, { uri: 'probe.js', inputs: {} })
    const pluginData = structuredClone(editor.graph.getNode(id)?.pluginData)
    const io = new IORegistry(BUILTIN_IO_FORMATS)
    const materialization = holdFirstMaterialization(
      io,
      `script-${kind === 'normal' ? 'output' : 'placeholder'}.pen`
    )
    const options = {
      adoptions: [] as SceneGraph[],
      getDocumentPath: () => null,
      loadSource: async () => ({ source: '/** @schema 2.21 */ return [];', path: null }),
      evaluate,
      adoptChanges<T>(apply: () => T): T {
        this.adoptions.push(editor.graph)
        return apply()
      }
    }
    const runtime = createScriptRuntime(editor, io, options)
    try {
      await materialization.started
      const replacement = new SceneGraph()
      replacement.createNodeWithId(id, 'FRAME', replacement.getPages()[0].id, {
        name: 'Replacement Script',
        width: 320,
        height: 150,
        pluginData
      })
      editor.replaceGraph(replacement)
      materialization.release()
      await Promise.all(materialization.reads)
      const deadline = Date.now() + 1500
      while (options.adoptions.length === 0 && Date.now() < deadline)
        await new Promise((resolve) => {
          setTimeout(resolve, 10)
        })
      expect(options.adoptions).toEqual([replacement])
      expect(editor.graph.getNode(id)).toMatchObject({ width: 320, height: 150 })
      const children = editor.graph.getChildren(id)
      expect(children).toHaveLength(kind === 'normal' ? 1 : 3)
      if (kind === 'empty') expect(children[0]).toMatchObject({ width: 320, height: 150 })
    } finally {
      materialization.release()
      runtime.dispose()
      editor.dispose()
    }
  })
}
