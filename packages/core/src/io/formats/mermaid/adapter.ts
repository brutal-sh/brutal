import { lowerExt } from '#core/io/formats/shared'
import type { IOFormatAdapter } from '#core/io/types'

export const mermaidFormat: IOFormatAdapter<'mermaid'> = {
  id: 'mermaid',
  label: 'Mermaid Diagram',
  role: 'interchange-document',
  category: 'document',
  extensions: ['mmd', 'mermaid'],
  mimeTypes: ['text/vnd.mermaid'],
  support: {
    readDocument: true
  },
  laysOutOnRead: true,
  matchesFile(fileName, mimeType) {
    const ext = lowerExt(fileName)
    return ext === 'mmd' || ext === 'mermaid' || mimeType === 'text/vnd.mermaid'
  },
  async readDocument(input) {
    const { detectMermaidDiagram } = await import('@open-pencil/mermaid')
    const text = new TextDecoder().decode(input.data)
    if (!detectMermaidDiagram(text)) throw new Error('This file holds no Mermaid flowchart')
    // Mermaid stores a diagram's structure, which reading lays out with its text measured.
    const { mermaidToSceneGraph } = await import('./index')
    return { graph: await mermaidToSceneGraph(text), sourceFormat: 'mermaid' }
  }
}
