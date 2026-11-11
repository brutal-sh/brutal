import { exportFigFile } from '@open-pencil/core/io/formats/fig'

import type { DocumentSourceOptions } from '@/app/document/io/source/types'

export function createSourceBuilders({ io, editor, state, getRenderer }: DocumentSourceOptions) {
  function buildFigFile() {
    const renderer = getRenderer()
    return exportFigFile(editor.graph, {
      ck: renderer?.ck,
      renderer: renderer ?? undefined,
      pageId: state.currentPageId,
      documentName: state.documentName
    })
  }

  async function buildPenFile() {
    const result = await io.writeDocument('pen', editor.graph)
    return typeof result.data === 'string' ? new TextEncoder().encode(result.data) : result.data
  }

  function buildRecoveryFigFile() {
    return exportFigFile(editor.graph, {
      pageId: state.currentPageId,
      documentName: state.documentName
    })
  }

  return { buildFigFile, buildPenFile, buildRecoveryFigFile }
}
