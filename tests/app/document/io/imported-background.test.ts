import { expect, test } from 'bun:test'

import { createDefaultEditorState, createEditor } from '@open-pencil/core'
import { setPageBackgrounds } from '@open-pencil/core/figma-api'
import { SceneGraph } from '@open-pencil/scene-graph'

import { applyImportedDocument } from '@/app/document/io/imported-document'

test('uncolored imported pages use the current interface theme and retain explicit backgrounds', async () => {
  const graph = new SceneGraph()
  const editor = createEditor({
    graph,
    state: { ...createDefaultEditorState(graph.getPages()[0].id), theme: 'dark' }
  })
  const imported = new SceneGraph()
  const custom = imported.addPage('Custom')
  const navy = { r: 0.02, g: 0.1, b: 0.3, a: 1 }
  setPageBackgrounds(imported, custom, [{ type: 'SOLID', color: navy, opacity: 1, visible: true }])
  try {
    await applyImportedDocument(editor, imported)
    expect(editor.state.pageColor).toEqual({ r: 24 / 255, g: 24 / 255, b: 27 / 255, a: 1 })
    await editor.switchPage(custom.id)
    expect(editor.state.pageColor).toEqual(navy)
  } finally {
    editor.dispose()
  }
})
