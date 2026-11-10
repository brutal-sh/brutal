import type { Editor } from '@open-pencil/core'
import { scriptOfNode } from '@open-pencil/scene-graph/scripts'

export function sharedScriptUpload(
  editor: Editor,
  uploads: Map<string, Map<string, string>>,
  uri: string
) {
  const candidates = new Set(
    [...uploads.entries()].flatMap(([owner, files]) => {
      const source = files.get(uri)
      const node = editor.graph.getNode(owner)
      return source !== undefined && node && scriptOfNode(node)?.uri === uri ? [source] : []
    })
  )
  if (candidates.size === 1) return [...candidates][0]
  if (candidates.size > 1)
    throw new Error(
      'Choose the source for this Script; its filename matches different uploaded files.'
    )
}
